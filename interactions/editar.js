const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const Registro = require("../models/Registro");
const config = require("../config");

module.exports = client => {
  client.on("interactionCreate", async i => {
    if (!i.isButton()) return;
    if (!i.customId.startsWith("editar_")) return;

    await i.deferReply({ ephemeral: true });

    try {
      const userId = i.customId.split("_")[1];
      const registro = await Registro.findOne({ userId });

      if (!registro) {
        return i.editReply("Registro não encontrado.");
      }

      const guild = i.guild;
      const memberEditor = await guild.members.fetch(i.user.id);
      const memberTarget = await guild.members.fetch(userId);

      // Maior cargo do editor
      const highestEditorRole = memberEditor.roles.highest.position;
      const highestTargetRole = memberTarget.roles.highest.position;

      if (highestEditorRole <= highestTargetRole) {
        return i.editReply("❌ Você não pode editar alguém com cargo igual ou maior que o seu.");
      }

      // Embed do painel de edição
      const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("🛠️ PAINEL DE EDIÇÃO DE REGISTRO")
        .setDescription(
          `Editando o registro de <@${userId}>\n\n` +
          `Nick atual: **${registro.nick}**\n` +
          `Cargo atual: **${registro.cargo}**\n\n` +
          "Escolha uma opção abaixo:"
        );

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`editar_cargo_${userId}`)
          .setLabel("Mudar Cargo")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`editar_nick_${userId}`)
          .setLabel("Mudar Nick")
          .setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmar_edicao_${userId}`)
          .setLabel("Confirmar")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`cancelar_edicao_${userId}`)
          .setLabel("Cancelar")
          .setStyle(ButtonStyle.Danger)
      );

      await i.editReply({
        embeds: [embed],
        components: [row1, row2]
      });

    } catch (err) {
      console.error(err);
      i.editReply("Erro ao abrir painel de edição.");
    }
  });
};