import { Client, GatewayIntentBits, RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

export default class BotClient extends Client {
    token: string;
    commands: RESTPostAPIChatInputApplicationCommandsJSONBody[];

    constructor(intents: GatewayIntentBits[], token: string) {
        super({ intents: intents });
        this.token = token;
        this.commands = [];
    }

    public async login(): Promise<string> {
        return super.login(this.token);
    }
}