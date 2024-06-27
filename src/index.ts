import { ActionRowBuilder, ActivityType, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, GatewayIntentBits, GuildMember, GuildTextBasedChannel, Message, MessageManager, PartialMessage, PermissionFlagsBits, REST, Routes, StageChannel, TextBasedChannel, UserSelectMenuBuilder, VoiceChannel } from 'discord.js';
import BotClient from './BotClient';
import config from '../data/config.json';
import { clearChannelCmd, kickCmd, kickGuiCmd, testCmd } from './Commands';
import CustomSerializer from './Serialization';
import fs from 'node:fs';

const TOKEN: string = config.token;
const CLIENT_ID: string = config.client_id;
const MOD_ROLE_ID: string = config.mod_role_id;
const GUILD_ID: string = config.guild_id;
const ERR_CHANNEL_ID: string = config.error_channel_id;

const CLIENT: BotClient = new BotClient([
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
], TOKEN);

const rest: REST = new REST({ version: '10' }).setToken(TOKEN);

var TICKETS: {
    channel_id?: string,
    embed_message_id?: string,
    user_id?: string,
    reason?: string,
}[] = [];

process.on('SIGINT', async () => {
    await CLIENT.destroy();

    console.log('Bot logged off.');

    process.exit(0);
});

process.on('uncaughtException', async (err, origin) => {
    const errChannel = await (await CLIENT.guilds.fetch(GUILD_ID)).channels.fetch(ERR_CHANNEL_ID);

    await (errChannel as GuildTextBasedChannel).send({
        content: `<@&${MOD_ROLE_ID}> I'm hurt!!!\n\nMessage:\n\`\`\`\nUNCAUGHT EXCEPTION: please check log on hosting provider.\n\`\`\``
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
    const errChannel = await (await CLIENT.guilds.fetch(GUILD_ID)).channels.fetch(ERR_CHANNEL_ID);

    await (errChannel as GuildTextBasedChannel).send({
        content: `<@&${MOD_ROLE_ID}> I'm hurt!!!\n\nMessage:\n\`\`\`\n${err.message}\n\`\`\`\nStack:\`\`\`\n${err.stack}\n\`\`\``
    });

    await CLIENT.destroy();
    
    console.error(`Bot errored! ${err.name}\n${err.message}\n${err.stack}`);
});

CLIENT.on('messageCreate', async (msg) => await tryExecCmd(msg));
CLIENT.on('messageUpdate', async (_, msg) => await tryExecCmd(msg));

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
                    .setDescription(`Please confirm kicking <@${(user as GuildMember).id}>\n for reason '${reason}', maybe they're innocent?\nYour call boss...`)
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
            await inter.deferReply({ ephemeral: true });

            const ticketChannel = await inter.guild?.channels.create({
                type: ChannelType.GuildText,
                name: `TICKET-kick-${Math.floor(Math.random() * 9999) + 1}`,
                topic: 'Kick GUI by LewdFerret Mod Tools',
                permissionOverwrites: [
                    {
                        id: inter.user.id,
                        allow: PermissionFlagsBits.Administrator
                    },
                    {
                        id: MOD_ROLE_ID,
                        allow: PermissionFlagsBits.Administrator
                    },
                    {
                        id: inter.guild.roles.everyone.id,
                        deny: PermissionFlagsBits.ViewChannel
                    }
                ]
            });

            if(!ticketChannel) {
                await inter.editReply(
                    'Couldn\'t create a new channel...'
                );
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('KICK GUI')
                .setColor('#77ee77')
                .setDescription('Let\'s discuss whom you want to kick and for what...')
                .setFooter({ text: 'Action performed by LewdFerret Mod Tools' })
                .setTimestamp(Date.now())
                .setAuthor({
                    name: 'LewdFerret Mod Tools',
                    url: 'https://www.github.com/LewdFerret/LewdFerret-ModTools'
                });
            
            const readyButton = new ButtonBuilder()
                .setCustomId('readyKickGui')
                .setStyle(ButtonStyle.Success)
                .setLabel('I\'m ready!');

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancelKickGui')
                .setStyle(ButtonStyle.Primary)
                .setLabel('Cancel');

            const row1 = new ActionRowBuilder<ButtonBuilder>()
                .setComponents(
                    readyButton,
                    cancelButton
                );

            const embedMessage = await ticketChannel.send({
                content: `<@${inter.user.id}> <@&${MOD_ROLE_ID}> Welcome...`,
                embeds: [ embed ],
                components: [ row1 ]
            });

            if(!embedMessage) {
                await inter.editReply(`Couldn't create embed in <#${ticketChannel.id}> !\nDeleting <#${ticketChannel.id}> in 3 seconds...`);

                setTimeout(async () => await ticketChannel.delete(), 3_000); // 3 seconds

                return;
            }

            TICKETS.push({
                channel_id: ticketChannel.id,
                embed_message_id: embedMessage.id
            });

            saveTicketData();

            await inter.editReply('You\'re all set!');

            console.log(TICKETS);
        } else {
            await inter.reply({
                content: `Unknown command "${inter.commandName}"!`,
                ephemeral: true
            });
        }
    } else if(interaction.isButton()) {
        const inter = (interaction as ButtonInteraction);

        await inter.deferReply();

        loadTicketData();

        const thisTicket = getTicketByChannelId(inter.channelId);

        if(!thisTicket) {
            await inter.editReply('Sorry, something went wrong.');
            return;
        };


        if(inter.customId === 'cancelKickGui') {
            await inter.editReply({
                content: 'Alrighty, cancelling...'
            });

            setTimeout(async () => {
                await inter.channel?.delete();
            }, 3_000); // 3 seconds

            const index = TICKETS.indexOf(thisTicket);

            if(index !== -1) {
                TICKETS.splice(index, 1);
            }

            saveTicketData();
        } else if(inter.customId === 'readyKickGui') {
            if(!thisTicket.embed_message_id) {
                await inter.message.channel.send('Couldn\'t find embed message!');
                return;
            }

            if(!thisTicket.channel_id) {
                await inter.message.channel.send('Seems like the channel id was saved wrong, sorry...');
                return;
            }

            const ticketChannel = await inter.guild?.channels.fetch(thisTicket.channel_id);

            if(!ticketChannel) {
                await inter.message.channel.send('Sorry, but I couldn\'t find the channel...');
                return;
            }

            const embed_message = await (ticketChannel as TextBasedChannel).messages.fetch(thisTicket.embed_message_id);

            if(!embed_message) {
                await inter.message.channel.send('Couldn\'t fetch the embed message!');
                return;
            }

            const newEmbed = new EmbedBuilder()
                .setTitle('KICK GUI')
                .setColor('#77ee77')
                .setDescription('So... Which user should it be?')
                .setFooter({ text: 'Action performed by LewdFerret Mod Tools' })
                .setTimestamp(Date.now())
                .setAuthor({
                    name: 'LewdFerret Mod Tools',
                    url: 'https://www.github.com/LewdFerret/LewdFerret-ModTools'
                });
            
            const userSelect = new UserSelectMenuBuilder()
                .setCustomId('kickGuiUserSelect')
                .setMinValues(1)
                .setMaxValues(1)
                .setPlaceholder('Which user to kick...');
            
            const confirmButton = new ButtonBuilder()
                .setCustomId('confirmSelectUserKickGui')
                .setStyle(ButtonStyle.Success)
                .setLabel('Confirm Choice');
            
            const cancelButton = new ButtonBuilder()
                .setCustomId('cancelKickGui')
                .setStyle(ButtonStyle.Primary)
                .setLabel('Cancel');
            
            const row1 = new ActionRowBuilder<UserSelectMenuBuilder>()
                .setComponents(userSelect);
            const row2 = new ActionRowBuilder<ButtonBuilder>()
                .setComponents(confirmButton, cancelButton);

            await embed_message.edit({
                content: `Next step guys <@${inter.user.id}> <@&${MOD_ROLE_ID}> ...`,
                embeds: [ newEmbed ],
                components: [ row1, row2 ]
            });

            await inter.editReply('I\'m ready...');
        }
    }
});

