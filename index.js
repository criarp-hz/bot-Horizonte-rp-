require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const connectDB = require('./database/mongo');
const logger = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

connectDB();

client.once('ready', () => {
  console.log(`Bot online: ${client.user.tag}`);
});

process.on("unhandledRejection", err => logger.error(err));
process.on("uncaughtException", err => logger.error(err));

require('./commands/painel')(client);
require('./commands/configadm')(client);
require('./interactions/registroPanel')(client);
require('./interactions/aceitar')(client);
require('./interactions/recusar')(client);
require('./interactions/editar')(client);

client.login(process.env.TOKEN);