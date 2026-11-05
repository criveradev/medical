// ═══════════════════════════════════════════════════════════════
// src/config/logger.js — Logger profesional con Winston
// ═══════════════════════════════════════════════════════════════

const winston = require('winston');
const path    = require('path');

// Niveles personalizados incluyendo 'http' para Morgan
const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

const esProduccion = process.env.NODE_ENV === 'production';

const sensitiveKey = /password|pass|token|authorization|cookie|secret|api[-_]?key/i;
const redact = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (sensitiveKey.test(key)) value[key] = '[REDACTED]';
    else redact(value[key], seen);
  }
  return value;
};

const redactionFormat = winston.format((info) => redact(info));

const transportes = [
  new winston.transports.Console({
    format: esProduccion
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf(({ timestamp, level, message, stack }) =>
            stack
              ? `${timestamp} [${level}]: ${message}\n${stack}`
              : `${timestamp} [${level}]: ${message}`
          )
        )
  })
];

// Los proveedores de contenedores recolectan stdout/stderr. Los archivos se
// mantienen solo en desarrollo local, donde sí son persistentes y útiles.
if (!esProduccion) {
  transportes.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log')
    })
  );
}

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (esProduccion ? 'info' : 'http'),
  format: winston.format.combine(
    redactionFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: transportes
});

module.exports = logger;
