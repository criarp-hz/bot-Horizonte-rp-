const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "painel",
  description: "Abrir painel de registro",

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📋 SISTEMA DE REGISTRO")
      .setDescription(
        "Bem-vindo ao sistema de registro do servidor!\n\n" +
        "**Use apenas o cargo do seu setor.**\n\n" +
        "⚠ Usar cargo incorreto pode causar:\n" +
        "• Erros no registro\n" +
        "• Problemas de permissão\n" +
        "• Penalidades administrativas\n\n" +
        "✅ Em caso de dúvida, procure um responsável."
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_registro")
        .setLabel("Registrar-se")
        .setEmoji("📋")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};