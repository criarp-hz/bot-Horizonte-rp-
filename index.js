const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, 
    StringSelectMenuBuilder, PermissionsBitField 
} = require('discord.js');
const mongoose = require('mongoose');
const Registro = require('./models/Registro');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// --- CONFIGURAÇÃO DE IDS DO HORIZONTE RP ---
const CONFIG = {
    GUILD_ID: "1472997422786674842",
    CANAL_PAINEL: "1472997423197454468",
    CANAL_LOGS_STAFF: "1472997423789113409",
    CANAL_CONFIG_ADM: "1472997423789113408",
    CARGOS: {
        "1": { id: "1472997422786674844", nome: "Ajudante", setor: "Suporte", emoji: "1️⃣" },
        "2": { id: "1472997422786674845", nome: "Moderador(a)", setor: "Segurança", emoji: "2️⃣" },
        "3": { id: "1472997422786674846", nome: "Administrador(a)", setor: "Segurança", emoji: "3️⃣" },
        "4": { id: "1472997422786674847", nome: "Auxiliar", setor: "Superior", emoji: "4️⃣" },
        "5": { id: "1472997422786674848", nome: "Coordenador(a)", setor: "Superior", emoji: "5️⃣" },
        "6": { id: "1472997422786674848", nome: "Direção", setor: "Superior", emoji: "6️⃣" }
    }
};

// Conexão Estável MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Banco de Dados Horizonte RP Conectado!"))
    .catch(err => console.error("❌ Falha no MongoDB:", err));

