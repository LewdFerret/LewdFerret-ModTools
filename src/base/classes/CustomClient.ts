import { Client } from "discord.js";
import ICustomClient from "../interfaces/ICustomClient";
import { IConfig } from "../interfaces/IConfig";
import Handler from "./Handler";

export default class CustomClient extends Client implements ICustomClient {
    handler: Handler;
    config: IConfig;

    constructor() {
        super({
            intents: [

            ]
        });

        this.handler = new Handler(this);
        this.config = require(`${process.cwd()}/data/config.json`);
    }
    
    Init(): void {
        this.LoadHandlers();

        this.login(this.config.token)
            .catch((err) => console.error(err));
    }

    LoadHandlers(): void {
        this.handler.LoadEvents();
    }
}
