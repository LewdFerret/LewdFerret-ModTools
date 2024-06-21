import { CacheType, ChatInputCommandInteraction } from "discord.js";
import CustomClient from "../base/classes/CustomClient";
import SubCommand from "../base/classes/SubCommand";

export default class Test extends SubCommand {
    constructor(client: CustomClient) {
        super(client, {
            name: 'test.two',
        });
    }

    Execute(interaction: ChatInputCommandInteraction<CacheType>): void {
        interaction.reply({
            content: 'Test two ran!',
            ephemeral: true
        });
    }
}