client.on('ready', async () => {
    console.log(`🤖 Logado como ${client.user.tag}`);
    // Registro dos comandos Slash localmente no servidor
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (guild) {
        await guild.commands.set([
            { name: 'painel', description: 'Envia o painel inicial de registro' },
            { name: 'configadm', description: 'Painel de configuração administrativa' }
        ]);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        // --- COMANDO /PAINEL ---
        if (interaction.commandName === 'painel') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription('Bem-vindo ao sistema de registro do servidor!\n\nSelecione e utilize apenas o cargo correspondente ao seu setor.\n\n⚠️ **Usar cargo incorreto pode causar penalidades.**')
                .setFooter({ text: 'Sistema Horizonte Roleplay' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('iniciar_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );
            await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- BOTÃO REGISTRAR ---
        if (interaction.customId === 'iniciar_registro') {
            const modal = new ModalBuilder().setCustomId('modal_registro').setTitle('Registro de Membro');
            const nickIn = new TextInputBuilder().setCustomId('n').setLabel('NICK').setPlaceholder('Nome no personagem').setStyle(TextInputStyle.Short).setRequired(true);
            const cargoIn = new TextInputBuilder().setCustomId('c').setLabel('CARGO (1, 2 ou 3)').setMaxLength(1).setStyle(TextInputStyle.Short).setRequired(true);
            
            modal.addComponents(new ActionRowBuilder().addComponents(nickIn), new ActionRowBuilder().addComponents(cargoIn));
            await interaction.showModal(modal);
        }

        // --- SUBMISSÃO DO MODAL ---
        if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {
            await interaction.deferReply({ ephemeral: true });
            const nick = interaction.fields.getTextInputValue('n');
            const cargo = interaction.fields.getTextInputValue('c');

            if (!['1', '2', '3'].includes(cargo)) return interaction.editReply("❌ Escolha apenas 1, 2 ou 3!");

            let reg = await Registro.findOne({ userId: interaction.user.id });
            if (reg && reg.tentativas >= 3) return interaction.editReply("❌ Você atingiu o limite de 3 tentativas.");

            reg = await Registro.findOneAndUpdate(
                { userId: interaction.user.id },
                { nick, cargoNum: cargo, status: 'PENDENTE', $inc: { tentativas: 1 }, userName: interaction.user.username },
                { upsert: true, new: true }
            );

            // Relatório para a Staff
            const canalStaff = client.channels.cache.get(CONFIG.CANAL_LOGS_STAFF);
            const embedS = new EmbedBuilder()
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .setTitle('📥 NOVO REGISTRO PENDENTE')
                .addFields(
                    { name: '👤 Nick', value: nick, inline: true },
                    { name: '💼 Cargo', value: CONFIG.CARGOS[cargo].nome, inline: true },
                    { name: '🆔 ID', value: interaction.user.id, inline: false }
                )
                .setColor('Yellow')
                .setFooter({ text: 'Horizonte Roleplay' }).setTimestamp();

            const btns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`adm_sim_${interaction.user.id}`).setLabel('Aceitar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`adm_nao_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`adm_edt_${interaction.user.id}`).setLabel('Editar').setStyle(ButtonStyle.Primary)
            );

            const msg = await canalStaff.send({ embeds: [embedS], components: [btns] });
            reg.mensagemPainelId = msg.id;
            await reg.save();

            await interaction.editReply("✅ Formulário enviado com sucesso!");
        }

        // --- BOTÕES DA STAFF ---
        if (interaction.isButton() && interaction.customId.startsWith('adm_')) {
            const [,, targetId] = interaction.customId.split('_');
            if (interaction.user.id === targetId) return interaction.reply({ content: "❌ Você não pode avaliar seu próprio registro!", ephemeral: true });

            const reg = await Registro.findOne({ userId: targetId });
            const targetMember = await interaction.guild.members.fetch(targetId);

            // ACEITAR
            if (interaction.customId.includes('sim')) {
                const infoCargo = CONFIG.CARGOS[reg.cargoNum];
                await targetMember.roles.add(infoCargo.id);
                await targetMember.setNickname(`『Ⓗ¹』${reg.nick}`).catch(() => null);

                reg.status = 'APROVADO';
                reg.responsavelId = interaction.user.username;
                await reg.save();

                const embedDM = new EmbedBuilder()
                    .setTitle('✅ REGISTRO APROVADO — HORIZONTE ROLEPLAY')
                    .setColor('#2ecc71')
                    .setDescription(`Prezado(a) **${reg.userName}**, seu registro foi aprovado para o setor **${infoCargo.setor}**.`)
                    .addFields(
                        { name: '👤 Nome', value: `『Ⓗ¹』${reg.nick}`, inline: true },
                        { name: '🛡️ Responsável', value: interaction.user.username, inline: true }
                    );

                await targetMember.send({ embeds: [embedDM] }).catch(() => null);
                await interaction.update({ content: `✅ Aprovado por ${interaction.user.tag}`, embeds: [], components: [] });
            }

            // RECUSAR
            if (interaction.customId.includes('nao')) {
                reg.status = 'RECUSADO';
                await reg.save();
                const embedDM = new EmbedBuilder()
                    .setTitle('❌ REGISTRO RECUSADO')
                    .setColor('#e74c3c')
                    .setDescription(`Tentativas: ${reg.tentativas}/3. Corrija os dados e tente novamente.`);
                
                await targetMember.send({ embeds: [embedDM] }).catch(() => null);
                await interaction.update({ content: `❌ Recusado por ${interaction.user.tag}`, embeds: [], components: [] });
            }

            // ABRIR PAINEL DE EDIÇÃO
            if (interaction.customId.includes('edt')) {
                const editEmbed = new EmbedBuilder()
                    .setTitle('🛠️ PAINEL DE EDIÇÃO ADMINISTRATIVA')
                    .setDescription(`Editando registro de: <@${targetId}>\n\nEscolha o que deseja alterar:`)
                    .setColor('Blue');

                const rowEdit = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`f_nick_${targetId}`).setLabel('Mudar Nick').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`f_cargo_${targetId}`).setLabel('Mudar Cargo').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`f_conf_${targetId}`).setLabel('Confirmar e Fechar').setStyle(ButtonStyle.Success)
                );

                await interaction.reply({ embeds: [editEmbed], components: [rowEdit], ephemeral: true });
            }
        }

        // --- LÓGICA DE EDIÇÃO (MODAL DE NICK E SELECT DE CARGO) ---
        if (interaction.isButton() && interaction.customId.startsWith('f_nick')) {
            const targetId = interaction.customId.split('_')[2];
            const modal = new ModalBuilder().setCustomId(`save_nick_${targetId}`).setTitle('Novo Nick');
            const input = new TextInputBuilder().setCustomId('new_n').setLabel('NICK NOVO').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('save_nick')) {
            const targetId = interaction.customId.split('_')[2];
            const novoNick = interaction.fields.getTextInputValue('new_n');
            await Registro.findOneAndUpdate({ userId: targetId }, { nick: novoNick });
            await interaction.reply({ content: `✅ Nick alterado para: ${novoNick}`, ephemeral: true });
        }

    } catch (err) {
        console.error("Erro na Interação:", err);
        if (!interaction.replied) await interaction.reply({ content: "❌ Ocorreu um erro interno.", ephemeral: true });
    }
});

client.login(process.env.TOKEN);
