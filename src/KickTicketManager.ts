import { JsonObject, JsonProperty } from "typescript-json-serializer";
import { KickTicket } from "./KickTicket";

@JsonObject()
export class KickTicketManager {
    @JsonProperty({ name: 'kick_tickets' })
    public tickets: KickTicket[];

    ticketAmount: number = 0;

    constructor() {
        this.tickets = [];
    }

    public add_ticket(ticket: KickTicket): void {
        this.ticketAmount = this.tickets.push(ticket);
    }
}