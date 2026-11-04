// ═══════════════════════════════════════════════════════════════
// instrument.js — Inicialización de Sentry
// DEBE ser el PRIMER archivo en cargarse (antes de http, express,
// mongoose, socket.io, etc.) para que la auto-instrumentación de
// Sentry v10 quede registrada correctamente.
// ═══════════════════════════════════════════════════════════════

// Cargar variables de entorno aquí, antes que cualquier otra cosa,
// para que SENTRY_DSN esté disponible al inicializar.
require('dotenv').config();

const Sentry = require('@sentry/node');
const { version } = require('./package.json');

// No inicializar durante los tests para no contaminar los reportes.
if (process.env.NODE_ENV !== 'test') {
    if (!process.env.SENTRY_DSN) {
        // Aviso explícito: sin DSN, Sentry queda inactivo en silencio.
        console.warn('⚠️  SENTRY_DSN no está definido — Sentry NO reportará errores');
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION || `medical-server@${version}`,
        // En una app de salud NO enviar PII (IPs, cabeceras, cuerpos) a un tercero.
        // Evita filtrar emails, RUT, tokens y datos clínicos a Sentry.
        sendDefaultPii: false
    });
}
