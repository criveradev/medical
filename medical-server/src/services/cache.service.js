// ═══════════════════════════════════════════════════════════════
// src/services/cache.service.js — Caché con Redis
//
// Uso básico:
//   const data = await cache.get('clave', () => fetchData(), 300);
//
// Si Redis no está disponible, ejecuta el callback sin cachear
// (degradación graceful — el servidor sigue funcionando)
// ═══════════════════════════════════════════════════════════════

const redis  = require('../config/redis');
const logger = require('../config/logger');

// TTLs predefinidos en segundos
const TTL = {
  CORTO:   60,          // 1 minuto  — datos que cambian frecuentemente
  MEDIO:   5  * 60,     // 5 minutos — datos semi-estáticos
  LARGO:   30 * 60,     // 30 minutos — datos muy estáticos
  DIA:     24 * 60 * 60 // 24 horas  — configuración que rara vez cambia
};

/**
 * Obtener dato de caché o ejecutar el callback para generarlo.
 *
 * @param {string}   clave   - Clave única en Redis
 * @param {Function} fn      - Función async que obtiene el dato si no está en caché
 * @param {number}   ttl     - Tiempo de vida en segundos (default: 5 min)
 * @returns {Promise<any>}   - El dato (de caché o de la BD)
 */
const get = async (clave, fn, ttl = TTL.MEDIO) => {
  // Si Redis no está disponible, ejecutar directamente sin caché
  if (!redis) return fn();

  try {
    const cached = await redis.get(clave);
    if (cached) {
      logger.info(`[CACHE HIT]  ${clave}`);
      return JSON.parse(cached);
    }

    // No estaba en caché — obtener de la fuente y guardar
    logger.info(`[CACHE MISS] ${clave} → consultando MongoDB`);
    const datos = await fn();
    await redis.setex(clave, ttl, JSON.stringify(datos));
    return datos;
  } catch (error) {
    // Si Redis falla, continuar sin caché
    logger.warn(`[CACHE ERR] ${clave} → degradando a MongoDB: ${error.message}`);
    return fn();
  }
};

/**
 * Eliminar una clave del caché (invalidar tras una escritura).
 *
 * @param {string|string[]} claves - Clave o array de claves a eliminar
 */
const del = async (claves) => {
  if (!redis) return;
  try {
    const lista = Array.isArray(claves) ? claves : [claves];
    if (lista.length) await redis.del(...lista);
  } catch (error) {
    logger.warn(`[CACHE ERR] No se pudo invalidar ${lista.join(', ')}: ${error.message}`);
  }
};

/**
 * Eliminar todas las claves que coincidan con un patrón.
 * Útil para invalidar un grupo de claves (ej: 'doctores:*').
 *
 * @param {string} patron - Patrón glob (ej: 'doctores:*')
 */
const delPorPatron = async (patron) => {
  if (!redis) return;
  try {
    const claves = await redis.keys(patron);
    if (claves.length) await redis.del(...claves);
  } catch (error) {
    logger.warn(`[CACHE ERR] No se pudo invalidar el patrón ${patron}: ${error.message}`);
  }
};

/**
 * Guardar un dato directamente en caché.
 *
 * @param {string} clave
 * @param {any}    datos
 * @param {number} ttl   - Segundos (default: 5 min)
 */
const set = async (clave, datos, ttl = TTL.MEDIO) => {
  if (!redis) return;
  try {
    await redis.setex(clave, ttl, JSON.stringify(datos));
  } catch (error) {
    logger.warn(`[CACHE ERR] No se pudo guardar ${clave}: ${error.message}`);
  }
};

module.exports = { get, set, del, delPorPatron, TTL };
