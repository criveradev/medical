// ═══════════════════════════════════════════════════════════════
// src/app.js — Configuración de Express
// Middlewares de seguridad, CORS, rutas y manejo de errores
// ═══════════════════════════════════════════════════════════════

// NOTA: Sentry se inicializa en el entry point (server.js → ./instrument),
// que debe cargarse antes que cualquier otra librería para que la
// auto-instrumentación de Sentry v10 funcione. No inicializar aquí.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const { version } = require('../package.json');
const { origenPermitido } = require('./config/cors');
const morganMW = require('./middleware/morgan');
const sanitizar = require('./middleware/sanitizar');
const errores = require('./middleware/errores');
const { limiterGeneral } = require('./middleware/rateLimiters');
const { authenticate, requireRole } = require('./middleware/auth');
const { Sentry } = require('./config/sentry');
const apiRouter = require('./routes');
const { csrfProtection } = require('./config/auth-cookies');
const requestContext = require('./middleware/request-context');
const audit = require('./middleware/audit');

const app = express();

app.use(requestContext);

// ── Proxy de confianza ────────────────────────────────────────
// En producción la app corre detrás de un reverse proxy (Render, etc.) que
// agrega X-Forwarded-For. Sin esto, express-rate-limit vería a todos los
// usuarios como una sola IP y los limitaría en conjunto.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Seguridad HTTP ────────────────────────────────────────────
app.use(helmet());       // Headers de seguridad (CSP, HSTS, etc.)
app.use(compression());  // Compresión gzip de respuestas

// Rate limit general para todas las versiones publicadas.
app.use('/api', limiterGeneral);

// ── CORS ──────────────────────────────────────────────────────
// Permite los orígenes configurados en CLIENT_URL (frontend). La lógica de
// orígenes vive en ./config/cors y la comparte Socket.io (server.js).
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origen (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (origenPermitido(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'Idempotency-Replayed'],
  credentials: true
}));

// ── Sanitización ──────────────────────────────────────────────
// Previene inyección NoSQL eliminando operadores $ de body y query
app.use(sanitizar);

// Las sesiones de navegador usan cookies HttpOnly; toda mutación con cookies
// exige el token de doble envío emitido por /api/v1/auth/csrf.
app.use('/api/v1', audit);
app.use('/api/v1', csrfProtection);

// ── Logging y archivos estáticos ──────────────────────────────
app.use(morganMW);
// Archivos locales (fallback; producción usa Cloudinary). Protegido: solo
// usuarios autenticados pueden descargar, ya que pueden contener datos clínicos.
app.use('/uploads', authenticate, requireRole('administrador'), express.static('uploads'));

// ── Raíz ──────────────────────────────────────────────────────
// Responde 200 en / para health checks por defecto y para que abrir el dominio
// en el navegador no devuelva 404.
app.get('/', (req, res) => {
  res.json({ servicio: 'Medical API', estado: 'ok' });
});

// ── Health check ──────────────────────────────────────────────
// Endpoint simple para verificar que el servicio está vivo (deploys, uptime).
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version, timestamp: new Date().toISOString() });
});

// Liveness solo comprueba que el proceso HTTP responde.
app.get('/health/live', (req, res) => {
  res.json({ status: 'ok', version, timestamp: new Date().toISOString() });
});

// Readiness impide enviar tráfico a una instancia que perdió MongoDB.
app.get('/health/ready', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  res.status(mongoReady ? 200 : 503).json({
    status: mongoReady ? 'ready' : 'not_ready',
    version,
    dependencies: { mongodb: mongoReady ? 'up' : 'down' },
    timestamp: new Date().toISOString()
  });
});

// ── API versionada ────────────────────────────────────────────
// routes/index.js define las versiones publicadas y cada versión compone sus
// propios recursos y documentación.
app.use('/api', apiRouter);

// ── 404 — Ruta no encontrada ──────────────────────────────────
// Devuelve JSON (no el HTML por defecto de Express) y conserva las cabeceras
// CORS que ya puso el middleware de cors para los orígenes permitidos.
app.use((req, res) => {
  res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Manejo de errores ─────────────────────────────────────────
// Sentry debe ir ANTES del middleware de errores propio
if (process.env.NODE_ENV !== 'test') {
  Sentry.setupExpressErrorHandler(app);
}
app.use(errores); // Captura todos los next(error) de los controladores

module.exports = app;
