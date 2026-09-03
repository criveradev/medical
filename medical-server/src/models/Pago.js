// ═══════════════════════════════════════════════════════════════
// src/models/Pago.js
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema({
  // Una cita solo puede tener un pago asociado
  citaId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true, unique: true },
  pacienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
  monto:  { type: Number, required: true, min: 0 },
  estado: {
    type:    String,
    enum:    ['pendiente', 'pagado', 'anulado'],
    default: 'pendiente'
  },
  metodo: {
    type:     String,
    enum:     ['efectivo', 'tarjeta', 'transferencia', 'fonasa', 'isapre'],
    required: true
  },
  comprobante:  { type: String, trim: true },
  observaciones:{ type: String, trim: true },
  fechaPago:    { type: Date } // Se llena cuando estado cambia a 'pagado'
}, { timestamps: true, collection: 'pagos' });

// ── Índices ───────────────────────────────────────────────────
// (citaId ya es único). Listado/filtros frecuentes:
pagoSchema.index({ pacienteId: 1, createdAt: -1 });
pagoSchema.index({ estado: 1, createdAt: -1 });

module.exports = mongoose.model('Pago', pagoSchema);
