const { EmbedBuilder } = require("discord.js");
const Registro = require("../models/Registro");
const config = require("../config");

module.exports = client => {
  client.on("interactionCreate", async i => {
    if (!i.isButton()) return;
    if (!i.customId.startsWith("aceitar_")) return;

    await i.deferReply({ ephemeral: true });

    try {
      const userId = i.customId.split("_")[1];
      const registro = await Registro.findOne({ userId });

      if (!registro) {
        return i.editReply("Registro não encontrado.");
      }

      const guild = i.guild;
      const member = await guild.members.fetch(userId);

      const cargoId = config.cargos[registro.cargo];
      const role = guild.roles.cache.get(cargoId);

      if (!role) {
        return i.editReply("Cargo não existe.");
      }

      await member.roles.add(role);
      await member.setNickname(`『Ⓗ¹』 ${registro.nick}`);

      registro.status = "APROVADO";
      await registro.save();

      const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("✅ REGISTRO APROVADO")
        .setDescription(`Seu registro foi aprovado.`)
        .addFields(
          { name: "Nick", value: registro.nick, inline: true },
          { name: "Cargo", value: role.name, inline: true }
        );

      await member.send({ embeds: [embed] });

      const canalLog = guild.channels.cache.get(config.canalRelatorios);
      canalLog.send({ embeds: [embed] });

      i.editReply("Registro aprovado com sucesso.");

    } catch (err) {
      console.error(err);
      i.editReply("Erro ao aprovar registro.");
    }
  });
};