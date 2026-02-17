const mongoose = require("mongoose");

module.exports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB conectado com sucesso");
  } catch (err) {
    console.error("Erro ao conectar MongoDB:", err);
  }
};