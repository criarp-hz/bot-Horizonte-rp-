const { EmbedBuilder } = require("discord.js");
const Registro = require("../models/Registro");
const config = require("../config");

module.exports = client => {
  client.on("interactionCreate", async i => {

    if (!i.isModalSubmit()) return;
    if (i.customId !== "modal_registro") return;

    await i.deferReply({ ephemeral: true });

    const nick = i.fields.getTextInputValue("nick");
    const cargo = i.fields.getTextInputValue("cargo");

    if (!["1","2","3"].includes(cargo)) {
      return i.editReply("❌ Cargo inválido. Use 1, 2 ou 3.");
    }

    const registro = await Registro.create({
      userId: i.user.id,
      username: i.user.username,
      nick,
      cargo,
      status: "PENDENTE"
    });

    const embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle("📋 NOVO REGISTRO")
      .addFields(
        { name: "Nick", value: nick },
        { name: "Cargo", value: cargo },
        { name: "Usuário", value: `<@${i.user.id}>` },
        { name: "Status", value: "PENDENTE" }
      )
      .setTimestamp();

    const canal = await i.guild.channels.fetch(config.canalRelatorios);
    await canal.send({ embeds: [embed] });

    await i.editReply("Registro enviado com sucesso!");
  });
};