// ═══════════════════════════════════════════════════════════════
// src/models/Resultado.js
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const resultadoSchema = new mongoose.Schema({
  pacienteId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
  citaId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true },
  doctorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  tipo: {
    type:     String,
    enum:     ['examen_sangre', 'radiografia', 'ecografia', 'electrocardiograma', 'otro'],
    required: true
  },
  nombre:       { type: String, required: true, trim: true },
  descripcion:  { type: String, trim: true },
  // `archivo` se conserva para registros antiguos. Las cargas nuevas guardan el
  // public ID autenticado y solo se exponen mediante una URL firmada temporal.
  archivo:      { type: String, trim: true },
  archivoPublicId: { type: String, trim: true, select: false },
  archivoResourceType: { type: String, enum: ['image', 'raw'], default: 'image', select: false },
  archivoFormat: { type: String, trim: true, select: false },
  observaciones:{ type: String, trim: true },
  fecha:        { type: Date, default: Date.now }
}, { timestamps: true, collection: 'resultados' });

// ── Índices ───────────────────────────────────────────────────
resultadoSchema.index({ pacienteId: 1, createdAt: -1 });
resultadoSchema.index({ citaId: 1 });

module.exports = mongoose.model('Resultado', resultadoSchema);
