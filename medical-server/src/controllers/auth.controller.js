// ═══════════════════════════════════════════════════════════════
// src/controllers/auth.controller.js — Autenticación y usuarios
// ═══════════════════════════════════════════════════════════════

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Role = require('../models/Role');
const QRCode = require('qrcode');
const {
  REFRESH_COOKIE,
  clearAuthCookies,
  issueCsrfToken,
  parseCookies,
  setAuthCookies,
} = require('../config/auth-cookies');
const {
  createEnrollment,
  createRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
} = require('../services/mfa.service');

/**
 * Genera un access token JWT de corta duración.
 * @param {string} id - ID del usuario (payload del token).
 * @returns {string} Token firmado (expira según JWT_EXPIRES, por defecto 8h).
 */
const generarAccessToken = (id, sessionVersion) =>
  jwt.sign({ id, sv: sessionVersion }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '8h' });

/**
 * Genera un refresh token JWT de larga duración (7 días).
 * @param {string} id - ID del usuario.
 * @returns {string} Refresh token firmado.
 */
const generarRefreshToken = (id, sessionVersion) =>
  jwt.sign({ id, sv: sessionVersion }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

/**
 * Calcula el hash SHA-256 de un token para guardarlo en BD sin exponerlo en claro.
 * @param {string} token - Refresh token.
 * @returns {string} Hash hexadecimal.
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const serializarUsuario = (user) => ({
  id: user._id,
  nombre: user.nombre,
  apellido: user.apellido,
  email: user.email,
  foto: user.foto || null,
  rol: user.roleId.nombre,
  permisos: user.roleId.permisos,
  mfaEnabled: Boolean(user.mfaEnabled),
});

const emitirSesion = async (res, user) => {
  const accessToken = generarAccessToken(user._id, user.sessionVersion);
  const refreshToken = generarRefreshToken(user._id, user.sessionVersion);
  await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refreshToken) });
  setAuthCookies(res, { accessToken, refreshToken });
  const respuesta = { csrfToken: issueCsrfToken(res), usuario: serializarUsuario(user) };
  if (process.env.NODE_ENV === 'test' || process.env.EXPOSE_AUTH_TOKENS === 'true') {
    respuesta.accessToken = accessToken;
    respuesta.refreshToken = refreshToken;
  }
  return respuesta;
};

/**
 * Inicia sesión: valida credenciales y emite cookies seguras con los datos del usuario.
 * Guarda en BD solo el hash del refresh token.
 * @route POST /api/v1/auth/login
 * @param {import('express').Request} req - body: { email, password }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { csrfToken, usuario } | 202 desafío MFA | 401 credenciales inválidas.
 */
exports.login = async (req, res, next) => {
  try {
    const { password } = req.body;
    // El email se guarda en minúsculas → normalizar la entrada para que el
    // login no falle por mayúsculas/espacios.
    const email = (req.body.email || '').toLowerCase().trim();

    // password es select:false en el schema → pedirlo explícitamente
    const user = await User.findOne({ email }).select('+password +sessionVersion').populate('roleId');
    if (!user || !user.activo || !user.roleId || !user.roleId.activo)
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });

    const valido = await user.compararPassword(password);
    if (!valido)
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });

    req.auditActorId = user._id;
    req.auditActorRole = user.roleId.nombre;

    if (user.mfaEnabled) {
      const challengeToken = jwt.sign(
        { id: user._id, sv: user.sessionVersion, purpose: 'mfa_login' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.status(202).json({ mfaRequired: true, challengeToken });
    }

    return res.json(await emitirSesion(res, user));
  } catch (error) {
    next(error);
  }
};

