const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function obtenerUsuarioDeSesion(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Los tokens de acceso existentes no llevan purpose. El desafío MFA usa
  // la misma clave de firma, pero solo sirve en el endpoint de verificación.
  if (typeof decoded !== 'object' || !decoded || decoded.purpose !== undefined) return null;

  const usuario = await User.findById(decoded.id).select('+sessionVersion').populate('roleId');
  if (!usuario?.activo || usuario.pendienteActivacion || !usuario.roleId?.activo
    || decoded.sv !== usuario.sessionVersion) return null;

  return usuario;
}

module.exports = { obtenerUsuarioDeSesion };
