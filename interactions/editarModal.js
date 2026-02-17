const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require("discord.js");

const Registro = require("../models/Registro");
const config = require("../config");

// cache temporário das edições
const edicoesPendentes = new Map();

module.exports = client => {
  client.on("interactionCreate", async i => {

    // ABRIR MODAL DE CARGO
    if (i.isButton() && i.customId.startsWith("editar_cargo_")) {
      const userId = i.customId.split("_")[2];

      const modal = new ModalBuilder()
        .setCustomId(`modal_cargo_${userId}`)
        .setTitle("Editar Cargo");

      const input = new TextInputBuilder()
        .setCustomId("novoCargo")
        .setLabel("Novo cargo (1 a 6)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return i.showModal(modal);
    }

    // ABRIR MODAL DE NICK
    if (i.isButton() && i.customId.startsWith("editar_nick_")) {
      const userId = i.customId.split("_")[2];

      const modal = new ModalBuilder()
        .setCustomId(`modal_nick_${userId}`)
        .setTitle("Editar Nick");

      const input = new TextInputBuilder()
        .setCustomId("novoNick")
        .setLabel("Novo nick")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return i.showModal(modal);
    }

    // RECEBE NOVO CARGO
    if (i.isModalSubmit() && i.customId.startsWith("modal_cargo_")) {
      await i.deferReply({ ephemeral: true });

      const userId = i.customId.split("_")[2];
      const novoCargo = i.fields.getTextInputValue("novoCargo");

      if (!["1","2","3","4","5","6"].includes(novoCargo)) {
        return i.editReply("Cargo inválido.");
      }

      const registro = await Registro.findOne({ userId });
      if (!registro) return i.editReply("Registro não encontrado.");

      if (!edicoesPendentes.has(userId)) edicoesPendentes.set(userId, {});
      edicoesPendentes.get(userId).cargo = Number(novoCargo);

      i.editReply("Cargo atualizado no painel. Clique em Confirmar.");
    }

    // RECEBE NOVO NICK
    if (i.isModalSubmit() && i.customId.startsWith("modal_nick_")) {
      await i.deferReply({ ephemeral: true });

      const userId = i.customId.split("_")[2];
      const novoNick = i.fields.getTextInputValue("novoNick");

      if (!edicoesPendentes.has(userId)) edicoesPendentes.set(userId, {});
      edicoesPendentes.get(userId).nick = novoNick;

      i.editReply("Nick atualizado no painel. Clique em Confirmar.");
    }

    // CONFIRMAR EDIÇÃO
    if (i.isButton() && i.customId.startsWith("confirmar_edicao_")) {
      await i.deferReply({ ephemeral: true });

      const userId = i.customId.split("_")[2];
      const edicao = edicoesPendentes.get(userId);
      if (!edicao) return i.editReply("Nenhuma edição pendente.");

      const registro = await Registro.findOne({ userId });
      const guild = i.guild;
      const member = await guild.members.fetch(userId);

      const antigoCargo = registro.cargo;
      const antigoNick = registro.nick;

      if (edicao.cargo) {
        const roleOld = guild.roles.cache.get(config.cargos[antigoCargo]);
        const roleNew = guild.roles.cache.get(config.cargos[edicao.cargo]);

        if (roleOld) await member.roles.remove(roleOld);
        if (roleNew) await member.roles.add(roleNew);

        registro.cargo = edicao.cargo;
      }

      if (edicao.nick) {
        await member.setNickname(`『Ⓗ¹』 ${edicao.nick}`);
        registro.nick = edicao.nick;
      }

      registro.status = "EDITADO";
      await registro.save();

      edicoesPendentes.delete(userId);

      const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("Registro editado com sucesso")
        .addFields(
          { name: "Nick antes", value: antigoNick, inline: true },
          { name: "Nick novo", value: registro.nick, inline: true },
          { name: "Cargo antes", value: String(antigoCargo), inline: true },
          { name: "Cargo novo", value: String(registro.cargo), inline: true },
          { name: "Responsável", value: i.user.username, inline: true }
        )
        .setTimestamp();

      const canalLog = guild.channels.cache.get(config.canalRelatorios);
      canalLog.send({ embeds: [embed] });

      i.editReply("Edição aplicada com sucesso.");
    }

    // CANCELAR EDIÇÃO
    if (i.isButton() && i.customId.startsWith("cancelar_edicao_")) {
      const userId = i.customId.split("_")[2];
      edicoesPendentes.delete(userId);
      i.reply({ content: "Edição cancelada.", ephemeral: true });
    }

  });
};