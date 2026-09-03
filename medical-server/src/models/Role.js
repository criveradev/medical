// ═══════════════════════════════════════════════════════════════
// src/models/Role.js — Modelo de roles y permisos
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

// Sub-schema de permisos por módulo
const permissionSchema = new mongoose.Schema({
  module: {
    type: String,
    required: true,
    enum: [
      'usuarios', 'pacientes', 'citas', 'calendario',
      'historial', 'pagos', 'reportes', 'departamentos',
      'especialidades', 'doctores', 'resultados'
    ]
  },
  // Acciones permitidas sobre el módulo
  actions: [{
    type: String,
    enum: ['crear', 'leer', 'editar', 'eliminar']
  }]
}, { _id: false });

const roleSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    enum: ['administrador', 'recepcionista', 'enfermero', 'doctor', 'paciente']
  },
  descripcion: { type: String },
  permisos:    [permissionSchema],
  activo:      { type: Boolean, default: true }
}, { timestamps: true });

/**
 * Indica si el rol tiene permiso para una acción sobre un módulo.
 * El administrador siempre tiene acceso total (sin revisar la lista de permisos).
 * @param {string} modulo - Módulo a comprobar (p. ej. "citas").
 * @param {string} accion - Acción ("crear" | "leer" | "editar" | "eliminar").
 * @returns {boolean} true si el rol tiene el permiso.
 */
roleSchema.methods.tienePermiso = function (modulo, accion) {
  if (this.nombre === 'administrador') return true;
  const perm = this.permisos.find(p => p.module === modulo);
  if (!perm) return false;
  return perm.actions.includes(accion);
};

module.exports = mongoose.model('Role', roleSchema);
