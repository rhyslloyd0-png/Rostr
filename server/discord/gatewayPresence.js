// Everything else in this app talks to Discord over plain REST (see
// discord/api.js) — no gateway connection, on purpose, since nothing here
// needs to react to Discord events in real time. But a bot only ever shows
// as "online" in a server's member list while it holds a live Gateway
// (WebSocket) connection; a REST-only bot always shows offline. This is the
// one piece of the app that opens that connection, purely so the bot's
// presence reads online — it doesn't listen for or handle any gateway
// events itself.
const { Client, GatewayIntentBits } = require("discord.js");

let client = null;

function startGatewayPresence() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn("DISCORD_BOT_TOKEN not set — skipping gateway connection, bot will show offline.");
    return;
  }

  // Guilds is the minimum intent discord.js requires to log in at all.
  client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once("ready", () => {
    client.user.setPresence({ status: "online" });
    console.log(`Gateway presence connected as ${client.user.tag}`);
  });

  client.on("error", err => console.error("Discord gateway error:", err));

  client.login(token).catch(err => {
    console.error("Failed to connect gateway presence:", err.message);
  });
}

module.exports = { startGatewayPresence };
