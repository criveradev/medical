// ═══════════════════════════════════════════════════════════════
// src/middleware/sanitizar.js — Prevención de inyección NoSQL
//
// Elimina recursivamente las claves que empiezan por '$' (operadores de
// MongoDB como $ne, $gt, $where) de req.body y req.query.
//
// En Express 5 req.query es de solo lectura, por eso se reemplaza su
// descriptor con el objeto ya saneado en lugar de mutarlo en sitio.
// ═══════════════════════════════════════════════════════════════

const limpiar = (valor) => {
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (valor && typeof valor === 'object') {
    const salida = {};
    for (const clave of Object.keys(valor)) {
      if (clave.startsWith('$')) continue; // descarta operadores de Mongo
      salida[clave] = limpiar(valor[clave]);
    }
    return salida;
  }
  return valor;
};

const sanitizar = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = limpiar(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    // req.query es un getter de solo lectura en Express 5
    Object.defineProperty(req, 'query', {
      value: limpiar(req.query),
      writable: false,
      configurable: true
    });
  }
  next();
};

module.exports = sanitizar;