async function main() {
    if(!checkConfigValid()) {
        console.error('Your config is invalid, refer to the README.md for further information...');
        process.exit(1);
    }

    fs.stat(`${process.cwd()}/data`, (err, stats) => {
        if(err) throw err;

        if(!stats.isDirectory()) {
            console.error('You NEED to have a \'data\' directory in your working directory!');
            process.exit(1);
        }
    });

    CLIENT.commands = [
        clearChannelCmd.toJSON(),
        kickCmd.toJSON(),
        kickGuiCmd.toJSON(),
        testCmd.toJSON(),
    ];

    console.log(`Started refreshing ${CLIENT.commands.length} application (/) commands.`);

	// The put method is used to fully refresh all commands in the guild with the current set
	const data: any = await rest.put(
		Routes.applicationCommands(CLIENT_ID),
		{ body: CLIENT.commands },
	);

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);

    loadTicketData();

    CLIENT.login();
}

main();

// TODO: implement other commands (see Commands.ts)
async function tryExecCmd(msg: Message<boolean> | PartialMessage): Promise<void> {
    if(msg.author?.bot)
        return;

    // Yaay it works
    if(msg.content === 'mt!clear-channel') {
        if(msg.member?.permissions.has('ManageMessages')) {
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
        } else {
            await msg.reply('Sorry but you don\'t have the needed permission(s):\n- Manage Messages');
        }
    } else if(msg.content?.includes('mt!kick')) {
        if(msg.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
            const params = msg.content.split(' ');
            params.splice(0, 1);

            let user: string = '0';
            let reason: string | undefined;

            for(const p of params) {
                if(p && p.includes('<@')) {
                    user = p.replace(/[^0-9]/g, '');
                } else {
                    reason += p;
                }
            }

            const toKick = await msg.guild?.members.fetch(user);
            if(toKick) {
                await toKick.kick(reason);
                if(reason && reason.length > 0) {
                    await msg.reply(`Alrighty! Kicked <@${toKick.id}> with reason '${reason}'!`);
                } else {
                    await msg.reply(`Alrighty! Kicked <@${toKick.id}> !`);
                }
            } else {
                msg.reply(`Couldn't find user '${user}'.`);
            }
        }
    } else if(msg.content === 'mt!test') {
        await msg.reply('I don\'t like tests 3:');
    }
}

