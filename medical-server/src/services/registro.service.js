const { createHmac, randomInt, timingSafeEqual } = require('node:crypto');
const { escape: escapeRegExp } = RegExp;
const mongoose = require('mongoose');
const User = require('../models/User');
const Paciente = require('../models/Paciente');
const Role = require('../models/Role');
const CodigoRegistro = require('../models/CodigoRegistro');
const { enviarVerificacionRegistro } = require('./email.service');
const { httpError } = require('./citas.service');

const MAX_INTENTOS = 5;
const huellaCodigo = (email, codigo) => createHmac('sha256', process.env.JWT_SECRET)
  .update(JSON.stringify(['medical-registro-paciente', email, codigo]))
  .digest('hex');
const codigoInvalido = () => httpError(400, 'Código inválido, vencido o sin intentos. Puedes solicitar uno nuevo.');

async function solicitarCodigo(email) {
  if (typeof email !== 'string') throw httpError(400, 'Correo inválido');
  const codigo = String(randomInt(1_000_000)).padStart(6, '0');
  const huella = huellaCodigo(email, codigo);
  const venceEn = new Date(Date.now() + 15 * 60_000);
  await CodigoRegistro.updateOne(
    { _id: { $eq: email } },
    { $set: { huella, venceEn, intentos: 0 } },
    { upsert: true },
  );
  try {
    await enviarVerificacionRegistro({ email, codigo });
  } catch (error) {
    await CodigoRegistro.deleteOne({ _id: { $eq: email }, huella, venceEn });
    throw httpError(502, 'No se pudo enviar el código de verificación');
  }
}

function normalizarRut(rut) {
  const limpio = rut.replace(/[.-]/g, '').toUpperCase();
  const numero = limpio.slice(0, -1).replace(/^0+/, '');
  const suma = [...numero].reverse().reduce((total, digito, index) => total + Number(digito) * (2 + index % 6), 0);
  const verificador = '0123456789K'[(11 - suma % 11) % 11];
  if (!numero || numero.length > 8 || verificador !== limpio.at(-1)) {
    throw httpError(400, 'RUT inválido');
  }
  return `${numero}-${verificador}`;
}

async function registrar({ email, codigo, nombre, apellido, password, rut, fechaNacimiento, genero }) {
  if (typeof email !== 'string') throw httpError(400, 'Correo inválido');
  const rutCanonico = normalizarRut(rut);
  const desafio = await CodigoRegistro.findOneAndUpdate(
    { _id: { $eq: email }, venceEn: { $gt: new Date() }, intentos: { $lt: MAX_INTENTOS } },
    { $inc: { intentos: 1 } },
  );
  const huella = huellaCodigo(email, codigo);
  if (!desafio || !timingSafeEqual(Buffer.from(huella, 'hex'), Buffer.from(desafio.huella, 'hex'))) {
    throw codigoInvalido();
  }

  const [numero, verificador] = rutCanonico.split('-');
  const digitos = [...numero].map(digito => escapeRegExp(digito)).join('\\.?');
  const formatosPrevios = new RegExp(`^0*\\.?${digitos}-?${escapeRegExp(verificador)}$`, 'i');
  const conflicto = () => httpError(409, 'Ya existe una cuenta o ficha con esos datos. Contacta a recepción.');
  try {
    await mongoose.connection.transaction(async session => {
      const consumido = await CodigoRegistro.deleteOne({
        _id: { $eq: email }, huella, venceEn: { $eq: desafio.venceEn, $gt: new Date() },
      }, { session });
      if (!consumido.deletedCount) throw codigoInvalido();
      if (await User.exists({ email: { $eq: email } }).session(session)) throw conflicto();
      if (await Paciente.exists({ rut: formatosPrevios }).session(session)) throw conflicto();

      const role = await Role.findOne({ nombre: 'paciente', activo: true }).session(session);
      if (!role) throw httpError(503, 'Registro temporalmente no disponible');
      const [usuario] = await User.create([{ email, nombre, apellido, password, roleId: role._id }], { session });
      await Paciente.create([{ usuarioId: usuario._id, rut: rutCanonico, fechaNacimiento, genero }], { session });
    });
  } catch (error) {
    if (error.code === 11000) throw conflicto();
    throw error;
  }
}

module.exports = { solicitarCodigo, registrar };
