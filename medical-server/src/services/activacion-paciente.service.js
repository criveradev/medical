const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');
const mongoose = require('mongoose');
const Paciente = require('../models/Paciente');
const Role = require('../models/Role');
const User = require('../models/User');
const logger = require('../config/logger');
const { enviarActivacionPaciente } = require('./email.service');
const { httpError } = require('./citas.service');

const VIGENCIA_MS = 24 * 60 * 60_000;
const PAUSA_REENVIO_MS = 60_000;
const rolPaciente = { nombre: 'paciente', activo: true };

function huellaToken(secreto, usuario) {
  return createHash('sha256')
    .update(JSON.stringify([secreto, usuario.email, String(usuario.roleId), usuario.sessionVersion]))
    .digest('hex');
}

function prepararInvitacion(usuario, ahora = Date.now()) {
  const secreto = randomBytes(32).toString('base64url');
  return {
    token: `${usuario._id}.${secreto}`,
    activacion: { huella: huellaToken(secreto, usuario), venceEn: new Date(ahora + VIGENCIA_MS) },
  };
}

async function entregarInvitacion(email, token, requestId) {
  try {
    const origen = process.env.CLIENT_URL?.split(',')[0].trim();
    const enlace = new URL('/activar-cuenta', origen);
    if (process.env.NODE_ENV === 'production' && enlace.protocol !== 'https:') {
      throw new Error('Origen de activación inseguro');
    }
    // El navegador conserva el fragmento y no lo envía al servidor web.
    enlace.hash = new URLSearchParams({ token }).toString();
    await enviarActivacionPaciente({ email, enlace: enlace.href });
    return true;
  } catch {
    // Las respuestas del proveedor pueden incluir partes del correo.
    logger.warn('No se pudo enviar la invitación de paciente', { requestId });
    return false;
  }
}

async function crearPacienteConInvitacion(datos, requestId) {
  const { nombre, apellido, email, telefono, rut, fechaNacimiento, genero, direccion, prevision, contactoEmergencia } = datos;
  const { usuario, paciente, token } = await mongoose.connection.transaction(async session => {
    const role = await Role.findOne(rolPaciente).session(session);
    if (!role) throw httpError(400, 'Rol paciente no encontrado, ejecuta el seed de roles');

    const usuario = new User({
      nombre, apellido, email, telefono, roleId: role._id,
      password: randomBytes(32).toString('base64url'),
      pendienteActivacion: true,
    });
    const { token, activacion } = prepararInvitacion(usuario);
    usuario.activacion = activacion;
    await usuario.save({ session });
    const [paciente] = await Paciente.create([{
      usuarioId: usuario._id, rut, fechaNacimiento, genero, direccion, prevision, contactoEmergencia,
    }], { session });
    return { usuario, paciente, token };
  });

  // El envío ocurre después del commit. Si falla, la ficha admite reenvío.
  const invitacionEnviada = await entregarInvitacion(usuario.email, token, requestId);
  return { paciente, invitacionEnviada };
}

async function reenviarInvitacion(pacienteId, requestId) {
  const paciente = await Paciente.findOne({ _id: { $eq: pacienteId }, activo: true }).select('usuarioId');
  if (!paciente) throw httpError(404, 'Paciente no encontrado');

  const role = await Role.findOne(rolPaciente).select('_id');
  const cuentaPendiente = {
    _id: paciente.usuarioId, roleId: role?._id, activo: true, pendienteActivacion: true,
  };
  const usuario = role && await User.findOne(cuentaPendiente).select('+sessionVersion');
  if (!usuario) throw httpError(409, 'La cuenta no admite una invitación de activación');

  const ahora = Date.now();
  const { token, activacion } = prepararInvitacion(usuario, ahora);
  const renovada = await User.updateOne({
    ...cuentaPendiente,
    email: usuario.email,
    sessionVersion: usuario.sessionVersion,
    $or: [
      { 'activacion.venceEn': { $exists: false } },
      { 'activacion.venceEn': { $lte: new Date(ahora + VIGENCIA_MS - PAUSA_REENVIO_MS) } },
    ],
  }, { $set: { activacion } });
  if (!renovada.modifiedCount) throw httpError(409, 'Espera un minuto o comprueba el estado de la cuenta antes de reenviar');

  return entregarInvitacion(usuario.email, token, requestId);
}

async function activarCuenta({ token, password }) {
  const [usuarioId, secreto] = token.split('.');
  const invalida = () => httpError(400, 'La invitación no es válida, venció o ya se usó. Solicita un reenvío a quien registró tu ficha.');

  await mongoose.connection.transaction(async session => {
    const role = await Role.findOne(rolPaciente).select('_id').session(session);
    if (!role) throw invalida();
    const usuario = await User.findOne({
      _id: { $eq: usuarioId }, activo: true, pendienteActivacion: true, roleId: role._id,
      'activacion.venceEn': { $gt: new Date() },
    }).select('+activacion +sessionVersion').session(session);

    const huellaGuardada = Buffer.from(usuario?.activacion?.huella || '', 'hex');
    if (huellaGuardada.length !== 32 || !timingSafeEqual(
      huellaGuardada, Buffer.from(huellaToken(secreto, usuario), 'hex'),
    )) throw invalida();

    const paciente = await Paciente.findOne({ usuarioId: usuario._id, activo: true }).select('rut').session(session);
    if (!paciente) throw invalida();
    if (password.replace(/[.\s-]/g, '').toUpperCase() === paciente.rut.replace(/[.\s-]/g, '').toUpperCase()) {
      throw httpError(400, 'Elige una contraseña diferente de tu RUT.');
    }

    usuario.password = password;
    usuario.pendienteActivacion = false;
    usuario.activacion = undefined;
    usuario.refreshToken = null;
    usuario.sessionVersion += 1;
    await usuario.save({ session });
  });
}

module.exports = { crearPacienteConInvitacion, reenviarInvitacion, activarCuenta };
