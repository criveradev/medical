// ═══════════════════════════════════════════════════════════════
// src/models/Historial.js
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const historialSchema = new mongoose.Schema({
  pacienteId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
  // Una cita solo puede tener un registro de historial
  citaId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true, unique: true },
  doctorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  diagnostico:  { type: String, required: true, trim: true },
  tratamiento:  { type: String, trim: true },
  receta:       { type: String, trim: true },
  observaciones:{ type: String, trim: true },
  proximaCita:  { type: Date }
}, { timestamps: true, collection: 'historial' });

// ── Índices ───────────────────────────────────────────────────
// (citaId ya es único). Historial de un paciente, más reciente primero:
historialSchema.index({ pacienteId: 1, createdAt: -1 });

module.exports = mongoose.model('Historial', historialSchema);
