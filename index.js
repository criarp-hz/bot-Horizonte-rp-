const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const mongoose = require('mongoose');
const Registro = require('./models/Registro');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

const CONFIG = {
    GUILD_ID: "1472997422786674842",
    CANAL_LOGS_STAFF: "1472997423789113409",
    CARGOS: {
        "1": { id: "1472997422786674844", nome: "Ajudante" },
        "2": { id: "1472997422786674845", nome: "Moderador(a)" },
        "3": { id: "1472997422786674846", nome: "Administrador(a)" }
    }
};

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ Banco Conectado")).catch(e => console.log(e));

client.on('ready', async () => {
    console.log(`🤖 Bot ${client.user.tag} Online!`);
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (guild) await guild.commands.set([{ name: 'painel', description: 'Envia o painel de registro' }]);
});

client.on('interactionCreate', async (interaction) => {
    try {
        // --- PAINEL (IGUAL À IMAGEM) ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
            const registroEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 SISTEMA DE REGISTRO')
                .setDescription('Bem-vindo ao sistema de registro do servidor!\n\nPara que tudo funcione corretamente, **selecione e utilize apenas o cargo correspondente ao seu setor atual.**\n\n⚠️ **Usar cargo incorreto pode causar:**\n• Erros no registro\n• Problemas de permissão\n• Penalidades administrativas\n\n✅ Em caso de dúvida, procure um responsável do seu setor.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('iniciar_registro').setLabel('Registrar-se').setEmoji('📋').setStyle(ButtonStyle.Primary)
            );
            return await interaction.reply({ embeds: [registroEmbed], components: [row] });
        }

        // --- ABRIR MODAL ---
        if (interaction.isButton() && interaction.customId === 'iniciar_registro') {
            const modal = new ModalBuilder().setCustomId('modal_reg').setTitle('Registro de Membro');
            const nickIn = new TextInputBuilder().setCustomId('n').setLabel("NICK").setPlaceholder('Nome do seu personagem na cidade').setStyle(TextInputStyle.Short).setRequired(true);
            const cargoIn = new TextInputBuilder().setCustomId('c').setLabel("CARGO (1 a 3)").setPlaceholder('1, 2 ou 3').setStyle(TextInputStyle.Short).setMaxLength(1).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(nickIn), new ActionRowBuilder().addComponents(cargoIn));
            return await interaction.showModal(modal);
        }

        // --- PROCESSAR ENVIO ---
        if (interaction.isModalSubmit() && interaction.customId === 'modal_reg') {
            await interaction.deferReply({ ephemeral: true });

            const nick = interaction.fields.getTextInputValue('n');
            const cargo = interaction.fields.getTextInputValue('c');
            if (!['1', '2', '3'].includes(cargo)) return interaction.editReply("❌ Use 1, 2 ou 3.");

            // 1. Relatório de Status no Canal onde o jogador está
            const statusEmbed = new EmbedBuilder()
                .setTitle('⏳ REGISTRO EM ANÁLISE')
                .setColor('Yellow')
                .setDescription(`Olá **${interaction.user.username}**, seu registro foi enviado!\n\n**Nick:** ${nick}\n**Cargo:** ${CONFIG.CARGOS[cargo].nome}\n\nAguarde um administrador avaliar.`)
                .setTimestamp();
            
            const msgStatus = await interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [statusEmbed] });

            // 2. Relatório para a STAFF com FOTO
            const staffEmbed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setThumbnail(interaction.user.displayAvatarURL())
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
                new ButtonBuilder().setCustomId(`apr_${interaction.user.id}`).setLabel('Aceitar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rec_${interaction.user.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`edt_${interaction.user.id}`).setLabel('Editar').setStyle(ButtonStyle.Primary)
            );

            const canalStaff = client.channels.cache.get(CONFIG.CANAL_LOGS_STAFF);
            if (canalStaff) await canalStaff.send({ embeds: [staffEmbed], components: [rowStaff] });

            // Salva no Banco
            await Registro.findOneAndUpdate(
                { userId: interaction.user.id },
                { nick, cargoNum: cargo, status: 'PENDENTE', mensagemStatusId: msgStatus.id },
                { upsert: true }
            );

            await interaction.editReply("✅ Seu formulário foi enviado com sucesso!");
        }

        // --- LÓGICA DOS BOTÕES (CORREÇÃO DEFINITIVA) ---
        if (interaction.isButton()) {
            const [idAcao, targetId] = interaction.customId.split('_');
            
            if (['apr', 'rec', 'edt'].includes(idAcao)) {
                // Se for editar, aqui abriremos o painel de edição depois. Por ora, vamos focar no Aceitar/Recusar
                if (interaction.user.id === targetId) return interaction.reply({ content: "❌ Você não pode avaliar seu próprio registro!", ephemeral: true });

                const reg = await Registro.findOne({ userId: targetId });
                const member = await interaction.guild.members.fetch(targetId).catch(() => null);
                if (!member) return interaction.reply({ content: "❌ Membro saiu do servidor.", ephemeral: true });

                if (idAcao === 'apr') {
                    const info = CONFIG.CARGOS[reg.cargoNum];
                    await member.roles.add(info.id);
                    await member.setNickname(`『Ⓗ¹』${reg.nick}`).catch(() => null);
                    
                    await interaction.update({ content: `✅ Registro de <@${targetId}> APROVADO por ${interaction.user.username}`, embeds: [], components: [] });
                }

                if (idAcao === 'rec') {
                    await interaction.update({ content: `❌ Registro de <@${targetId}> RECUSADO por ${interaction.user.username}`, embeds: [], components: [] });
                }
            }
        }

    } catch (e) { console.error("Erro na interação:", e); }
});

client.login(process.env.TOKEN);
