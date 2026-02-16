const mongoose = require('mongoose');

// Define a estrutura de dados para cada registro de membro
const registroSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // ID do usuário no Discord
    userName: { type: String },               // Nome de usuário (tag)
    guildId: { type: String },                // ID do servidor
    nick: { type: String },                   // Nickname solicitado no formulário
    cargoNum: { type: String },               // Número do cargo (1 a 6)
    status: { 
        type: String, 
        default: 'PENDENTE',
        enum: ['PENDENTE', 'APROVADO', 'RECUSADO', 'REPROVADO'] 
    }, 
    tentativas: { type: Number, default: 0 }, // Contador de tentativas (máximo 3)
    responsavelId: { type: String },          // Nome/ID de quem avaliou o registro
    dataCriacao: { type: Date, default: Date.now },
    
    // IDs das mensagens para permitir edição dinâmica dos relatórios
    mensagemPainelId: { type: String },       // Mensagem no canal da Staff
    mensagemStatusId: { type: String },       // Mensagem no canal de status do usuário
    
    // Histórico para o sistema de edição
    nickAntigo: { type: String },
    cargoAntigo: { type: String },
    setor: { type: String }                   // Segurança ou Suporte
});

// Exporta o modelo para ser usado no index.js
module.exports = mongoose.model('Registro', registroSchema);
