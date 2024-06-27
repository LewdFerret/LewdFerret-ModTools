export default class CustomSerializer {
    /*
     * '°' = next property of current ticket
     * '|' = next ticket of current file
    */
    public static ticketsToCustom(tickets: {
        channel_id?: string,
        embed_message_id?: string,
        user_id?: string,
        reason?: string
    }[]): string | never {
        let data = '';

        for(let i: number = 0; i < tickets.length; i++) {
            const ticket = tickets[i];

            if(!ticket) throw Error('Ticket was null!');

            if(ticket.channel_id)
                data += ticket.channel_id + '°';
            else
                data += 'null°';

            if(ticket.embed_message_id)
                data += ticket.embed_message_id + '°';
            else
                data += 'null°';

            if(ticket.user_id)
                data += ticket.user_id + '°';
            else
                data += 'null°';

            if(ticket.reason) {
                data += ticket.reason;
                if((i + 1) !== tickets.length) // i !== EOF
                    data += '|';
            } else {
                data += 'null';
                if((i + 1) !== tickets.length) // i !== EOF
                    data += '|'
            }
        }

        if(data && data.length !== 0) return data;
        else throw Error('Unexpected error while parsing tickets...');
    }

    public static ticketsFromCustom(dataIn: string): {
        channel_id?: string,
        embed_message_id?: string,
        user_id?: string,
        reason?:string
    }[] | never {
        if(!dataIn || dataIn.length === 0) {
            return [];
        }

        let data: {
            channel_id?: string,
            embed_message_id?: string,
            user_id?: string,
            reason?: string
        }[] = [];

        const tickets = dataIn.split('|');

        if(!tickets || tickets.length === 0)
            throw Error('Unexpected Error while parsing tickets.');

        for(const ticket of tickets) {
            const d = ticket.split('°');
            const channel_id = d[0];
            const embed_message_id = d[1];
            const user_id = d[2];
            const reason = d[3];

            const current: {
                channel_id?: string,
                embed_message_id?: string,
                user_id?: string,
                reason?:string
            } = {};

            if(!channel_id || !embed_message_id || !user_id || !reason) {
                console.error('Some properties on tickets where undefined. Exiting...');
                throw Error('Error while parsing tickets.');
            }

            if(channel_id !== 'null' && channel_id.length !== 0) {
                current.channel_id = channel_id;
            }

            if(embed_message_id !== 'null' && embed_message_id.length !== 0) {
                current.embed_message_id = embed_message_id;
            }

            if(user_id !== 'null' && user_id.length !== 0) {
                current.user_id = user_id;
            }

            if(reason !== 'null' && reason.length !== 0) {
                current.reason = reason;
            }

            data.push(current);
        }

        return data;
    }
}
