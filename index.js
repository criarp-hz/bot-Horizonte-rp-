const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const mongoose = require('mongoose');
const Registro = require('./models/Registro');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// CONFIGURAÇÃO
const CONFIG = {
    GUILD_ID: "1472997422786674842",
    CANAL_LOGS_STAFF: "1472997423789113409", 
    CARGOS: {
        "1": { id: "1472997422786674844", nome: "Ajudante" },
        "2": { id: "1472997422786674845", nome: "Moderador(a)" },
        "3": { id: "1472997422786674846", nome: "Administrador(a)" }
    }
};

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ MongoDB Conectado")).catch(e => console.error("❌ Erro DB:", e));

client.on('ready', () => {
    console.log(`🤖 Bot Online como ${client.user.tag}`);
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if(guild) guild.commands.set([{ name: 'painel', description: 'Envia o painel' }]);
});

client.on('interactionCreate', async (interaction) => {
    try {
        // COMANDO /PAINEL
        if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription('Bem-vindo ao sistema de registro!\n\nUtilize o botão abaixo para iniciar.');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('reg_btn').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary));
            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // ABRIR MODAL
        if (interaction.isButton() && interaction.customId === 'reg_btn') {
            const modal = new ModalBuilder().setCustomId('modal_form').setTitle('Registro de Membro');
            const n = new TextInputBuilder().setCustomId('n').setLabel('NICK').setPlaceholder('Nome do seu personagem na cidade').setStyle(TextInputStyle.Short).setRequired(true);
            const c = new TextInputBuilder().setCustomId('c').setLabel('CARGO').setPlaceholder('Digite o número do seu cargo 1 2 ou 3').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(n), new ActionRowBuilder().addComponents(c));
            return await interaction.showModal(modal);
        }

        // PROCESSAR FORMULÁRIO
        if (interaction.isModalSubmit() && interaction.customId === 'modal_form') {
            // DEFER IMEDIATO PARA NÃO TRAVAR
            await interaction.deferReply({ ephemeral: true });
            console.log("📥 Formulário recebido, processando...");

            const nick = interaction.fields.getTextInputValue('n');
            const cargoNum = interaction.fields.getTextInputValue('c');

            if (!['1', '2', '3'].includes(cargoNum)) return interaction.editReply("❌ Use apenas 1, 2 ou 3 no cargo.");

            // 1. TENTA ENVIAR PARA A STAFF PRIMEIRO (Para garantir que o relatório chegue)
            const canalStaff = client.channels.cache.get(CONFIG.CANAL_LOGS_STAFF);
            if (!canalStaff) {
                console.log("❌ ERRO: Canal de Staff não encontrado!");
                return interaction.editReply("❌ Erro: O canal de relatórios não foi encontrado pelo Bot.");
            }

            const staffEmbed = new EmbedBuilder()
                .setTitle('📥 STATUS: PENDENTE')
                .setColor('Yellow')
                .addFields(
                    { name: 'NICK', value: nick, inline: true },
                    { name: 'Cargo', value: CONFIG.CARGOS[cargoNum].nome, inline: true },
                    { name: 'Usuário', value: `<@${interaction.user.id}>`, inline: false }
                )
                .setTimestamp();

            const rowStaff = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`apr_${interaction.user.id}`).setLabel('Aceitar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rec_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
            );

            await canalStaff.send({ embeds: [staffEmbed], components: [rowStaff] });
            console.log("✅ Relatório enviado para o canal da Staff!");

            // 2. SALVA NO BANCO EM SEGUNDO PLANO
            await Registro.findOneAndUpdate(
                { userId: interaction.user.id },
                { nick, cargoNum, status: 'PENDENTE' },
                { upsert: true }
            ).catch(e => console.log("Erro ao salvar no banco:", e));

            // 3. RESPONDE AO USUÁRIO
            await interaction.editReply("✅ Seu formulário foi enviado!");
        }

        // LÓGICA DE ACEITAR/RECUSAR
        if (interaction.isButton() && (interaction.customId.startsWith('apr_') || interaction.customId.startsWith('rec_'))) {
            await interaction.deferUpdate();
            const [acao, targetId] = interaction.customId.split('_');
            const embedOriginal = interaction.message.embeds[0];
            const novoEmbed = EmbedBuilder.from(embedOriginal);

            if (acao === 'apr') {
                novoEmbed.setTitle('✅ STATUS: ACEITO').setColor('Green');
                await interaction.editReply({ embeds: [novoEmbed], components: [] });
            } else {
                novoEmbed.setTitle('❌ STATUS: RECUSADO').setColor('Red');
                await interaction.editReply({ embeds: [novoEmbed], components: [] });
            }
        }

    } catch (error) {
        console.error("❌ ERRO GERAL:", error);
    }
});

client.login(process.env.TOKEN);
