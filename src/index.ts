import { ActionRowBuilder, ActivityType, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, GatewayIntentBits, GuildMember, GuildTextBasedChannel, Message, MessageManager, PartialMessage, REST, Routes, StageChannel, TextBasedChannel, VoiceChannel } from 'discord.js';
import BotClient from './BotClient';
import config from '../data/config.json';
import { clearChannelCmd, kickGuiCmd, kickCmd, testCmd } from './Commands';
import { KickTicket } from './KickTicket';
import { KickTicketManager } from './KickTicketManager';
import { JsonSerializer } from 'typescript-json-serializer';
import fs from 'node:fs';

const TOKEN: string = config.token;
const CLIENT_ID: string = config.client_id;
const MOD_ROLE_ID: string = config.mod_role_id;
const TEST_GUILD_ID: string = '1250191083313299487';
const ERR_CHANNEL_ID: string = '1254949497721720862';

const CLIENT: BotClient = new BotClient([
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
], TOKEN);

const KICK_TICKET_MANAGER = new KickTicketManager();

const jsonSerializer = new JsonSerializer({
    // Throw errors instead of logging
    errorCallback: (msg) => { console.log(`JSON ERR: '${msg}'!`)},

    // Allow all nullish values
    nullishPolicy: {
        undefined: 'allow',
        null: 'disallow'
    },

    // Disallow additional properties (non JsonProperty)
    additionalPropertiesPolicy: 'remove'
});

const rest: REST = new REST({ version: '10' }).setToken(TOKEN);

process.on('SIGINT', async () => {
    await CLIENT.destroy();

    console.log('Bot logged off.');

    process.exit(0);
});

process.on('uncaughtException', async (err, origin) => {
    const errChannel = await (await CLIENT.guilds.fetch(TEST_GUILD_ID)).channels.fetch(ERR_CHANNEL_ID);

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
    const errChannel = await (await CLIENT.guilds.fetch(TEST_GUILD_ID)).channels.fetch(ERR_CHANNEL_ID);

    await (errChannel as GuildTextBasedChannel).send({
        content: `<@&${MOD_ROLE_ID}> I'm hurt!!!\n\nMessage:\n\`\`\`\n${err.message}\n\`\`\`\nStack:\`\`\`\n${err.stack}\n\`\`\``
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
                name: `kick-ticket-${Math.floor(Math.random() * 9999) + 1}`,
                type: ChannelType.GuildText,
                topic: 'Kicking user',
                permissionOverwrites: [
                    {
                        id: inter.user.id,
                        allow: 'Administrator'
                    },
                    {
                        id: (CLIENT.user ? CLIENT.user.id : inter.user.id),
                        allow: 'Administrator'
                    },
                    {
                        id: MOD_ROLE_ID,
                        allow: 'Administrator'
                    },
                    {
                        id: inter.guild.roles.everyone.id,
                        deny: 'ViewChannel'
                    }
                ]
            });

            if(!ticketChannel)  {
                await inter.editReply({
                    content: 'Creating a channel failed...'
                });

                return;
            }

            KICK_TICKET_MANAGER.add_ticket(
                new KickTicket()
                    .set_channel_id(ticketChannel.id)
                    .set_command_user_id(inter.user.id)
                    .set_ticket_step(-1)
            );
            
            const data = jsonSerializer.serialize(KICK_TICKET_MANAGER);

            if(!data) return; // FIXME: display error

            fs.writeFileSync(`${process.cwd()}/KICK-TICKETS.json`, JSON.stringify(data), {
                flag: 'w'
            });

            await inter.editReply({
                content: `Opened ticket! Look in <#${ticketChannel.id}>`
            });

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: 'LewdFerret Mod Tools',
                    url: 'https://www.github.com/LewdFerret/LewdFerret-ModTools',
                    iconURL: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fstatic.vecteezy.com%2Fsystem%2Fresources%2Fpreviews%2F006%2F892%2F625%2Foriginal%2Fdiscord-logo-icon-editorial-free-vector.jpg&f=1&nofb=1&ipt=127a34ff598d42653c31e117702ee594dc85bb3bc43c3bf682f5be3acf06cda3&ipo=images',
                })
                .setTitle('Kick GUI')
                .setDescription('Hi, let\'s discuss if you really:\n- want to kick,\n- which user?\n- For what reason.\nAnyways, have fun <a:boba_woof:1248514246107729941>')
                .setColor('#44ee44')
                .setFooter({
                    text: 'Action performed by LewdFerret Mod Tools',
                    iconURL: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fstatic.vecteezy.com%2Fsystem%2Fresources%2Fpreviews%2F006%2F892%2F625%2Foriginal%2Fdiscord-logo-icon-editorial-free-vector.jpg&f=1&nofb=1&ipt=127a34ff598d42653c31e117702ee594dc85bb3bc43c3bf682f5be3acf06cda3&ipo=images',
                })
                .setTimestamp();

            const startEmbedMsg = await ticketChannel.send({
                content: `<@${inter.user.id}> <@&${MOD_ROLE_ID}>`,
                embeds: [embed]
            });

            setTimeout(async () => {
                await ticketChannel.send({
                    content: 'To start type \'READY\'',
                    //target: startEmbedMsg
                });
            }, 5_000); // 5 seconds

            KICK_TICKET_MANAGER.tickets.find(v => v.channel_id == ticketChannel.id)
                ?.advance_ticket_step();

            const newData = jsonSerializer.serialize(KICK_TICKET_MANAGER);

            if(!newData) return; // FIXME: display error

            fs.writeFileSync(`${process.cwd()}/KICK-TICKETS.json`, JSON.stringify(newData), {
                flag: 'w'
            });
        }
    }
});

