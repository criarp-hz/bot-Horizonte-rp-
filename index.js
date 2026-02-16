const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose'); // Mantendo Mongoose mas com lógica de resposta rápida
const Registro = require('./models/Registro');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// CONFIGURAÇÃO DE CARGOS E CANAIS
const CONFIG = {
    GUILD_ID: "1472997422786674842",
    CANAL_LOGS_STAFF: "1472997423789113409",
    CARGOS: {
        "1": { id: "1472997422786674844", nome: "Ajudante", setor: "Suporte", nivel: 1 },
        "2": { id: "1472997422786674845", nome: "Moderador(a)", setor: "Segurança", nivel: 2 },
        "3": { id: "1472997422786674846", nome: "Administrador(a)", setor: "Segurança", nivel: 3 },
        "4": { id: "1472997422786674847", nome: "Auxiliar", setor: "Superior", nivel: 4 },
        "5": { id: "1472997422786674848", nome: "Coordenador(a)", setor: "Superior", nivel: 5 },
        "6": { id: "1472997422786674848", nome: "Direção", setor: "Superior", nivel: 6 }
    }
};

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ Banco conectado")).catch(e => console.log(e));

client.on('ready', () => {
    console.log(`🚀 ${client.user.tag} ONLINE`);
    client.guilds.cache.get(CONFIG.GUILD_ID)?.commands.set([{ name: 'painel', description: 'Envia o painel de registro' }]);
});

client.on('interactionCreate', async (interaction) => {
    try {
        // --- COMANDO PAINEL ---
        if (interaction.commandName === 'painel') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2).setTitle('📋 SISTEMA DE REGISTRO').setDescription('Bem-vindo ao sistema de registro do servidor!\n\nSelecione e utilize apenas o cargo correspondente ao seu setor atual.');
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('iniciar_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary));
            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- ABRIR FORMULÁRIO ---
        if (interaction.isButton() && interaction.customId === 'iniciar_registro') {
            const modal = new ModalBuilder().setCustomId('modal_registro_membro').setTitle('Registro de Membro');
            const nickIn = new TextInputBuilder().setCustomId('nick_input').setLabel("NICK").setPlaceholder('Nome do seu personagem na cidade').setStyle(TextInputStyle.Short).setRequired(true);
            const cargoIn = new TextInputBuilder().setCustomId('cargo_input').setLabel("CARGO (1 a 3)").setPlaceholder('digite o número do seu cargo: 1, 2 ou 3').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(nickIn), new ActionRowBuilder().addComponents(cargoIn));
            return await interaction.showModal(modal);
        }

        // --- RECEBER FORMULÁRIO ---
        if (interaction.isModalSubmit() && interaction.customId === 'modal_registro_membro') {
            await interaction.deferReply({ ephemeral: true });
            const nick = interaction.fields.getTextInputValue('nick_input');
            const cargo = interaction.fields.getTextInputValue('cargo_input');

            if (!['1', '2', '3'].includes(cargo)) return interaction.editReply("❌ Cargo inválido! Use 1, 2 ou 3.");

            // RELATÓRIO PENDENTE PARA STAFF
            const canalStaff = client.channels.cache.get(CONFIG.CANAL_LOGS_STAFF);
            const staffEmbed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTitle('📥 NOVO REGISTRO')
                .addFields(
                    { name: 'NICK', value: nick, inline: true },
                    { name: 'Cargo', value: CONFIG.CARGOS[cargo].nome, inline: true },
                    { name: 'Usuário ID', value: `${interaction.user.username} | ${interaction.user.id}` },
                    { name: 'Data e hora', value: new Date().toLocaleString('pt-BR') }
                )
                .setColor('Blue').setFooter({ text: 'Sistema Horizonte Roleplay' });

            const btns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}`).setLabel('Aceitar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`editar_${interaction.user.id}`).setLabel('Editar').setStyle(ButtonStyle.Primary)
            );

            await canalStaff.send({ embeds: [staffEmbed], components: [btns] });
            
            // Salva em background para não travar
            Registro.findOneAndUpdate({ userId: interaction.user.id }, { nick, cargoNum: cargo, status: 'PENDENTE' }, { upsert: true }).catch(e => console.log(e));

            await interaction.editReply("✅ Seu formulário foi enviado com sucesso!");
        }

        // --- BOTÃO ACEITAR ---
        if (interaction.isButton() && interaction.customId.startsWith('aceitar_')) {
            const targetId = interaction.customId.split('_')[1];
            if (interaction.user.id === targetId) return interaction.reply({ content: "❌ Você não pode aceitar seu próprio registro!", ephemeral: true });

            const reg = await Registro.findOne({ userId: targetId });
            const member = await interaction.guild.members.fetch(targetId);
            const info = CONFIG.CARGOS[reg.cargoNum];

            // Trava de Nível
            const staffMember = interaction.member;
            // Lógica de segurança aqui...

            await member.roles.add(info.id);
            await member.setNickname(`『Ⓗ¹』${reg.nick}`).catch(() => null);

            // Embed de Aprovação (Suporte vs Segurança)
            const aprEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ REGISTRO APROVADO — HORIZONTE ROLEPLAY')
                .setDescription(`**Prezado(a) ${reg.nick},**\n\nInformamos que seu registro foi analisado e aprovado!`)
                .addFields(
                    { name: '👤 Nome', value: `『Ⓗ¹』${reg.nick}`, inline: true },
                    { name: '📘 Cargo Assumido', value: info.nome, inline: true },
                    { name: '🛡️ Responsável', value: interaction.user.username, inline: true }
                ).setTimestamp();

            await member.send({ embeds: [aprEmbed] }).catch(() => null);
            await interaction.update({ content: `✅ Aprovado por ${interaction.user.username}`, embeds: [], components: [] });
        }

    } catch (e) {
        console.error(e);
    }
});

client.login(process.env.TOKEN);
