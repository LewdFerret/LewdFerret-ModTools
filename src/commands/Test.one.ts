import { CacheType, ChatInputCommandInteraction } from "discord.js";
import CustomClient from "../base/classes/CustomClient";
import SubCommand from "../base/classes/SubCommand";

export default class Test extends SubCommand {
    constructor(client: CustomClient) {
        super(client, {
            name: 'test.one',
        });
    }

    Execute(interaction: ChatInputCommandInteraction<CacheType>): void {
        interaction.reply({
            content: 'Test one ran!',
            ephemeral: true
        });
    }
}