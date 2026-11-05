// ═══════════════════════════════════════════════════════════════
// src/middleware/validar.js — Captura errores de express-validator
// ═══════════════════════════════════════════════════════════════

const { validationResult } = require('express-validator');

/**
 * Middleware que recoge los errores de express-validator acumulados por las
 * reglas previas y, si los hay, corta con 400.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void} 400 { errores } si la validación falla; continúa si pasa.
 */
const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }
  next();
};

module.exports = validar;
