// ═══════════════════════════════════════════════════════════════
// src/config/cors.js — Orígenes permitidos para CORS
// Lógica compartida por la API REST (app.js) y Socket.io (server.js)
// para que ambos acepten exactamente los mismos orígenes.
// ═══════════════════════════════════════════════════════════════

// Quita espacios y la barra final para comparar orígenes de forma fiable.
const normalizar = (url) => (url || '').trim().replace(/\/+$/, '');

// CLIENT_URL admite una lista separada por comas, p. ej.:
//   CLIENT_URL=https://medical.criveradev.com,https://www.medical.criveradev.com
// Se evalúa en cada llamada para tolerar entornos que definen el env tarde (tests).
const origenesPermitidos = () => [
  ...(process.env.CLIENT_URL || '').split(',').map(normalizar).filter(Boolean),
  'http://localhost:4200',
];

// Comprueba si un origin entrante está permitido (tolerante a la barra final).
const origenPermitido = (origin) => origenesPermitidos().includes(normalizar(origin));

module.exports = { normalizar, origenesPermitidos, origenPermitido };
