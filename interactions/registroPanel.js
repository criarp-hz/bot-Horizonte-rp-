const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = client => {
  client.on("interactionCreate", async i => {

    if (!i.isButton()) return;
    if (i.customId !== "abrir_registro") return;

    const modal = new ModalBuilder()
      .setCustomId("modal_registro")
      .setTitle("Sistema de Registro");

    const nick = new TextInputBuilder()
      .setCustomId("nick")
      .setLabel("Nome do personagem")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Digite o nome do seu personagem na cidade")
      .setRequired(true);

    const cargo = new TextInputBuilder()
      .setCustomId("cargo")
      .setLabel("Cargo")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Digite o número do seu cargo: 1, 2 ou 3")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nick),
      new ActionRowBuilder().addComponents(cargo)
    );

    await i.showModal(modal);
  });
};