import { Client } from "discord.js";
import ICustomClient from "../interfaces/ICustomClient";
import { IConfig } from "../interfaces/IConfig";

export default class CustomClient extends Client implements ICustomClient {
    config: IConfig;

    constructor() {
        super({
            intents: [

            ]
        });

        this.config = require(`${process.cwd()}/data/config.json`);
    }

    Init(): void {
        this.login(this.config.token)
            .then(() => console.log(`Logged in as ${this.user?.username}#${this.user?.discriminator}`))
            .catch((err) => console.error(err));
    }
}
