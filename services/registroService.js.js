const Registro = require("../models/Registro");

module.exports = {

  async aprovar(userId) {
    const registro = await Registro.findOne({ userId });
    if (!registro) throw new Error("Registro não encontrado");

    registro.status = "APROVADO";
    registro.tentativas = 0;
    await registro.save();

    return registro;
  },

  async recusar(userId) {
    const registro = await Registro.findOne({ userId });
    if (!registro) throw new Error("Registro não encontrado");

    registro.status = "RECUSADO";
    registro.tentativas += 1;
    await registro.save();

    return registro;
  },

  async reprovar(userId) {
    const registro = await Registro.findOne({ userId });
    if (!registro) throw new Error("Registro não encontrado");

    registro.status = "REPROVADO";
    await registro.save();

    return registro;
  },

  async editar(userId, novosDados) {
    const registro = await Registro.findOne({ userId });
    if (!registro) throw new Error("Registro não encontrado");

    if (novosDados.nick) registro.nick = novosDados.nick;
    if (novosDados.cargo) registro.cargo = novosDados.cargo;

    registro.status = "EDITADO";
    await registro.save();

    return registro;
  }

};