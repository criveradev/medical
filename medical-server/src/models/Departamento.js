// ═══════════════════════════════════════════════════════════════
// src/models/Departamento.js
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const departamentoSchema = new mongoose.Schema({
  nombre:      { type: String, required: true, unique: true, trim: true },
  descripcion: { type: String, trim: true },
  activo:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Departamento', departamentoSchema);
