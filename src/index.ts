import { ActionRowBuilder, ActivityType, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, ChatInputCommandInteraction, Client, Colors, EmbedBuilder, GatewayIntentBits, Guild, GuildMember, GuildTextBasedChannel, GuildTextChannelResolvable, Message, MessageManager, PartialMessage, REST, Routes, StageChannel, TextBasedChannel, TextChannel, VoiceChannel } from 'discord.js';
import BotClient from "./BotClient";
import config from '../data/config.json';
import { clearChannelCmd, kickGuiCmd, kickCmd, testCmd } from './Commands';

const TOKEN: string = config.token;
const CLIENT_ID: string = config.client_id;
const TEST_GUILD_ID: string = '1250191083313299487';
const ERR_CHANNEL_ID: string = '1254949497721720862';
const MOD_ROLE_ID: string = '1254949619851595816';

const CLIENT: BotClient = new BotClient([
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
], TOKEN);

const rest: REST = new REST({ version: '10' }).setToken(TOKEN);

process.on('SIGINT', async () => {
    await CLIENT.destroy();

    console.log("Bot logged off.");

    process.exit(0);
});

process.on('uncaughtException', async (err, origin) => {
    const errChannel = await (await CLIENT.guilds.fetch(TEST_GUILD_ID)).channels.fetch(ERR_CHANNEL_ID);

    await (errChannel as GuildTextBasedChannel).send({
        content: `<@&${MOD_ROLE_ID}> I'm hurt!!! Error log:\n\`\`\`\nUNCAUGHT EXCEPTION: please check log on hosting provider.\n\`\`\``
    });

    await CLIENT.destroy();

    console.error(`UNCAUGHT EXCEPTION\n\n${err.message}\nSTACK: ${err.stack}\n\nOrigin: ${origin}`);
});

CLIENT.once('ready', () => {
    CLIENT.user?.setStatus('online');

    CLIENT.user?.setActivity({
        name: 'mt!',
        type: ActivityType.Listening,
    });

    console.log(`'${CLIENT.user?.displayName}#${CLIENT.user?.discriminator}' is ready.`);
});

CLIENT.on('error', async (err) => {
    const errChannel = await (await CLIENT.guilds.fetch(TEST_GUILD_ID)).channels.fetch(ERR_CHANNEL_ID);

    await (errChannel as GuildTextBasedChannel).send({
        content: `<@&${MOD_ROLE_ID}> I'm hurt!!! Error log:\n\`\`\`\n${err.message}\n\`\`\`\nStack:\`\`\`\n${err.stack}\n\`\`\``
    });

    await CLIENT.destroy();
    
    console.error(`Bot errored! ${err.name}\n${err.message}\n${err.stack}`);
});

CLIENT.on('messageCreate', async (msg) => tryExecCmd(msg));
CLIENT.on('messageUpdate', async (_, msg) => tryExecCmd(msg));

