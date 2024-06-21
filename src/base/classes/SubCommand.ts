import { ChatInputCommandInteraction, CacheType } from "discord.js";
import CustomClient from "./CustomClient";
import ISubCommandOptions from "../interfaces/ISubCommandOptions";
import ISubCommand from "../interfaces/ISubCommand";

export default class SubCommand implements ISubCommand {
    client: CustomClient;
    name: string;

    constructor(client: CustomClient, opt: ISubCommandOptions) {
        this.client = client;
        this.name = opt.name;
    }

    Execute(interaction: ChatInputCommandInteraction<CacheType>): void {
        
    }
}
