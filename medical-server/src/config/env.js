// ═══════════════════════════════════════════════════════════════
// src/config/env.js — Validación de variables de entorno
// ═══════════════════════════════════════════════════════════════

const requeridasBase = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES',
  'CLIENT_URL',
  'AUDIT_LOG_SECRET',
  'MFA_ENCRYPTION_KEY'
];

const requeridasCloudinary = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];
const requeridasSmtp = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
const requeridasResend = ['EMAIL_FROM'];

// Variables opcionales: si faltan, solo se avisa (la app sigue funcionando).
// - SENTRY_DSN: sin él, Sentry queda inactivo (no se reportan errores a terceros).
// - REDIS_*: sin Redis, el caché degrada a consultar MongoDB directamente.
const opcionales = ['SENTRY_DSN'];

const algunaConfigurada = (variables) => variables.some(variable => process.env[variable]);

const validarConfiguracionSegura = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const errores = [];
  const jwtSecret = process.env.JWT_SECRET || '';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';

  if (jwtSecret.length < 32) errores.push('JWT_SECRET debe tener al menos 32 caracteres');
  if (jwtRefreshSecret.length < 32) errores.push('JWT_REFRESH_SECRET debe tener al menos 32 caracteres');
  if (jwtSecret && jwtSecret === jwtRefreshSecret) errores.push('Los secretos JWT deben ser diferentes');
  if ((process.env.AUDIT_LOG_SECRET || '').length < 32) errores.push('AUDIT_LOG_SECRET debe tener al menos 32 caracteres');
  if ((process.env.MFA_ENCRYPTION_KEY || '').length < 32) errores.push('MFA_ENCRYPTION_KEY debe tener al menos 32 caracteres');
  if (!/^\d+(s|m|h|d)$/.test(process.env.JWT_EXPIRES || '')) {
    errores.push('JWT_EXPIRES debe usar el formato <número><s|m|h|d>, por ejemplo 15m');
  }
  if (!['strict', 'lax', 'none'].includes((process.env.COOKIE_SAME_SITE || 'none').toLowerCase())) {
    errores.push('COOKIE_SAME_SITE debe ser strict, lax o none');
  }

  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
    errores.push('BCRYPT_ROUNDS debe ser un entero entre 10 y 15');
  }

  const origenes = (process.env.CLIENT_URL || '').split(',').map(valor => valor.trim());
  if (origenes.some(origen => !origen.startsWith('https://'))) {
    errores.push('CLIENT_URL debe contener únicamente orígenes HTTPS en producción');
  }

  if (errores.length > 0) {
    console.error('❌ Configuración de producción insegura:');
    errores.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
};

/**
 * Verifica que todas las variables de entorno requeridas estén definidas.
 * Si falta alguna, lista las faltantes y termina el proceso (exit 1).
 * @returns {void}
 */
const validarEnv = () => {
  const requeridas = [...requeridasBase];

  if (process.env.NODE_ENV === 'production') {
    requeridas.push(...requeridasCloudinary);

    if (process.env.RESEND_API_KEY) {
      requeridas.push(...requeridasResend);
    } else {
      requeridas.push(...requeridasSmtp);
    }
  } else if (process.env.NODE_ENV !== 'test') {
    if (algunaConfigurada(requeridasCloudinary)) {
      requeridas.push(...requeridasCloudinary);
    }

    if (process.env.RESEND_API_KEY) {
      requeridas.push(...requeridasResend);
    } else if (algunaConfigurada(requeridasSmtp)) {
      requeridas.push(...requeridasSmtp);
    }
  }

  const faltantes = requeridas.filter(v => !process.env[v]);
  if (faltantes.length > 0) {
    console.error('❌ Variables de entorno faltantes:');
    faltantes.forEach(v => console.error(`   - ${v}`));
    console.error('\nAgrega las variables al archivo .env y reinicia el servidor');
    process.exit(1);
  }

  validarConfiguracionSegura();

  // Avisar (sin bloquear) si falta alguna variable opcional.
  const opcFaltantes = opcionales.filter(v => !process.env[v]);
  if (opcFaltantes.length > 0) {
    console.warn(`⚠️  Variables opcionales no definidas: ${opcFaltantes.join(', ')}`);
  }

  console.log('✅ Variables de entorno validadas');
};

module.exports = validarEnv;
