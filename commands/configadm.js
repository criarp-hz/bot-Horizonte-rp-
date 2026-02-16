const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require("discord.js");

const mensagemService = require("../services/mensagemService");

module.exports = client => {

  const service = mensagemService(client);

  client.on("interactionCreate", async i => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName !== "configadm") return;

    await i.deferReply({ ephemeral: true });

    try {
      const modal = new ModalBuilder()
        .setCustomId("modal_configadm")
        .setTitle("Mensagem Automática");

      const titulo = new TextInputBuilder()
        .setCustomId("titulo")
        .setLabel("Título da mensagem")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const descricao = new TextInputBuilder()
        .setCustomId("descricao")
        .setLabel("Descrição da mensagem")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const canal = new TextInputBuilder()
        .setCustomId("canal")
        .setLabel("ID do canal")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const datahora = new TextInputBuilder()
        .setCustomId("datahora")
        .setLabel("Data e hora (YYYY-MM-DD HH:MM)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titulo),
        new ActionRowBuilder().addComponents(descricao),
        new ActionRowBuilder().addComponents(canal),
        new ActionRowBuilder().addComponents(datahora)
      );

      await i.showModal(modal);

    } catch (err) {
      console.error(err);
      i.editReply("Erro ao abrir painel.");
    }
  });

  // RECEBER MODAL
  client.on("interactionCreate", async i => {
    if (!i.isModalSubmit()) return;
    if (i.customId !== "modal_configadm") return;

    await i.deferReply({ ephemeral: true });

    try {
      const titulo = i.fields.getTextInputValue("titulo");
      const descricao = i.fields.getTextInputValue("descricao");
      const canalId = i.fields.getTextInputValue("canal");
      const datahora = i.fields.getTextInputValue("datahora");

      const data = new Date(datahora.replace(" ", "T"));

      await service.criarMensagem(
        canalId,
        titulo,
        descricao,
        data
      );

      const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("Mensagem agendada com sucesso")
        .addFields(
          { name: "Canal", value: canalId },
          { name: "Data/Hora", value: data.toLocaleString("pt-BR") }
        );

      i.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      i.editReply("Erro ao agendar mensagem.");
    }
  });
};