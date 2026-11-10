const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { solicitarCodigo, registrar } = require('../../services/registro.service');
const { activarCuenta } = require('../../services/activacion-paciente.service');
const logger = require('../../config/logger');

const validarEmail = body('email').isString().bail().trim().isEmail().bail().toLowerCase();
const limitarRegistro = rateLimit({
  windowMs: 15 * 60_000,
  limit: process.env.NODE_ENV === 'test' ? 100 : 10,
  message: { mensaje: 'Demasiados intentos de registro. Intenta en 15 minutos.' },
});

const limitarActivacion = rateLimit({
  windowMs: 15 * 60_000,
  limit: process.env.NODE_ENV === 'test' ? 100 : 10,
  message: { mensaje: 'Demasiados intentos de activación. Intenta en 15 minutos.' },
});

function validarRegistro(req, res, next) {
  if (!validationResult(req).isEmpty()) {
    return res.status(400).json({ mensaje: 'Revisa los datos del formulario' });
  }
  next();
}

router.post('/codigo', limitarRegistro, validarEmail, validarRegistro, async (req, res) => {
  try {
    await solicitarCodigo(req.body.email);
  } catch (error) {
    if (error.status !== 502) throw error;
    logger.warn('No se pudo enviar el código de registro', { requestId: req.requestId });
    return res.status(502).json({
      mensaje: 'No pudimos enviar el código de verificación. Intenta de nuevo más tarde.',
    });
  }
  res.status(202).json({ mensaje: 'Código enviado' });
});

router.post('/', limitarRegistro, validarEmail,
  body(['nombre', 'apellido']).isString().bail().trim().isLength({ min: 1, max: 100 }),
  body('password').isString().bail().isLength({ min: 10 }).custom(value => Buffer.byteLength(value) <= 72),
  body('codigo').isString().bail().trim().matches(/^\d{6}$/),
  body('rut').isString().bail().trim().matches(/^[0-9.]{7,11}-?[0-9kK]$/),
  body('fechaNacimiento').isString().bail().matches(/^\d{4}-\d{2}-\d{2}$/).isISO8601({ strict: true })
    .custom(value => Date.parse(value) < Date.now()),
  body('genero').isIn(['masculino', 'femenino', 'otro']),
  validarRegistro,
  async (req, res) => {
    await registrar(req.body);
    res.status(201).json({ mensaje: 'Cuenta creada' });
  },
);

router.post('/activacion', limitarActivacion,
  body('token').isString().bail().matches(/^[a-f0-9]{24}\.[A-Za-z0-9_-]{43}$/),
  body('password').isString().bail().isLength({ min: 10 }).custom(value => Buffer.byteLength(value) <= 72),
  validarRegistro,
  async (req, res) => {
    await activarCuenta(req.body);
    res.json({ mensaje: 'Cuenta activada. Ya puedes iniciar sesión.' });
  },
);

module.exports = router;
