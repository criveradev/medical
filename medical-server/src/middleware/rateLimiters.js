const rateLimit = require('express-rate-limit');

const limiterGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.parseInt(process.env.RATE_LIMIT_MAX, 10)
    || (process.env.NODE_ENV === 'production' ? 100 : 1000),
  message: { mensaje: 'Demasiadas solicitudes, intenta en 15 minutos' }
});

const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.parseInt(process.env.LOGIN_RATE_MAX, 10)
    || (process.env.NODE_ENV === 'production' ? 5 : 100),
  message: { mensaje: 'Demasiados intentos de login, intenta en 15 minutos' }
});

module.exports = { limiterGeneral, limiterLogin };
