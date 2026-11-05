const mongoose = require('mongoose');

const codigoRegistroSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  huella: { type: String, required: true },
  intentos: { type: Number, required: true },
  venceEn: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model('CodigoRegistro', codigoRegistroSchema);
