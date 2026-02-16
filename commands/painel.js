const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = client => {
  client.on("interactionCreate", async i => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName !== "painel") return;

    await i.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("📋 SISTEMA DE REGISTRO")
      .setDescription("Clique abaixo para iniciar.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("iniciar_registro")
        .setLabel("Registrar-se")
        .setStyle(ButtonStyle.Primary)
    );

    i.editReply({ embeds: [embed], components: [row] });
  });
};