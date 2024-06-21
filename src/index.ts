import CustomClient from "./base/classes/CustomClient";


const client: CustomClient = new CustomClient();
client.Init();

process.on('SIGINT', async () => {
    await client.destroy();

    console.log("Bot logged off.");

    process.exit(0);
});
