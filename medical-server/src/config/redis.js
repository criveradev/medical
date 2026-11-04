// ═══════════════════════════════════════════════════════════════
// src/config/redis.js — Conexión a Redis con ioredis
// ═══════════════════════════════════════════════════════════════

const Redis  = require('ioredis');
const logger = require('./logger');

// El caché es opcional: si no hay Redis, la app degrada a consultar MongoDB.
// Configuración (en este orden de prioridad):
//   1. REDIS_URL  → una sola cadena (redis:// o rediss:// con TLS). Ideal para
//      proveedores gestionados (Upstash, Render Key Value, Redis Cloud).
//   2. REDIS_HOST → host/puerto/clave por separado.
//   3. ninguna    → caché deshabilitado (no se intenta conectar; evita warnings
//      en bucle, p. ej. en Render sin Redis).
// En test no se conecta (caché no-op).
// Nota: se evita un `return` a nivel de módulo (Node lo tolera pero el
// transformador de Jest/Babel no), usando una asignación condicional.
let client = null;

if (process.env.NODE_ENV === 'test') {
  // sin Redis en test
} else if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
  logger.info('Redis no configurado (sin REDIS_URL ni REDIS_HOST) — caché deshabilitado');
} else {
  let avisado = false; // para no repetir el mismo warning en cada reintento

  // Reintentar con backoff; tras varios intentos fallidos, rendirse (null)
  // para no llenar los logs ni consumir recursos.
  const retryStrategy = (times) => {
    if (times > 5) {
      if (!avisado) {
        logger.warn('Redis no disponible tras varios intentos — caché deshabilitado');
        avisado = true;
      }
      return null; // deja de reintentar
    }
    return Math.min(times * 500, 5000);
  };

  const opciones = {
    retryStrategy,
    enableOfflineQueue:   false, // degradar a sin caché si no está disponible
    lazyConnect:          false,
    maxRetriesPerRequest: 1
  };

  // Con REDIS_URL, ioredis detecta TLS automáticamente si el esquema es rediss://
  client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, opciones)
    : new Redis({
        host:     process.env.REDIS_HOST,
        port:     parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db:       parseInt(process.env.REDIS_DB)   || 0,
        ...opciones
      });

  client.on('connect', () => {
    logger.info('Redis conectado');
    avisado = false;
  });

  client.on('error', (err) => {
    // Loguear solo el primer error para no spamear; no detiene el servidor.
    if (!avisado) {
      logger.warn(`Redis: ${err.message}`);
      avisado = true;
    }
  });
}

module.exports = client;
