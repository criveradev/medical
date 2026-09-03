// ═══════════════════════════════════════════════════════════════
// src/models/User.js — Modelo de usuarios del sistema
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nombre:       { type: String, required: true, trim: true },
  apellido:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  // No exponer el hash por defecto en queries (select: false)
  password:     { type: String, required: true, minlength: 6, select: false },
  roleId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  telefono:     { type: String },
  foto:         { type: String, trim: true }, // URL de Cloudinary (avatar)
  activo:       { type: Boolean, default: true },
  sessionVersion: { type: Number, default: 0, min: 0, select: false },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, default: null, select: false },
  mfaRecoveryCodes: { type: [String], default: [], select: false },
  // Hash del refresh token (nunca se guarda el token en claro). Sirve para
  // invalidarlo en logout sin que un volcado de BD permita reutilizarlo.
  refreshToken: { type: String, default: null, select: false }
}, { timestamps: true });

/**
 * Hook pre-save: hashea el password con bcrypt (coste 12) solo si cambió.
 * IMPORTANTE: usar function() y no arrow function para acceder al `this`.
 * @returns {Promise<void>}
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const rondas = process.env.NODE_ENV === 'test'
    ? 4
    : Math.max(10, Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);
  this.password = await bcrypt.hash(this.password, rondas);
});

/**
 * Compara una contraseña candidata con el hash almacenado.
 * @param {string} candidata - Contraseña en texto plano a verificar.
 * @returns {Promise<boolean>} true si coincide.
 */
userSchema.methods.compararPassword = function (candidata) {
  return bcrypt.compare(candidata, this.password);
};

/**
 * Serialización JSON: omite los campos sensibles (password y refreshToken).
 * @returns {object} El usuario sin campos sensibles.
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.sessionVersion;
  delete obj.mfaSecret;
  delete obj.mfaRecoveryCodes;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
