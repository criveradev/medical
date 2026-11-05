// ═══════════════════════════════════════════════════════════════
// server.js — Punto de entrada del servidor
// Sistema de citas médicas — MEAN Stack
//
// Orden de arranque:
//   1. Cargar .env
//   2. Validar variables de entorno requeridas
//   3. Crear servidor HTTP sobre Express
//   4. Montar Socket.io para notificaciones en tiempo real
//   5. Conectar MongoDB
//   6. Iniciar recordatorios automáticos de citas
//   7. Escuchar en el puerto configurado
// ═══════════════════════════════════════════════════════════════

// ⚠️ DEBE ir PRIMERO: inicializa Sentry (y carga dotenv) antes que
// http, express, mongoose y socket.io, para que la auto-instrumentación
// de Sentry v10 quede registrada y capture los errores.
require('./instrument');

const http               = require('http');
const { Server }         = require('socket.io');
const mongoose           = require('mongoose');
const app                = require('./src/app');
const logger             = require('./src/config/logger');
const iniciarRecordatorios = require('./src/services/recordatorios.service');
const notificaciones       = require('./src/services/notificaciones.service');
const validarEnv           = require('./src/config/env');
const { origenPermitido }  = require('./src/config/cors');
const redisClient          = require('./src/config/redis');

// Detener el proceso si faltan variables críticas (.env incompleto)
validarEnv();

// ── Servidor HTTP ─────────────────────────────────────────────
// Se crea sobre Express para poder compartirlo con Socket.io
const httpServer = http.createServer(app);
let reminderTask = null;
let shuttingDown = false;

// ── Socket.io ─────────────────────────────────────────────────
// Monta WebSocket sobre el mismo puerto que la API REST
const io = new Server(httpServer, {
  cors: {
    // Misma lógica de orígenes que la API REST (ver src/config/cors.js)
    origin: (origin, callback) => {
      if (!origin || origenPermitido(origin)) return callback(null, true);
      callback(new Error(`Origen no permitido por CORS (socket): ${origin}`));
    },
    methods:     ['GET', 'POST'],
    credentials: true
  }
});

// Pasar la instancia de io al servicio de notificaciones
// para que los controladores puedan emitir eventos
notificaciones.inicializar(io);

// ── MongoDB ───────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('MongoDB conectado');

    // Cron jobs de recordatorios (se inician tras conectar a BD)
    reminderTask = iniciarRecordatorios();

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
      logger.info(`Servidor en http://localhost:${PORT}`);
      logger.info(`Documentación en http://localhost:${PORT}/api/v1/docs`);
      logger.info(`Socket.io activo en ws://localhost:${PORT}`);
    });
  })
  .catch(err => {
    logger.error(`Error MongoDB: ${err.message}`);
    process.exit(1);
  });

const closeHttpServer = () => new Promise((resolve, reject) => {
  if (!httpServer.listening) return resolve();
  httpServer.close(error => error ? reject(error) : resolve());
});

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Apagado controlado iniciado (${signal})`);

  const timeoutMs = Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || 25000);
  const forceTimer = setTimeout(() => {
    logger.error('Tiempo de apagado agotado; cerrando conexiones restantes');
    httpServer.closeAllConnections();
    process.exit(1);
  }, timeoutMs);
  forceTimer.unref();

  try {
    if (reminderTask) reminderTask.stop();
    io.disconnectSockets(true);
    await closeHttpServer();

    if (redisClient && redisClient.status !== 'end') {
      await redisClient.quit();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    clearTimeout(forceTimer);
    logger.info('Apagado controlado completado');
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceTimer);
    logger.error(`Error durante el apagado: ${error.message}`);
    process.exit(1);
  }
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('unhandledRejection', error => {
  logger.error('Promesa rechazada no controlada', {
    error: error instanceof Error ? error.stack : String(error)
  });
  shutdown('unhandledRejection', 1);
});
process.once('uncaughtException', error => {
  logger.error('Excepción no controlada', { error: error.stack });
  shutdown('uncaughtException', 1);
});
