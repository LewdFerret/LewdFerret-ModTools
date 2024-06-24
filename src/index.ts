import { ActivityType, GatewayIntentBits } from 'discord.js';
import BotClient from "./BotClient";
import config from '../data/config.json';

const TOKEN: string = config.token;

const CLIENT: BotClient = new BotClient([
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
], TOKEN);

process.on('SIGINT', async () => {
    await CLIENT.destroy();

    console.log("Bot logged off.");

    process.exit(0);
});

CLIENT.once('ready', () => {
    CLIENT.user?.setStatus('online');

    CLIENT.user?.setActivity({
        name: '/test',
        type: ActivityType.Listening,
    });

    console.log(`'${CLIENT.user?.displayName}#${CLIENT.user?.discriminator}' is ready.`);
});

async function main() {
    if(!TOKEN || TOKEN.length == 0) {
        console.error('No token in data/config.json found.');
        process.exit(1);
    }

    CLIENT.login();
}

main();
