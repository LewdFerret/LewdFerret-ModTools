import { Client, Collection, GatewayIntentBits, SlashCommandBuilder } from "discord.js";

export default class BotClient extends Client {
    token: string;
    commands: Collection<string, SlashCommandBuilder>;

    constructor(intents: GatewayIntentBits[], token: string) {
        super({ intents: intents });
        this.token = token;
        this.commands = new Collection();
    }

    public async login(): Promise<string> {
        return super.login(this.token);
    }
}