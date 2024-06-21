import { Events } from "discord.js";
import CustomClient from "../../base/classes/CustomClient";
import Event from "../../base/classes/Event";

export default class Ready extends Event {
    constructor(client: CustomClient) {
        super(client, {
            name: Events.ClientReady,
            description: 'Ready Event',
            once: true,
        });
    }

    Execute(...args: any): void {
        console.log(`${this.client.user?.tag} is ready.`);
    }
}