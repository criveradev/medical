// ═══════════════════════════════════════════════════════════════
// src/models/Paciente.js
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const pacienteSchema = new mongoose.Schema({
  // Referencia al usuario del sistema
  usuarioId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    unique:   true
  },
  rut:             { type: String, required: true, unique: true, trim: true },
  fechaNacimiento: { type: Date, required: true },
  genero:          { type: String, enum: ['masculino', 'femenino', 'otro'], required: true },
  direccion:       { type: String, trim: true },
  prevision: {
    type:    String,
    enum:    ['fonasa', 'isapre', 'particular', 'otro'],
    default: 'fonasa'
  },
  // Datos de contacto en caso de emergencia
  contactoEmergencia: {
    nombre:     { type: String, trim: true },
    telefono:   { type: String, trim: true },
    parentesco: { type: String, trim: true }
  },
  foto:   { type: String, trim: true }, // URL de Cloudinary
  activo: { type: Boolean, default: true }
}, { timestamps: true, collection: 'pacientes' });

module.exports = mongoose.model('Paciente', pacienteSchema);