/**
 * Renueva el access token a partir de un refresh token válido (con rotación).
 * Verifica que el hash coincida con el guardado en BD (invalida tokens tras logout).
 * @route POST /api/v1/auth/refresh
 * @param {import('express').Request} req - Cookie o body: { refreshToken } para clientes de servidor.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { csrfToken } | 401 token inválido.
 */
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken || parseCookies(req.headers.cookie)[REFRESH_COOKIE];
    if (!refreshToken)
      return res.status(401).json({ mensaje: 'Refresh token requerido' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Comparar el hash del token recibido con el guardado (evita uso tras logout)
    const user = await User.findById(decoded.id).select('+refreshToken +sessionVersion').populate('roleId');
    if (!user || !user.activo || !user.roleId || !user.roleId.activo
      || decoded.sv !== user.sessionVersion || user.refreshToken !== hashToken(refreshToken))
      return res.status(401).json({ mensaje: 'Refresh token inválido' });

    // Generar nuevos tokens (rotación de refresh token)
    const nuevoAccessToken = generarAccessToken(user._id, user.sessionVersion);
    const nuevoRefreshToken = generarRefreshToken(user._id, user.sessionVersion);

    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(nuevoRefreshToken) });
    setAuthCookies(res, { accessToken: nuevoAccessToken, refreshToken: nuevoRefreshToken });
    const respuesta = { csrfToken: issueCsrfToken(res) };
    if (process.env.NODE_ENV === 'test' || process.env.EXPOSE_AUTH_TOKENS === 'true') {
      respuesta.accessToken = nuevoAccessToken;
      respuesta.refreshToken = nuevoRefreshToken;
    }
    res.json(respuesta);
  } catch (error) {
    next(error);
  }
};

/**
 * Cierra la sesión invalidando el refresh token guardado en BD.
 * @route POST /api/v1/auth/logout
 * @param {import('express').Request} req - req.user lo inyecta el middleware authenticate.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 sesión cerrada.
 */
exports.logout = async (req, res, next) => {
  try {
    // Invalidar el refresh token en BD
    await User.findByIdAndUpdate(req.user._id, {
      $set: { refreshToken: null },
      $inc: { sessionVersion: 1 },
    });
    clearAuthCookies(res);
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Devuelve los datos del usuario autenticado y su rol.
 * @route GET /api/v1/auth/perfil
 * @param {import('express').Request} req - req.user / req.role inyectados por authenticate.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void} 200 { usuario, rol }.
 */
exports.perfil = async (req, res, next) => {
  res.json({ usuario: req.user, rol: req.role });
};

exports.csrf = async (req, res) => {
  res.json({ csrfToken: issueCsrfToken(res) });
};

exports.verificarMfaLogin = async (req, res, next) => {
  try {
    const { challengeToken, code } = req.body;
    if (typeof challengeToken !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ mensaje: 'Desafío y código MFA requeridos' });
    }
    const decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);
    if (decoded.purpose !== 'mfa_login') return res.status(401).json({ mensaje: 'Desafío MFA inválido' });

    const user = await User.findById(decoded.id)
      .select('+sessionVersion +mfaSecret +mfaRecoveryCodes')
      .populate('roleId');
    if (!user || !user.activo || !user.roleId || !user.roleId.activo
      || !user.mfaEnabled || decoded.sv !== user.sessionVersion) {
      return res.status(401).json({ mensaje: 'Desafío MFA inválido' });
    }

    let valid = await verifyTotp(user.mfaSecret, code);
    if (!valid) {
      const recoveryHash = hashRecoveryCode((code || '').toUpperCase());
      const index = user.mfaRecoveryCodes.indexOf(recoveryHash);
      if (index !== -1) {
        user.mfaRecoveryCodes.splice(index, 1);
        await user.save();
        valid = true;
      }
    }
    if (!valid) return res.status(401).json({ mensaje: 'Código MFA inválido' });

    req.auditActorId = user._id;
    req.auditActorRole = user.roleId.nombre;
    return res.json(await emitirSesion(res, user));
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Desafío MFA inválido o expirado' });
    }
    return next(error);
  }
};

exports.iniciarMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password +mfaSecret');
    if (user.mfaEnabled) {
      return res.status(409).json({ mensaje: 'El segundo factor ya está habilitado' });
    }
    if (!await user.compararPassword(req.body.password || '')) {
      return res.status(401).json({ mensaje: 'Contraseña actual incorrecta' });
    }
    const enrollment = createEnrollment(user.email);
    user.mfaSecret = enrollment.encryptedSecret;
    user.mfaEnabled = false;
    user.mfaRecoveryCodes = [];
    await user.save();
    const qrCode = await QRCode.toDataURL(enrollment.uri, { margin: 1, width: 240 });
    return res.json({ secret: enrollment.secret, qrCode });
  } catch (error) {
    return next(error);
  }
};

