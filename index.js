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

// --- CONFIGURAÇÃO DE IDS ---
const CONFIG = {
    GUILD_ID: "1472997422786674842",
    CANAL_PAINEL: "1472997423197454468", // Onde o usuário vê o /painel
    CANAL_LOGS_STAFF: "1472997423789113409", // Onde a Staff aceita/recusa
    CARGOS: {
        "1": { id: "1472997422786674844", nome: "Ajudante" },
        "2": { id: "1472997422786674845", nome: "Moderador(a)" },
        "3": { id: "1472997422786674846", nome: "Administrador(a)" }
    }
};

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Banco de Dados Horizonte RP Conectado!"))
    .catch(err => console.error("❌ Erro MongoDB:", err));

client.on('ready', async () => {
    console.log(`🤖 Bot ${client.user.tag} Online!`);
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (guild) {
        await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro' }]);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        // --- 1. COMANDO /PAINEL (Visual Idêntico à Imagem) ---
        if (interaction.commandName === 'painel') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription(
                    'Bem-vindo ao sistema de registro do servidor!\n\n' +
                    'Para que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n' +
                    '⚠️ **Usar cargo incorreto pode causar:**\n' +
                    '• Erros no registro\n' +
                    '• Problemas de permissão\n' +
                    '• Penalidades administrativas\n\n' +
                    '✅ Em caso de dúvida, procure um responsável do seu setor.'
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_reg').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );

            return await interaction.reply({ embeds: [embed], components: [row] });
        }

        // --- 2. MODAL (NOVO FORMULÁRIO) ---
        if (interaction.isButton() && interaction.customId === 'btn_reg') {
            const modal = new ModalBuilder().setCustomId('md_reg').setTitle('Registro de Membro');

            const nIn = new TextInputBuilder()
                .setCustomId('f_nick').setLabel('NICK').setPlaceholder('Nome do seu personagem na cidade').setStyle(TextInputStyle.Short).setRequired(true);

            const cIn = new TextInputBuilder()
                .setCustomId('f_cargo').setLabel('CARGO').setPlaceholder('Digite o número do seu cargo 1 2 ou 3').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(nIn), new ActionRowBuilder().addComponents(cIn));
            return await interaction.showModal(modal);
        }

        // --- 3. PROCESSAMENTO E RELATÓRIOS ---
        if (interaction.isModalSubmit() && interaction.customId === 'md_reg') {
            await interaction.deferReply({ ephemeral: true });

            const nick = interaction.fields.getTextInputValue('f_nick');
            const cargo = interaction.fields.getTextInputValue('f_cargo');

            if (!['1', '2', '3'].includes(cargo)) return interaction.editReply("❌ Cargo inválido!");

            // Embed de Status para o Jogador (aparece no canal onde ele enviou)
            const statusEmbed = new EmbedBuilder()
                .setTitle('⏳ REGISTRO EM ANÁLISE')
                .setColor('Yellow')
                .setDescription(`Olá **${interaction.user.username}**, seu registro foi enviado!\n\n**Nick:** ${nick}\n**Cargo:** ${CONFIG.CARGOS[cargo].nome}\n\nAguarde um administrador avaliar.`)
                .setTimestamp();

            const msgStatus = await interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [statusEmbed] });

            // Salva no Banco
            const reg = await Registro.findOneAndUpdate(
                { userId: interaction.user.id },
                { nick, cargoNum: cargo, status: 'PENDENTE', mensagemStatusId: msgStatus.id },
                { upsert: true, new: true }
            );

            // Embed para a Staff (Canal de Logs)
            const staffEmbed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTitle('📥 NOVO REGISTRO')
                .setColor('Blue')
                .addFields(
                    { name: 'NICK', value: nick, inline: true },
                    { name: 'Cargo', value: CONFIG.CARGOS[cargo].nome, inline: true },
                    { name: 'Usuário | ID', value: `${interaction.user.username} | ${interaction.user.id}`, inline: false },
                    { name: 'Data e hora', value: new Date().toLocaleString('pt-BR'), inline: false }
                )
                .setFooter({ text: 'Sistema Horizonte Roleplay' });

            const rowStaff = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`apr_${interaction.user.id}`).setLabel('Aceitar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rec_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edt_${interaction.user.id}`).setLabel('Editar').setStyle(ButtonStyle.Primary)
            );

            const canalStaff = client.channels.cache.get(CONFIG.CANAL_LOGS_STAFF);
            const msgStaff = await canalStaff.send({ embeds: [staffEmbed], components: [rowStaff] });
            
            reg.mensagemPainelId = msgStaff.id;
            await reg.save();

            await interaction.editReply("✅ Seu formulário foi enviado com sucesso!");
        }

        // --- 4. LÓGICA DE ACEITAR / RECUSAR (ATUALIZA AMBOS OS RELATÓRIOS) ---
        if (interaction.isButton() && (interaction.customId.startsWith('apr_') || interaction.customId.startsWith('rec_'))) {
            const [acao, targetId] = interaction.customId.split('_');
            const reg = await Registro.findOne({ userId: targetId });
            const targetMember = await interaction.guild.members.fetch(targetId);
            const canalUsuario = client.channels.cache.get(interaction.channelId); // Canal onde o status do jogador está

            if (acao === 'apr') {
                const info = CONFIG.CARGOS[reg.cargoNum];
                await targetMember.roles.add(info.id);
                await targetMember.setNickname(`『Ⓗ¹』${reg.nick}`).catch(() => null);

                // Atualiza Mensagem da Staff
                await interaction.update({ content: `✅ Registro aprovado por ${interaction.user.tag}`, embeds: [], components: [] });

                // Atualiza Mensagem de Status do Jogador
                const msgUser = await interaction.channel.messages.fetch(reg.mensagemStatusId).catch(() => null);
                if (msgUser) {
                    const aprEmbed = new EmbedBuilder().setTitle('✅ REGISTRO APROVADO').setColor('Green').setDescription(`Seu registro foi aceito! Bem-vindo ao setor **${info.nome}**.`);
                    await msgUser.edit({ embeds: [aprEmbed] });
                }
            }

            if (acao === 'rec') {
                await interaction.update({ content: `❌ Registro recusado por ${interaction.user.tag}`, embeds: [], components: [] });
                const msgUser = await interaction.channel.messages.fetch(reg.mensagemStatusId).catch(() => null);
                if (msgUser) {
                    const recEmbed = new EmbedBuilder().setTitle('❌ REGISTRO RECUSADO').setColor('Red').setDescription(`Seu registro foi recusado pela administração.`);
                    await msgUser.edit({ embeds: [recEmbed] });
                }
            }
        }

    } catch (e) { console.error(e); }
});

client.login(process.env.TOKEN);