CLIENT.on('interactionCreate', async (interaction) => {
    if(interaction.isChatInputCommand()) {
        const inter = interaction as ChatInputCommandInteraction;

        if(inter.commandName === 'test') {
            inter.reply({ content: 'I hate tests 3:', ephemeral: true });
        } else if(inter.commandName === 'clear-channel') {
            const targetChannel = inter.options.getChannel('target', false);
            const amount: number | null = inter.options.getInteger('amount', false);

            if(targetChannel instanceof VoiceChannel || targetChannel instanceof StageChannel) {
                await inter.reply({
                    content: 'Voice or stage channels aren\'t supported',
                    ephemeral: true
                });
                return;
            }

            if(!targetChannel) {
                if(!amount) {
                    await inter.deferReply({
                        ephemeral: true
                    });

                    const messages = await inter.channel?.messages.fetch()!;
                    messages.forEach(async (msg) => {
                        await msg.delete();
                    });

                    await inter.editReply({
                        content: 'Successfully cleared channel!'
                    });
                } else {
                    await inter.deferReply({
                        ephemeral: true
                    });

                    const messages = await inter.channel?.messages.fetch({
                        limit: amount
                    })!;

                    messages.forEach(async (msg) => {
                        await msg.delete();
                    });

                    await inter.editReply({
                        content: `Successfully cleared ${amount} messages!`
                    });
                }
            } else {
                if(!amount) {
                    inter.deferReply({ephemeral: true});

                    const okMsg = await (targetChannel as TextBasedChannel).send({
                        content: `Hang on <@${inter.user.id}>!\nClearing channel...`
                    });
                    const messages = (await (targetChannel as TextBasedChannel).messages.fetch()).values();
                    for(const msg of messages) {
                        if(!msg || !(msg instanceof Message)) {
                            await (targetChannel as TextBasedChannel).send({
                                content: `Sorry <@${inter.user.id}>,\nbut there has been an error while clearing the channel.`
                            });
                            await okMsg.delete();
                            return;
                        }
    
                        if(msg.id !== okMsg.id)
                            await msg.delete();
                    }

                    await okMsg.edit({
                        content: `<@${inter.user.id}>\nCleared Channel!\n**This message deletes itself after 3 seconds**`
                    });
    
                    setTimeout(async () => {
                        await okMsg.delete();
                        await inter.editReply({
                            content: `Successfully cleared <#${targetChannel.id}> !`
                        })
                    }, 3000); // 3 seconds
                } else {
                    inter.deferReply({ephemeral: true});
                    const okMsg = await (targetChannel as TextBasedChannel).send({
                        content: `Hang on <@${inter.user.id}>!\nClearing ${amount} messages...`
                    });
                    const messages = (await (targetChannel as TextBasedChannel).messages.fetch({
                        limit: amount
                    })).values();
                    for(const msg of messages) {
                        if(!msg || !(msg instanceof Message)) {
                            await (targetChannel as TextBasedChannel).send({
                                content: `Sorry <@${inter.user.id}>,\nbut there has been an error while clearing ${amount} messages.`
                            });
                            await okMsg.delete();
                            return;
                        }
    
                        if(msg.id !== okMsg.id)
                            await msg.delete();
                    }

                    await okMsg.edit({
                        content: `<@${inter.user.id}>\nCleared ${amount} messages!\n**This message deletes itself after 3 seconds**`
                    });
    
                    setTimeout(async () => {
                        await okMsg.delete();
                        await inter.editReply({
                            content: `Successfully cleared ${amount} messages from <#${targetChannel.id}> !`
                        });
                    }, 3000); // 3 seconds
                }
            }
        } else if(inter.commandName === 'kick') {
            const user = inter.options.getMentionable('user', true);
            const reason = inter.options.getString('reason', false);

            if(!reason) {
                const confirmButton = new ButtonBuilder()
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId('ckung'); // (c)onfirm (k)ick (u)ser (n)o (g)ui
                const cancelButton = new ButtonBuilder()
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('cakung'); // (ca)ncel (k)ick (u)ser (n)o (g)ui
                const actionRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
                    .setComponents(
                        confirmButton,
                        cancelButton
                    );

                const embed = new EmbedBuilder()
                    /*.setAuthor({
                        name: `${CLIENT.user?.displayName}`,
                        url: 'https://www.github.com/LewdFerret/LewdFerret-ModTools/',
                        //iconURL: `${CLIENT.user?.avatarURL()}`,
                    })*/
                    .setColor(Colors.DarkGold)
                    .setTitle('Confirm kicking user.')
                    .setDescription(`Please confirm kicking <@${(user as GuildMember).id}> with no reason provided, maybe they're innocent?\nYour call boss...`)
                    .setFooter({
                        text: 'Action performed by LewdFerret Mod Tools'
                    });

                const response = await inter.reply({
                    embeds: [
                        embed
                    ],
                    components: [actionRow]
                });

                const collectorFilter = (i: any) => i.user.id === interaction.user.id;

                try {
                    const confirmation = await response.awaitMessageComponent({
                        filter: collectorFilter,
                        time: 60_000
                    });

                    if(confirmation.customId === 'ckung') { // (c)onfirm (k)ick (u)ser (n)o (g)ui
                        inter.editReply({ content: 'pls wait...', embeds: [], components: [] });

                        await (user as GuildMember).kick();

                        await inter.editReply({
                            content: `Kicked <@${(user as GuildMember).id}> !`
                        });
                    } else if(confirmation.customId == 'cakung') { // (ca)ncel (k)ick (u)ser (n)o (g)ui
                        inter.editReply({ embeds: [], components: [],
                            content: `Ok, <@${(user as GuildMember).id}> wasn\'t kicked. Lucky for them!`,
                        })
                    }
                } catch(_) {
                    await inter.editReply({
                        content: 'Confirmation not received within 1 minute, cancelling...',
                        components: [],
                        embeds: [],
                    });
                }
            } else {
                const confirmButton = new ButtonBuilder()
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Danger)
                    .setCustomId('ckung'); // (c)onfirm (k)ick (u)ser (n)o (g)ui
                const cancelButton = new ButtonBuilder()
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('cakung'); // (ca)ncel (k)ick (u)ser (n)o (g)ui
                const actionRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>()
                    .setComponents(
                        confirmButton,
                        cancelButton
                    );

                const embed = new EmbedBuilder()
                    /*.setAuthor({
                        name: `${CLIENT.user?.displayName}`,
                        url: 'https://www.github.com/LewdFerret/LewdFerret-ModTools/',
                        //iconURL: `${CLIENT.user?.avatarURL()}`,
                    })*/
                    .setColor(Colors.DarkGold)
                    .setTitle('Confirm kicking user.')
                    .setDescription(`Please confirm kicking <@${(user as GuildMember).id}>\n for reason "${reason}", maybe they're innocent?\nYour call boss...`)
                    .setFooter({
                        text: 'Action performed by LewdFerret Mod Tools'
                    });

                const response = await inter.reply({
                    embeds: [
                        embed
                    ],
                    components: [actionRow]
                })

                const collectorFilter = (i: any) => i.user.id === interaction.user.id;

                try {
                    const confirmation = await response.awaitMessageComponent({
                        filter: collectorFilter,
                        time: 60_000
                    });

                    if(confirmation.customId === 'ckung') { // (c)onfirm (k)ick (u)ser (n)o (g)ui
                        inter.editReply({ content: 'pls wait...', embeds: [], components: [] });

                        await (user as GuildMember).kick(reason);

                        await inter.editReply({
                            content: `Kicked <@${(user as GuildMember).id}> for "${reason}"!`
                        });
                    } else if(confirmation.customId == 'cakung') { // (ca)ncel (k)ick (u)ser (n)o (g)ui
                        inter.editReply({ embeds: [], components: [],
                            content: `Ok, <@${(user as GuildMember).id}> wasn\'t kicked. Lucky for them!`,
                        })
                    }
                } catch(_) {
                    await inter.editReply({
                        content: 'Confirmation not received within 1 minute, cancelling...',
                        components: [],
                        embeds: [],
                    });
                }
            }
        } else if(inter.commandName === 'kick-gui') {
            const sendToChannel = inter.options.getChannel('send-to-channel', false);

            if(
                sendToChannel?.type === ChannelType.GuildVoice ||
                sendToChannel?.type === ChannelType.GuildStageVoice ||
                sendToChannel?.type === ChannelType.GuildDirectory
            ) {
                await inter.reply({
                    content: `Unsupported channel type: "${sendToChannel.type.toString()}".`,
                    ephemeral: true,
                });
                return;
            }

            if(!sendToChannel) {
                //build gui
                inter.reply('TODO');
            } else {
                //build gui
                await inter.deferReply({ephemeral: true});

                await (sendToChannel as TextBasedChannel).send({
                    content: 'TODO'
                });
            }
        }
    }
});

