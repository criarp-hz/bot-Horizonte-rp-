const mongoose = require("mongoose");

const Registro = new mongoose.Schema({
  userId: String,
  username: String,
  nick: String,
  cargo: Number,
  setor: String,
  status: { type: String, default: "PENDENTE" },
  tentativas: { type: Number, default: 0 },
  criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Registro", Registro);