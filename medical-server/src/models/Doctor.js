// ═══════════════════════════════════════════════════════════════
// src/models/Doctor.js
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

// Sub-schema para horarios de atención por día
const horarioSchema = new mongoose.Schema({
  dia: {
    type:     String,
    required: true,
    enum:     ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
  },
  horaInicio: { type: String, required: true }, // formato "08:00"
  horaFin:    { type: String, required: true }, // formato "17:00"
  activo:     { type: Boolean, default: true }
}, { _id: false });

const doctorSchema = new mongoose.Schema({
  // Referencia al usuario del sistema (contiene nombre, email, etc.)
  usuarioId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    unique:   true
  },
  especialidadId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Especialidad',
    required: true
  },
  matricula:        { type: String, required: true, unique: true, trim: true },
  duracionConsulta: { type: Number, default: 30 }, // duración en minutos
  horarios:         [horarioSchema],
  foto:             { type: String, trim: true },  // URL de Cloudinary
  activo:           { type: Boolean, default: true }
}, { timestamps: true, collection: 'doctores' });

module.exports = mongoose.model('Doctor', doctorSchema);
