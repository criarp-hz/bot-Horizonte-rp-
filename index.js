const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const mongoose = require('mongoose');
const Registro = require('./models/Registro');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// --- CONFIGURAÇÃO DE IDS DO SERVIDOR ---
const CONFIG = {
    GUILD_ID: "1472997422786674842",
    CANAL_LOGS_STAFF: "1472997423789113409",
    CARGOS: {
        "1": { id: "1472997422786674844", nome: "Ajudante", setor: "Suporte" },
        "2": { id: "1472997422786674845", nome: "Moderador(a)", setor: "Segurança" },
        "3": { id: "1472997422786674846", nome: "Administrador(a)", setor: "Segurança" }
    }
};

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ Banco Conectado")).catch(e => console.log(e));

client.on('ready', async () => {
    console.log(`🤖 Bot ${client.user.tag} Online!`);
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (guild) {
        await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro' }]);
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        // --- PAINEL PRINCIPAL (IGUALZINHO À FOTO) ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
            const registroEmbed = new EmbedBuilder()
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
                new ButtonBuilder()
                    .setCustomId('iniciar_registro')
                    .setLabel('Registrar-se')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Primary)
            );

            return await interaction.reply({ embeds: [registroEmbed], components: [row] });
        }

        // --- ABRIR MODAL ---
        if (interaction.isButton() && interaction.customId === 'iniciar_registro') {
            const modal = new ModalBuilder().setCustomId('modal_reg').setTitle('Registro de Membro');

            const nickIn = new TextInputBuilder()
                .setCustomId('nick_input').setLabel("NICK").setPlaceholder('Nome do seu personagem na cidade').setStyle(TextInputStyle.Short).setRequired(true);

            const cargoIn = new TextInputBuilder()
                .setCustomId('cargo_input').setLabel("CARGO (1 a 3)").setPlaceholder('digite o número do seu cargo: 1, 2 ou 3').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(nickIn), new ActionRowBuilder().addComponents(cargoIn));
            return await interaction.showModal(modal);
        }

        // --- RECEBER FORMULÁRIO E ENVIAR RELATÓRIO COM FOTO ---
        if (interaction.isModalSubmit() && interaction.customId === 'modal_reg') {
            await interaction.deferReply({ ephemeral: true });

            const nick = interaction.fields.getTextInputValue('nick_input');
            const cargo = interaction.fields.getTextInputValue('cargo_input');

            if (!['1', '2', '3'].includes(cargo)) return interaction.editReply("❌ Cargo inválido! Use 1, 2 ou 3.");

            const canalStaff = client.channels.cache.get(CONFIG.CANAL_LOGS_STAFF);
            
            // RELATÓRIO COM FOTO DO USUÁRIO
            const staffEmbed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setThumbnail(interaction.user.displayAvatarURL()) // Foto do jogador no canto
                .setTitle('📥 NOVO REGISTRO')
                .setColor('Blue')
                .addFields(
                    { name: 'NICK', value: nick, inline: true },
                    { name: 'Cargo', value: CONFIG.CARGOS[cargo].nome, inline: true },
                    { name: 'Usuário | ID', value: `${interaction.user.username} | ${interaction.user.id}`, inline: false },
                    { name: 'Data e hora', value: new Date().toLocaleString('pt-BR'), inline: false }
                )
                .setFooter({ text: 'Sistema desenvolvido pela equipe administrativa do Horizonte Roleplay.' });

            const rowStaff = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aceitar_${interaction.user.id}`).setLabel('Aceitar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`editar_${interaction.user.id}`).setLabel('Editar').setStyle(ButtonStyle.Primary)
            );

            await canalStaff.send({ embeds: [staffEmbed], components: [rowStaff] });

            // Salva no banco
            await Registro.findOneAndUpdate(
                { userId: interaction.user.id },
                { nick, cargoNum: cargo, status: 'PENDENTE' },
                { upsert: true }
            );

            await interaction.editReply("✅ Seu formulário foi enviado com sucesso!");
        }

        // --- LÓGICA DOS BOTÕES DA STAFF (CORREÇÃO DE FUNCIONAMENTO) ---
        if (interaction.isButton() && (interaction.customId.startsWith('aceitar_') || interaction.customId.startsWith('recusar_'))) {
            const [acao, targetId] = interaction.customId.split('_');
            
            // Impede auto-aprovação
            if (interaction.user.id === targetId) {
                return interaction.reply({ content: "❌ Você não pode avaliar seu próprio registro!", ephemeral: true });
            }

            const reg = await Registro.findOne({ userId: targetId });
            const member = await interaction.guild.members.fetch(targetId).catch(() => null);

            if (!member) return interaction.reply({ content: "❌ Usuário não encontrado no servidor.", ephemeral: true });

            if (acao === 'aceitar') {
                const info = CONFIG.CARGOS[reg.cargoNum];
                await member.roles.add(info.id);
                await member.setNickname(`『Ⓗ¹』${reg.nick}`).catch(() => null);

                await interaction.update({ content: `✅ **Registro aprovado por ${interaction.user.username}**`, embeds: [], components: [] });
                // Aqui você pode adicionar o envio daquelas mensagens de aprovação que você mandou antes
            }

            if (acao === 'recusar') {
                await interaction.update({ content: `❌ **Registro recusado por ${interaction.user.username}**`, embeds: [], components: [] });
            }
        }

    } catch (e) { console.error(e); }
});

client.login(process.env.TOKEN);
