import { Collection, Events, REST, Routes } from "discord.js";
import CustomClient from "../../base/classes/CustomClient";
import Event from "../../base/classes/Event";
import Command from "../../base/classes/Command";

export default class Ready extends Event {
    constructor(client: CustomClient) {
        super(client, {
            name: Events.ClientReady,
            description: 'Ready Event',
            once: true,
        });
    }

    async Execute(...args: any): Promise<void> {
        console.log(`${this.client.user?.tag} is ready.`);

        const commands: object[] = this.GetJSON(this.client.commands);

        const rest: REST = new REST({ version: '10' }).setToken(this.client.config.token);

        console.log(`Refreshing ${commands.length} commands.`);

        const setCommands: any = await rest.put(
            Routes.applicationCommands(this.client.config.client_id),
            { body: commands }
        );

        console.log(`Refreshed ${setCommands.length} commands.`);
    }

    private GetJSON(commands: Collection<string, Command>): object[] {
        const data: object[] = [];

        commands.forEach(command => {
            data.push({
                name: command.name,
                description: command.description,
                default_member_permissions: command.default_member_permissions.toString(10),
                dm_permission: command.dm_permission,
            });
        });

        return data;
    }
}