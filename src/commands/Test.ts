import { ApplicationCommandOptionType, CacheType, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import Command from "../base/classes/Command";
import CustomClient from "../base/classes/CustomClient";
import Category from "../base/enums/Category";

export default class Test extends Command {
    constructor(client: CustomClient) {
        super(client, {
            name: 'test',
            description: 'Just a test',
            category: Category.Utilities,
            default_member_permissions: PermissionFlagsBits.UseApplicationCommands,
            dm_permission: true,
            cooldown: 0,
            options: [
                {
                    name: 'one',
                    description: 'This is the first option',
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: 'two',
                    description: 'This is the second option',
                    type: ApplicationCommandOptionType.Subcommand
                }
            ]
        });
    }
}