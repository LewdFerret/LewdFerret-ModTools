process.on('SIGINT', async () => {
    //await client.destroy();

    console.log("Bot logged off.");

    process.exit(0);
});
