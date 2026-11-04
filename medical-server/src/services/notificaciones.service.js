// ═══════════════════════════════════════════════════════════════
// src/services/notificaciones.service.js — Socket.io
// Emisión de eventos en tiempo real para el sistema médico
// ═══════════════════════════════════════════════════════════════

const jwt      = require('jsonwebtoken');
const logger   = require('../config/logger');
const User     = require('../models/User');
const Doctor   = require('../models/Doctor');
const Paciente = require('../models/Paciente');
const { ACCESS_COOKIE, parseCookies } = require('../config/auth-cookies');

let io = null;

/**
 * Inicializar el servicio con la instancia de Socket.io.
 *
 * Seguridad:
 *  - Solo se aceptan conexiones con una cookie o accessToken válido.
 *  - El SERVIDOR decide a qué salas se une el socket según la identidad del
 *    usuario (el cliente no puede pedir salas ajenas → evita fugas de datos).
 * @param {import('socket.io').Server} socketIo - Instancia de Socket.io del servidor HTTP.
 * @returns {void}
 */
const inicializar = (socketIo) => {
  io = socketIo;

  // ── Autenticación del handshake ─────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth && socket.handshake.auth.token)
        || parseCookies(socket.request.headers.cookie)[ACCESS_COOKIE];
      if (!token) return next(new Error('No autorizado'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('+sessionVersion').populate('roleId');
      if (!user || !user.activo || !user.roleId || !user.roleId.activo
        || decoded.sv !== user.sessionVersion) return next(new Error('No autorizado'));
      socket.user = user;
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });

  // ── Auto-unión a salas según el rol ─────────────────────────
  io.on('connection', async (socket) => {
    try {
      const rol = socket.user.roleId && socket.user.roleId.nombre;
      if (rol === 'administrador' || rol === 'recepcionista') {
        socket.join('administrador');
      } else if (rol === 'doctor') {
        const d = await Doctor.findOne({ usuarioId: socket.user._id }).select('_id');
        if (d) socket.join(`doctor:${d._id}`);
      } else if (rol === 'paciente') {
        const p = await Paciente.findOne({ usuarioId: socket.user._id }).select('_id');
        if (p) socket.join(`paciente:${p._id}`);
      }
    } catch (err) {
      logger.warn(`Socket join error: ${err.message}`);
    }

    socket.on('disconnect', () => {});
  });
};

// ── Helpers de emisión ────────────────────────────────────────

/**
 * Emitir un evento a todos los clientes conectados.
 * @param {string} evento - Nombre del evento.
 * @param {*} datos - Payload del evento.
 * @returns {void}
 */
const emitirATodos = (evento, datos) => {
  if (!io) return;
  io.emit(evento, datos);
};

/**
 * Emitir un evento a una sala específica (rol, doctor:ID, paciente:ID).
 * @param {string} sala - Nombre de la sala destino.
 * @param {string} evento - Nombre del evento.
 * @param {*} datos - Payload del evento.
 * @returns {void}
 */
const emitirASala = (sala, evento, datos) => {
  if (!io) return;
  io.to(sala).emit(evento, datos);
};

// ── Eventos del sistema médico ────────────────────────────────

/**
 * Notifica una cita nueva a los administradores y al doctor asignado.
 * @param {object} cita - Documento de la cita creada.
 * @returns {void}
 */
const citaCreada = (cita) => {
  emitirASala('administrador', 'cita:nueva', {
    mensaje: 'Nueva cita registrada',
    cita
  });
  if (cita.doctorId) {
    emitirASala(`doctor:${cita.doctorId}`, 'cita:nueva', {
      mensaje: 'Tienes una nueva cita',
      cita
    });
  }
};

/**
 * Notifica un cambio de estado de cita (confirmada/cancelada/completada…)
 * a administradores, doctor y paciente.
 * @param {object} cita - Documento de la cita actualizada.
 * @returns {void}
 */
const citaActualizada = (cita) => {
  const payload = { mensaje: `Cita ${cita.estado}`, cita };

  emitirASala('administrador',           'cita:actualizada', payload);
  if (cita.doctorId)   emitirASala(`doctor:${cita.doctorId}`,     'cita:actualizada', payload);
  if (cita.pacienteId) emitirASala(`paciente:${cita.pacienteId}`, 'cita:actualizada', payload);
};

/**
 * Notifica un pago nuevo a los administradores.
 * @param {object} pago - Documento del pago registrado.
 * @returns {void}
 */
const pagoRegistrado = (pago) => {
  emitirASala('administrador', 'pago:nuevo', {
    mensaje: 'Nuevo pago registrado',
    pago
  });
};

/**
 * Notifica al paciente que tiene un nuevo resultado médico.
 * @param {object} resultado - Documento del resultado subido.
 * @returns {void}
 */
const resultadoSubido = (resultado) => {
  if (resultado.pacienteId) {
    emitirASala(`paciente:${resultado.pacienteId}`, 'resultado:nuevo', {
      mensaje: 'Tienes un nuevo resultado médico disponible',
      resultado
    });
  }
};

/**
 * Notifica al paciente que su historial médico fue actualizado.
 * @param {object} registro - Documento del historial registrado.
 * @returns {void}
 */
const historialRegistrado = (registro) => {
  if (registro.pacienteId) {
    emitirASala(`paciente:${registro.pacienteId}`, 'historial:nuevo', {
      mensaje: 'Tu historial médico fue actualizado',
      registro
    });
  }
};

module.exports = {
  inicializar,
  emitirATodos,
  emitirASala,
  citaCreada,
  citaActualizada,
  pagoRegistrado,
  resultadoSubido,
  historialRegistrado
};
