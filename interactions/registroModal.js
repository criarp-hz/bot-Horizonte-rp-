const { EmbedBuilder } = require("discord.js");
const Registro = require("../models/Registro");
const config = require("../config");

module.exports = client => {
  client.on("interactionCreate", async i => {

    if (!i.isModalSubmit()) return;
    if (i.customId !== "modal_registro") return;

    await i.deferReply({ ephemeral: true });

    try {
      const nick = i.fields.getTextInputValue("nick");
      const cargo = i.fields.getTextInputValue("cargo");

      if (!["1","2","3"].includes(cargo)) {
        return i.editReply("❌ Cargo inválido. Use apenas 1, 2 ou 3.");
      }

      const registro = await Registro.findOneAndUpdate(
        { userId: i.user.id },
        {
          userId: i.user.id,
          username: i.user.username,
          nick,
          cargo: Number(cargo),
          setor: cargo == 1 ? "SUPORTE" : "SEGURANÇA",
          status: "PENDENTE"
        },
        { upsert: true, new: true }
      );

      // Embed pro canal de relatórios
      const embedRelatorio = new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("📋 NOVO REGISTRO")
        .addFields(
          { name: "Nick", value: registro.nick, inline: true },
          { name: "Cargo", value: String(registro.cargo), inline: true },
          { name: "Usuário", value: `<@${registro.userId}> (${registro.userId})`, inline: true },
          { name: "Setor", value: registro.setor, inline: true },
          { name: "Status", value: "PENDENTE", inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "Sistema Horizonte Roleplay" });

      const row = {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Aceitar",
            custom_id: `aceitar_${registro.userId}`
          },
          {
            type: 2,
            style: 4,
            label: "Recusar",
            custom_id: `recusar_${registro.userId}`
          },
          {
            type: 2,
            style: 1,
            label: "Editar",
            custom_id: `editar_${registro.userId}`
          }
        ]
      };

      const canal = await i.guild.channels.fetch(config.canalRelatorios);
      await canal.send({ embeds: [embedRelatorio], components: [row] });

      // Embed pro usuário
      const embedUser = new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("📋 SEU REGISTRO FOI ENVIADO")
        .setDescription("Status: **PENDENTE**\nAguarde a análise da administração.")
        .addFields(
          { name: "Nick", value: registro.nick, inline: true },
          { name: "Cargo", value: String(registro.cargo), inline: true },
          { name: "Setor", value: registro.setor, inline: true }
        )
        .setTimestamp();

      await i.user.send({ embeds: [embedUser] });

      i.editReply("Registro enviado com sucesso.");

    } catch (err) {
      console.error(err);
      i.editReply("Erro ao processar registro.");
    }
  });
};