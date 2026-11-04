// ═══════════════════════════════════════════════════════════════
// src/models/Especialidad.js
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const especialidadSchema = new mongoose.Schema({
  nombre:         { type: String, required: true, trim: true },
  descripcion:    { type: String, trim: true },
  // Referencia al departamento al que pertenece
  departamentoId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Departamento',
    required: true
  },
  activo: { type: Boolean, default: true }
}, { timestamps: true, collection: 'especialidades' });

module.exports = mongoose.model('Especialidad', especialidadSchema);
