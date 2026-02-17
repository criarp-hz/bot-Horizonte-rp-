const { EmbedBuilder } = require("discord.js");
const Registro = require("../models/Registro");
const config = require("../config");

module.exports = client => {
  client.on("interactionCreate", async i => {
    if (!i.isButton()) return;
    if (!i.customId.startsWith("recusar_")) return;

    await i.deferReply({ ephemeral: true });

    try {
      const userId = i.customId.split("_")[1];
      const registro = await Registro.findOne({ userId });

      if (!registro) {
        return i.editReply("Registro não encontrado.");
      }

      registro.tentativas += 1;
      registro.status = "RECUSADO";
      await registro.save();

      const guild = i.guild;
      const member = await guild.members.fetch(userId);

      const embedUser = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("❌ REGISTRO RECUSADO")
        .setDescription(
          `Seu registro foi recusado.\n\nTentativa: ${registro.tentativas}/3`
        );

      await member.send({ embeds: [embedUser] });

      const embedLog = new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("Registro recusado")
        .addFields(
          { name: "Nick", value: registro.nick, inline: true },
          { name: "Cargo pedido", value: String(registro.cargo), inline: true },
          { name: "Usuário", value: `<@${userId}> (${userId})`, inline: true },
          { name: "Responsável", value: i.user.username, inline: true },
          { name: "Tentativas", value: `${registro.tentativas}/3`, inline: true }
        )
        .setTimestamp();

      const canalLog = guild.channels.cache.get(config.canalRelatorios);
      canalLog.send({ embeds: [embedLog] });

      if (registro.tentativas >= 3) {
        await member.kick("Registro recusado 3 vezes");
      }

      i.editReply("Registro recusado com sucesso.");

    } catch (err) {
      console.error(err);
      i.editReply("Erro ao recusar registro.");
    }
  });
};