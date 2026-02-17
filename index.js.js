require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Mongo
require("./database/mongo")();

// Comandos
client.commands = new Collection();
const painel = require("./commands/painel");
client.commands.set(painel.name, painel);

// Interactions
require("./interactions/registroPanel")(client);
require("./interactions/registroModal")(client);

// Slash handler
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (cmd) await cmd.execute(interaction);
});

client.once("ready", () => {
  console.log("Bot online:", client.user.tag);
});

client.login(process.env.TOKEN);