exports.confirmarMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('+sessionVersion +mfaSecret +mfaRecoveryCodes')
      .populate('roleId');
    if (!user.mfaSecret) return res.status(409).json({ mensaje: 'Primero debes iniciar la configuración MFA' });
    if (!await verifyTotp(user.mfaSecret, req.body.code)) {
      return res.status(400).json({ mensaje: 'Código MFA inválido' });
    }

    const recoveryCodes = createRecoveryCodes();
    user.mfaRecoveryCodes = recoveryCodes.map(hashRecoveryCode);
    user.mfaEnabled = true;
    user.sessionVersion += 1;
    await user.save();
    const session = await emitirSesion(res, user);
    return res.json({ ...session, recoveryCodes });
  } catch (error) {
    return next(error);
  }
};

exports.deshabilitarMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('+password +sessionVersion +mfaSecret +mfaRecoveryCodes');
    if (!await user.compararPassword(req.body.password || '')) {
      return res.status(401).json({ mensaje: 'Contraseña actual incorrecta' });
    }
    if (!user.mfaEnabled || !await verifyTotp(user.mfaSecret, req.body.code)) {
      return res.status(400).json({ mensaje: 'Código MFA inválido' });
    }
    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.mfaRecoveryCodes = [];
    user.sessionVersion += 1;
    user.refreshToken = null;
    await user.save();
    clearAuthCookies(res);
    return res.json({ mensaje: 'Segundo factor deshabilitado; inicia sesión nuevamente' });
  } catch (error) {
    return next(error);
  }
};

exports.resetMfa = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [], refreshToken: null },
        $inc: { sessionVersion: 1 },
      },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    return res.json({ mensaje: 'MFA restablecido y sesiones revocadas' });
  } catch (error) {
    return next(error);
  }
};

/**
 * Sube/actualiza la foto de perfil del usuario autenticado (cualquier rol).
 * El archivo lo sube Multer a Cloudinary y su URL queda en req.file.path.
 * @route PUT /api/v1/auth/perfil/foto
 * @param {import('express').Request} req - req.file con la imagen (campo "foto").
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { foto } | 400 si no se recibió archivo.
 */
exports.subirFotoPerfil = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ mensaje: 'No se recibió ningún archivo' });
    const user = await User.findByIdAndUpdate(req.user._id, { foto: req.file.path }, { returnDocument: 'after' });
    res.json({ mensaje: 'Foto actualizada', foto: user.foto });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un usuario del staff o paciente con el rol indicado.
 * @route POST /api/v1/auth/usuarios
 * @param {import('express').Request} req - body: { nombre, apellido, email, password, rolNombre, telefono }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 201 { usuario } | 400 rol inexistente | 409 email duplicado.
 */
exports.crearUsuario = async (req, res, next) => {
  try {
    const { nombre, apellido, email, password, rolNombre, telefono } = req.body;

    const role = await Role.findOne({ nombre: rolNombre });
    if (!role)
      return res.status(400).json({ mensaje: `El rol "${rolNombre}" no existe` });

    const user = await User.create({ nombre, apellido, email, password, roleId: role._id, telefono });
    res.status(201).json({ mensaje: 'Usuario creado', usuario: user });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ mensaje: 'El email ya está registrado' });
    next(error);
  }
};

/**
 * Lista todos los usuarios con su rol.
 * @route GET /api/v1/auth/usuarios
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, usuarios }.
 */
