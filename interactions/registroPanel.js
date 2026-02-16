const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const Registro = require("../models/Registro");

module.exports = client => {
  client.on("interactionCreate", async i => {

    if (i.isButton() && i.customId === "iniciar_registro") {
      const modal = new ModalBuilder()
        .setCustomId("modal_registro")
        .setTitle("Registro");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("nick")
            .setLabel("Nick")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("cargo")
            .setLabel("Cargo (1,2,3)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_registro") {
      await i.deferReply({ ephemeral: true });

      const nick = i.fields.getTextInputValue("nick");
      const cargo = i.fields.getTextInputValue("cargo");

      if (!["1","2","3"].includes(cargo)) {
        return i.editReply("Cargo inválido.");
      }

      await Registro.findOneAndUpdate(
        { userId: i.user.id },
        {
          userId: i.user.id,
          username: i.user.username,
          nick,
          cargo: Number(cargo),
          setor: cargo == 1 ? "SUPORTE" : "SEGURANÇA",
          status: "PENDENTE"
        },
        { upsert: true }
      );

      i.editReply("Registro enviado para análise.");
    }
  });
};