async function main() {
    if(!TOKEN || TOKEN.length == 0) {
        console.error('No token in data/config.json found.');
        process.exit(1);
    }

    if(!CLIENT_ID || CLIENT_ID.length == 0) {
        console.error('No client id in data/config.json found.');
        process.exit(1);
    }

    CLIENT.commands = [
        clearChannelCmd.toJSON(),
        kickGuiCmd.toJSON(),
        kickCmd.toJSON(),
        testCmd.toJSON(),
    ];

    console.log(`Started refreshing ${CLIENT.commands.length} application (/) commands.`);

	// The put method is used to fully refresh all commands in the guild with the current set
	const data: any = await rest.put(
		Routes.applicationCommands(CLIENT_ID),
		{ body: CLIENT.commands },
	);

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);

    CLIENT.login();
}

main();

async function tryExecCmd(msg: Message<boolean> | PartialMessage): Promise<void> {
    if(msg.author?.bot)
        return;

    // Yaay it works
    if(msg.content === 'mt!clear-channel') {
        const okMsg = await msg.reply('Ok, hold on. Clearing channel...');
        const msgManager: MessageManager = msg.channel.messages;
        const messages = await msgManager.fetch();
        messages.forEach(async (message) => {
            if (message.id !== okMsg.id && message.id !== msg.id)
                await message.delete();
        });
        await okMsg.delete();
        const doneMsg = await msg.reply('Cleared Channel!\n**This message deletes itself after 3 seconds**');
        setTimeout(async () => {
            await doneMsg.delete();
            await msg.delete();
        }, 3000); // 3 seconds
    }
}