async function main() {
    if(!TOKEN || TOKEN.length == 0) {
        console.error('No (valid) token in data/config.json found.');
    }

    if(!CLIENT_ID || CLIENT_ID.length == 0) {
        console.error('No (valid) client id in data/config.json found.');
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

    let tickets;

    const data = fs.readFileSync(`${process.cwd()}/KICK-TICKETS.json`, {
        encoding: 'utf-8',
        flag: 'r'
    });

    tickets = jsonSerializer.deserialize(JSON.parse(data), KickTicketManager);

    if(!tickets) throw Error('Couldn\'t read property `tickets` from `KICK-TICKETS.json`!');

    tickets = (tickets as KickTicketManager).tickets;

    KICK_TICKET_MANAGER.tickets = tickets;
    KICK_TICKET_MANAGER.ticketAmount = (tickets as KickTicket[]).length;

    const thisTicket: KickTicket | undefined = KICK_TICKET_MANAGER.tickets.find(v => v.channel_id === msg.channelId);

    if(thisTicket) {
        if(msg.content === 'READY') {
            thisTicket.set_ticket_step(1); // 1 = 'enter username'
            KICK_TICKET_MANAGER.tickets[KICK_TICKET_MANAGER.tickets.indexOf(thisTicket)]
                .set_ticket_step(1); // 1 = 'enter username'
            
            const err: Error | undefined = (save_ticket_manager() instanceof Error ? Error('Couln\'t save ticket manager') : undefined);
            if(err) throw err;
            
            // enter username
            await msg.channel.send({
                content: 'Alright, pls enter username. (Mention the user please...).'
            });
        } else if(msg.content?.includes('<@')) {
            const mentionedId = msg.content.replace(new RegExp('[a-zA-Z./\-ßüäöÜÄÖ=)(}{\[\]\r\\\',_+*~&%$§"!`´^° ><?;:@#|\t\n]+', 'g'), '');
            
            if(mentionedId.length === 0) {
                thisTicket.set_ticket_step(0); // 0 = 'type "READY"'
                KICK_TICKET_MANAGER.tickets[KICK_TICKET_MANAGER.tickets.indexOf(thisTicket)]
                    .set_ticket_step(0); // 0 = 'type "READY"'
                
                const err: Error | undefined = (save_ticket_manager() instanceof Error ? Error('Couln\'t save ticket manager') : undefined);
                if(err) throw err;

                await msg.channel.send({
                    content: `Oops, sorry. Wdym with \`${msg.content}\` ?\nTo try again type 'READY'.`
                });
                return;
            }

            thisTicket.set_user_id(mentionedId).advance_ticket_step(); // 2 = 'enter reason or "--NONE--"'
            KICK_TICKET_MANAGER.tickets[KICK_TICKET_MANAGER.tickets.indexOf(thisTicket)]
                    .set_user_id(mentionedId).advance_ticket_step(); // 2 = 'enter reason or "--NONE--"'
            
            const err: Error | undefined = (save_ticket_manager() instanceof Error ? Error('Couln\'t save ticket manager') : undefined);
            if(err) throw err;

            await msg.channel.send({
                content: `Alrighty seems like we'll kick <@${mentionedId}> !\nNot right? ➡️ type '--CANCEL--'\nOtherwise type a reason between 10 and 1000 characters or type '--NONE--' to specify no reason.`
            });
        } else if(msg.content === '--NONE--') {
            thisTicket.advance_ticket_step(); // 3 = finished
            KICK_TICKET_MANAGER.tickets[KICK_TICKET_MANAGER.tickets.indexOf(thisTicket)]
                    .advance_ticket_step(); // 3 = finished
            
            const err: Error | undefined = (save_ticket_manager() instanceof Error ? Error('Couln\'t save ticket manager') : undefined);
            if(err) throw err;

            await msg.channel.send({
                content: `Very Well! So we'll kick <@${thisTicket.user_id}>?\nIf so please type 'CONFIRM'...`
            });
        } else if(msg.content === 'CONFIRM') {
            if(thisTicket.ticket_step != 3) {
                console.log('Unfinished ticket tried to be confirmed...');
                await msg.channel.send({
                    content: 'Sorry dude, but it seems like you didn\'t finish this ticket, before confirming with \'CONFIRM\'.'
                });
                return;
            }

            const user = await msg.guild?.members.fetch({user: thisTicket.user_id});

            if(!user) {
                await msg.channel.send({
                    content: `Couldn't find user by id (${thisTicket.user_id})!`
                });

                setTimeout(async () => {
                    await msg.channel.delete();
                }, 5_000) // 5 seconds

                return;
            }

            await user.kick(thisTicket.kick_reason);

            await msg.channel.send({
                content: `Successfully kicked <@${thisTicket.user_id}>${(thisTicket.kick_reason.length == 0 ? ' .' : ` for reason '${thisTicket.kick_reason}'.`)}`
            });

            const index = KICK_TICKET_MANAGER.tickets.indexOf(thisTicket);
            if(index > -1) {
                KICK_TICKET_MANAGER.tickets.splice(index, 1);
            }

            const err: Error | undefined = (save_ticket_manager() instanceof Error ? Error('Couln\'t save ticket manager') : undefined);
            if(err) throw err;
        } else if(msg.content === '--CANCEL--') {
            thisTicket.set_ticket_step(0); // 0 = 'type "READY"'
            KICK_TICKET_MANAGER.tickets[KICK_TICKET_MANAGER.tickets.indexOf(thisTicket)]
                .set_ticket_step(0); // 0 = 'type "READY"'
            
            const err: Error | undefined = (save_ticket_manager() instanceof Error ? Error('Couln\'t save ticket manager') : undefined);
            if(err) throw err;

            await msg.channel.send({
                content: 'Ok, let\'s start over\nTo try again type \'READY\'.'
            });
        } else if(msg.content === 'DELETE') {
            await msg.channel.send({
                content: 'Alright, cancelling...'
            });

            setTimeout(async () => await msg.channel.delete(), 1_500) // 1.5 seconds

            const index = KICK_TICKET_MANAGER.tickets.indexOf(thisTicket);
            if(index > -1) {
                KICK_TICKET_MANAGER.tickets.splice(index, 1);
            }

            const err: Error | undefined = (save_ticket_manager() instanceof Error ? Error('Couln\'t save ticket manager') : undefined);
            if(err) throw err;
        } else {
            thisTicket.set_ticket_step(0); // 0 = 'type "READY"'
            KICK_TICKET_MANAGER.tickets[KICK_TICKET_MANAGER.tickets.indexOf(thisTicket)]
                .set_ticket_step(0); // 0 = 'type "READY"'
            
            const err: Error | undefined = (save_ticket_manager() instanceof Error ? Error('Couln\'t save ticket manager') : undefined);
            if(err) throw err;

            await msg.channel.send({
                content: `Invalid request: '${msg.content}'\nTo try again type 'READY'.`
            });
        }
    } else {
        console.log('MessageInteraction wasn\'t in a KICK-TICKET channel...');
    }

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

function save_ticket_manager(): void | Error {
    const data = jsonSerializer.serialize(KICK_TICKET_MANAGER);

    if(!data) return Error('Couldn\'t serialize TICKET_MANAGER!');

    fs.writeFileSync(`${process.cwd()}/KICK-TICKETS.json`, JSON.stringify(data), {
        flag: 'w'
    });

    return;
}
