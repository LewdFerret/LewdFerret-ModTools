import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const clearChannelCmd = new SlashCommandBuilder()
    .setName('clear-channel')
    .setDescription('Clears this or a specified channel completely.')
    .addChannelOption((targetChannel) => {
        targetChannel.setName('target')
            .setDescription('Specifies the target channel.')
            .setRequired(false);

        return targetChannel;
    })
    .addIntegerOption((msgAmount) => {
        msgAmount.setName('amount')
            .setDescription('The amount of messages to delete.')
            .setMinValue(10)
            .setRequired(false);

        return msgAmount;
    })
    .setDMPermission(true)
    .setDefaultMemberPermissions((
        PermissionFlagsBits.UseApplicationCommands |
        PermissionFlagsBits.ManageMessages |
        PermissionFlagsBits.ReadMessageHistory
    ));

export const kickGuiCmd = new SlashCommandBuilder()
    .setName('kick-gui')
    .setDescription('Kick a server member with a gui.')
    .addChannelOption((sendGuiTo) => {
        sendGuiTo.setName('send-to-channel')
            .setDescription('The channel to send the ui to. This will mention you.')
            .setRequired(false);

        return sendGuiTo;
    })
    .setDefaultMemberPermissions((
        PermissionFlagsBits.UseApplicationCommands |
        PermissionFlagsBits.KickMembers 
    ));

export const kickCmd = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a server member.')
    .addMentionableOption((user) => {
        user.setName('user')
            .setDescription('The user to kick')
            .setRequired(true);

        return user;
    })
    .addStringOption((reason) => {
        reason.setName('reason')
            .setDescription('The reason to kick the user for.')
            .setRequired(false);

        return reason;
    })
    .setDefaultMemberPermissions((
        PermissionFlagsBits.UseApplicationCommands |
        PermissionFlagsBits.KickMembers
    ));

export const testCmd = new SlashCommandBuilder()
    .setName('test')
    .setDescription('Just runs a lil\' test!')
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands);
