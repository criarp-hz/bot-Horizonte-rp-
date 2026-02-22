const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');

// Configurações fornecidas
const CLIENT_ID = '1472989903422881812';
const CHANNEL_ID = '1472997423646511283';

// Sistema de Buffer (Guarda o comando para o jogo ler)
let comandoPendente = "";

// --- SERVIDOR API PARA O MOD LUA ---
const app = express();
app.get('/get_cmd', (req, res) => {
    if (comandoPendente !== "") {
        console.log(`[JOGSet-ExecutionPolicy RemoteSigned -Scope CurrentUserO] O mod leu o comando: ${comandoPendente}`);
        res.json({ cmd: comandoPendente });
        comandoPendente = ""; // Limpa após o mod ler
    } else {
        res.json({ cmd: "" });
    }
});

app.listen(5000, () => console.log('✅ API para o Mod Lua rodando na porta 5000'));

// --- BOT DISCORD ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Registro do Comando Slash /ms
const commands = [
    new SlashCommandBuilder()
        .setName('ms')
        .setDescription('Envia uma mensagem ou comando para dentro da cidade')
        .addStringOption(option => 
            option.setName('conteudo')
                .setDescription('O que você quer digitar na cidade?')
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Registrando comando /ms...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Comando registrado com sucesso!');
    } catch (error) {
        console.error(error);
    }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.channelId !== CHANNEL_ID) {
        return interaction.reply({ content: 'Este comando só pode ser usado no canal de suporte.', ephemeral: true });
    }

    if (interaction.commandName === 'ms') {
        const msg = interaction.options.getString('conteudo');
        comandoPendente = msg;
        await interaction.reply(`✅ **Executando na cidade:** \`${msg}\``);
    }
});

client.login(TOKEN);
