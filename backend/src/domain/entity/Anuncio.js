const mongoose = require('mongoose');

const anuncioSchema = new mongoose.Schema({
  ml_id:        { type: String, unique: true, sparse: true },
  titulo:       { type: String, required: true },
  preco:        { type: Number, required: true },
  estoque:      { type: Number, required: true, default: 0 },
  status:       { type: String, enum: ['active', 'paused', 'closed', 'under_review'], default: 'active' },
  categoria:      { type: String, required: true },
  categoria_nome: { type: String },
  permalink:      { type: String },
  descricao:    { type: String },
  condicao:     { type: String, enum: ['new', 'used'], default: 'new' },
  tipo_listagem:{ type: String, default: 'gold_special' },
  fotos:        [{ type: String }],
  versao:       { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Anuncio', anuncioSchema);