exports.listarUsuarios = async (req, res, next) => {
  try {
    const usuarios = await User.find().populate('roleId', 'nombre descripcion');
    res.json({ total: usuarios.length, usuarios });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un usuario. Aplica un candado anti-escalada: el usuario no puede
 * cambiar su propio rol ni desactivarse a sí mismo. Solo modifica los campos enviados.
 * @route PUT /api/v1/auth/usuarios/:id
 * @param {import('express').Request} req - body parcial: { nombre, apellido, telefono, activo, rolNombre, email }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { usuario } | 403 auto-cambio de rol/estado | 404 no encontrado.
 */
exports.actualizarUsuario = async (req, res, next) => {
  try {
    const { nombre, apellido, telefono, activo, rolNombre, email } = req.body;

    // Candado anti-escalada: un usuario no puede cambiar su propio rol ni
    // desactivarse a sí mismo (evita lockouts y auto-promoción a admin).
    const esYoMismo = String(req.params.id) === String(req.user._id);
    if (esYoMismo && (rolNombre || activo === false))
      return res.status(403).json({
        mensaje: 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta'
      });

    // Construir el set de cambios solo con los campos efectivamente enviados
    // (evita sobrescribir con undefined campos no incluidos en el body)
    const cambios = {};
    if (nombre   !== undefined) cambios.nombre   = nombre;
    if (apellido !== undefined) cambios.apellido = apellido;
    if (telefono !== undefined) cambios.telefono = telefono;
    if (activo   !== undefined) cambios.activo   = activo;
    if (email    !== undefined) cambios.email    = email;

    if (rolNombre) {
      const role = await Role.findOne({ nombre: rolNombre });
      if (!role)
        return res.status(400).json({ mensaje: `El rol "${rolNombre}" no existe` });
      cambios.roleId = role._id;
    }

    const user = await User.findByIdAndUpdate(req.params.id, cambios, { returnDocument: 'after' })
      .populate('roleId', 'nombre descripcion');

    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario actualizado', usuario: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Desactiva (soft delete) un usuario: marca activo=false en lugar de borrarlo.
 * @route DELETE /api/v1/auth/usuarios/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 desactivado | 404 no encontrado.
 */
exports.eliminarUsuario = async (req, res, next) => {
  try {
    // Soft delete — desactivar en lugar de eliminar
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { activo: false, refreshToken: null }, $inc: { sessionVersion: 1 } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario desactivado correctamente' });
  } catch (error) {
    next(error);
  }
};

exports.revocarSesiones = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { refreshToken: null }, $inc: { sessionVersion: 1 } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.json({ mensaje: 'Todas las sesiones del usuario fueron revocadas' });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambia la contraseña del usuario autenticado. Verifica la contraseña actual,
 * aplica la política de seguridad (mín. 8, con letra y número) e invalida el
 * refresh token para forzar un nuevo login.
 * @route PUT /api/v1/auth/cambiar-password
 * @param {import('express').Request} req - body: { passwordActual, passwordNueva }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 actualizada | 400 política/igual | 401 actual incorrecta.
 */
exports.cambiarPassword = async (req, res, next) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva)
      return res.status(400).json({ mensaje: 'Ambas contraseñas son requeridas' });

    // Política de contraseñas: mínimo 8 caracteres, con al menos una letra y un número
    if (passwordNueva.length < 8 || !/[A-Za-z]/.test(passwordNueva) || !/\d/.test(passwordNueva))
      return res.status(400).json({
        mensaje: 'La nueva contraseña debe tener mínimo 8 caracteres e incluir letras y números'
      });

    if (passwordNueva === passwordActual)
      return res.status(400).json({ mensaje: 'La nueva contraseña debe ser distinta de la actual' });

    // Obtener usuario con password (toJSON lo elimina normalmente)
    const user = await User.findById(req.user._id).select('+password +refreshToken +sessionVersion');

    // Verificar que la contraseña actual es correcta
    const valido = await user.compararPassword(passwordActual);
    if (!valido)
      return res.status(401).json({ mensaje: 'La contraseña actual es incorrecta' });

    // Actualizar password — el pre('save') la hashea automáticamente
    user.password = passwordNueva;
    user.refreshToken = null;
    user.sessionVersion += 1;
    await user.save();

    clearAuthCookies(res);

    res.json({ mensaje: 'Contraseña actualizada correctamente. Por favor inicia sesión nuevamente.' });
  } catch (error) {
    next(error);
  }
};
