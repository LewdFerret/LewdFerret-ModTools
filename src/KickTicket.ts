import { JsonObject, JsonProperty } from "typescript-json-serializer";

@JsonObject()
export class KickTicket {
    @JsonProperty()
    public channel_id: string;
    @JsonProperty()
    public user_id: string;
    @JsonProperty()
    public command_user_id: string;
    @JsonProperty()
    public kick_reason: string;
    @JsonProperty()
    public ticket_step: number; // -1 = not started
                                //  0 = 'type "READY"'
                                //  1 = 'enter username'
                                //  2 = 'enter reason or "--NONE--"'
                                //  3 = finished

    constructor() {
        this.channel_id = '';
        this.user_id = '';
        this.command_user_id = '';
        this.kick_reason = '';
        this.ticket_step = -1;
    }

    public set_channel_id(channel_id: string): KickTicket {
        this.channel_id = channel_id;
        return (this as KickTicket);
    }

    public set_user_id(user_id: string): KickTicket {
        this.user_id = user_id;
        return (this as KickTicket);
    }

    public set_command_user_id(command_user_id: string): KickTicket {
        this.command_user_id = command_user_id;
        return (this as KickTicket);
    }

    public set_kick_reason(kick_reason: string): KickTicket {
        this.kick_reason = kick_reason;
        return (this as KickTicket);
    }

    public set_ticket_step(ticket_step: number): KickTicket {
        this.ticket_step = ticket_step;
        return (this as KickTicket);
    }

    public advance_ticket_step(): KickTicket {
        this.ticket_step += 1;
        return (this as KickTicket);
    }
}
