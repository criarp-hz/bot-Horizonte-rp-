const mongoose = require("mongoose");
const { EmbedBuilder } = require("discord.js");

const MensagemSchema = new mongoose.Schema({
  canalId: String,
  titulo: String,
  descricao: String,
  dataHora: Date,
  enviada: { type: Boolean, default: false }
});

const Mensagem = mongoose.model("Mensagem", MensagemSchema);

module.exports = client => {

  // Verificador automático
  setInterval(async () => {
    const agora = new Date();

    const mensagens = await Mensagem.find({
      enviada: false,
      dataHora: { $lte: agora }
    });

    for (const msg of mensagens) {
      try {
        const canal = await client.channels.fetch(msg.canalId);

        const embed = new EmbedBuilder()
          .setTitle(msg.titulo)
          .setDescription(msg.descricao)
          .setTimestamp();

        await canal.send({ embeds: [embed] });

        msg.enviada = true;
        await msg.save();

      } catch (err) {
        console.error("Erro ao enviar mensagem agendada:", err);
      }
    }
  }, 30000);

  return {
    criarMensagem: async (canalId, titulo, descricao, dataHora) => {
      await Mensagem.create({ canalId, titulo, descricao, dataHora });
    }
  };
};