function checkConfigValid(): boolean {
    const tk_valid  = (TOKEN && TOKEN.length !== 0) as boolean;
    const ci_valid  = (CLIENT_ID && CLIENT_ID.length !== 0) as boolean;
    const mri_valid = (MOD_ROLE_ID && MOD_ROLE_ID.length !== 0) as boolean;
    const gi_valid  = (GUILD_ID && GUILD_ID.length !== 0) as boolean;
    const eci_valid = (ERR_CHANNEL_ID && ERR_CHANNEL_ID.length !== 0) as boolean;

    return (tk_valid && ci_valid && mri_valid && gi_valid && eci_valid);
}

function saveTicketData(): void {
    let fileContent = CustomSerializer.ticketsToCustom(TICKETS);

    if(!fileContent) throw Error('Unhandled exception while parsing tickets.');

    fs.writeFileSync(`${process.cwd()}/data/tickets`, fileContent, {
        encoding: 'utf-8',
        flag: 'w'
    });
}

function loadTicketData(): void {
    fs.readFile(`${process.cwd()}/data/tickets`, 'utf-8', (err, data) => {
        if(err) throw err;

        const tickets = CustomSerializer.ticketsFromCustom(data);

        if(!tickets) throw Error('Error while parsing tickets.');

        TICKETS = tickets;
    });
}

function getTicketByChannelId(channel_id: string): {
    channel_id?: string,
    embed_message_id?: string,
    user_id?: string,
    reason?: string
} | undefined {
    return TICKETS.find(v => v.channel_id === channel_id);
}
