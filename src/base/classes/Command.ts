import { ChatInputCommandInteraction, CacheType, AutocompleteInteraction } from "discord.js";
import Category from "../enums/Category";
import ICommand from "../interfaces/ICommand";
import CustomClient from "./CustomClient";
import ICommandOptions from "../interfaces/ICommandOptions";

export default class Command implements ICommand {
    client: CustomClient;
    name: string;
    description: string;
    category: Category;
    options: object;
    default_member_permissions: bigint;
    dm_permission: boolean;
    cooldown: number;

    constructor(client: CustomClient, opt: ICommandOptions) {
        this.client = client;
        this.name = opt.name;
        this.description = opt.description;
        this.category = opt.category;
        this.options = opt.options;
        this.default_member_permissions = opt.default_member_permissions;
        this.dm_permission = opt.dm_permission;
        this.cooldown = opt.cooldown;
    }

    Execute(interaction: ChatInputCommandInteraction<CacheType>): void {
        
    }
    AutoComplete(interaction: AutocompleteInteraction<CacheType>): void {
        
    }

}
