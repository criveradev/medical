// ═══════════════════════════════════════════════════════════════
// src/middleware/errores.js — Manejo centralizado de errores
// ═══════════════════════════════════════════════════════════════

const Sentry = require('@sentry/node');
const logger = require('../config/logger');

/**
 * Middleware de manejo centralizado de errores. Reporta a Sentry y a los logs
 * (fuera de test) y traduce errores conocidos de Mongoose/JWT/CORS a respuestas HTTP.
 * @param {Error} err - Error propagado con next(error) desde los controladores.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void} Responde JSON { mensaje } con el código HTTP adecuado.
 */
const errores = (err, req, res, next) => {
  // Enviar error a Sentry solo fuera de tests
  if (process.env.NODE_ENV !== 'test') {
    Sentry.captureException(err);
  }

  if (process.env.NODE_ENV !== 'test') {
    logger.error('Error procesando petición', {
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      status: err.status || 500,
      error: err.message,
    });
  }

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const mensajes = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ mensaje: 'Error de validación', errores: mensajes, requestId: req.requestId });
  }

  // ID de MongoDB con formato inválido
  if (err.name === 'CastError') {
    return res.status(400).json({ mensaje: 'ID inválido', requestId: req.requestId });
  }

  // Violación de índice único
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    return res.status(409).json({ mensaje: `El ${campo} ya está registrado`, requestId: req.requestId });
  }

  // JWT con firma inválida
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ mensaje: 'Token inválido', requestId: req.requestId });
  }

  // JWT expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ mensaje: 'Token expirado', requestId: req.requestId });
  }

  // Error de CORS
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ mensaje: 'Origen no permitido', requestId: req.requestId });
  }

  // Error genérico
  const status = err.status || 500;
  const mensaje = status >= 500 ? 'Error interno del servidor' : err.message;
  res.status(status).json({ mensaje, requestId: req.requestId });
};

module.exports = errores;
