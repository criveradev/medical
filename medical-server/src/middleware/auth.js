// ═══════════════════════════════════════════════════════════════
// src/middleware/auth.js — Autenticación y autorización JWT
// ═══════════════════════════════════════════════════════════════

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const Paciente = require('../models/Paciente');
const Doctor   = require('../models/Doctor');
const { ACCESS_COOKIE, parseCookies } = require('../config/auth-cookies');

/**
 * Middleware: verifica el JWT del header Authorization y carga `req.user` y
 * `req.role` desde la BD. Se usa en todas las rutas protegidas.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 401 si el token falta, es inválido o el usuario está inactivo.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = parseCookies(req.headers.cookie)[ACCESS_COOKIE];
    const token = bearerToken || cookieToken;

    if (!token)
      return res.status(401).json({ mensaje: 'Token no proporcionado' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cargar usuario con su rol desde la BD
    const user = await User.findById(decoded.id).select('+sessionVersion').populate('roleId');

    if (!user || !user.activo || !user.roleId || !user.roleId.activo || decoded.sv !== user.sessionVersion)
      return res.status(401).json({ mensaje: 'Usuario no autorizado' });

    // Adjuntar usuario y rol al request para uso en controladores
    req.user = user;
    req.role = user.roleId;
    req.authSource = bearerToken ? 'bearer' : 'cookie';
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

/**
 * Fábrica de middleware de permisos (RBAC): verifica si el rol del usuario tiene
 * permiso sobre un módulo y una acción.
 * @param {string} modulo - Módulo (p. ej. "pacientes", "citas").
 * @param {string} accion - Acción ("crear" | "leer" | "editar" | "eliminar").
 * @returns {import('express').RequestHandler} Middleware que responde 403 si no hay permiso.
 * @example router.get('/', authenticate, authorize('pacientes', 'leer'), controller)
 */
const authorize = (modulo, accion) => (req, res, next) => {
  if (!req.role)
    return res.status(403).json({ mensaje: 'Sin rol asignado' });

  if (!req.role.tienePermiso(modulo, accion))
    return res.status(403).json({
      mensaje: `Sin permiso para "${accion}" en el módulo "${modulo}"`
    });

  next();
};

const requireRole = (...nombres) => (req, res, next) => {
  if (!req.role || !nombres.includes(req.role.nombre)) {
    return res.status(403).json({ mensaje: 'Rol no autorizado para esta operación' });
  }
  next();
};

/**
 * Middleware de autorización a nivel de objeto para el rol "paciente" (anti-IDOR).
 * El personal pasa sin restricción; a un paciente lo limita a sus propios datos:
 * valida que cualquier `pacienteId` de la petición sea el suyo y expone
 * `req.pacienteScope` para que los controladores filtren/validen por ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 403 si intenta acceder a datos de otro paciente.
 */
const scopePaciente = async (req, res, next) => {
  try {
    if (!req.role || req.role.nombre !== 'paciente') return next();

    const paciente = await Paciente.findOne({ usuarioId: req.user._id, activo: true }).select('_id');
    if (!paciente)
      return res.status(403).json({ mensaje: 'El usuario no tiene un paciente asociado' });

    req.pacienteScope = String(paciente._id);

    const solicitado = req.params.pacienteId || req.query.pacienteId || (req.body && req.body.pacienteId);
    if (solicitado && String(solicitado) !== req.pacienteScope)
      return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Limita al rol doctor a los recursos asociados a su propia ficha profesional.
 * Los controladores usan `req.doctorScope` también al consultar recursos por ID.
 */
const scopeDoctor = async (req, res, next) => {
  try {
    if (!req.role || req.role.nombre !== 'doctor') return next();

    const doctor = await Doctor.findOne({ usuarioId: req.user._id, activo: true }).select('_id');
    if (!doctor)
      return res.status(403).json({ mensaje: 'El usuario no tiene un doctor activo asociado' });

    req.doctorScope = String(doctor._id);

    const solicitado = req.params.doctorId || req.query.doctorId || (req.body && req.body.doctorId);
    if (solicitado && String(solicitado) !== req.doctorScope)
      return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate, authorize, requireRole, scopePaciente, scopeDoctor };
