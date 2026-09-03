const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../../config/swagger');
const xssSanitizer = require('../../middleware/xss');

const router = express.Router();

router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Medical API Docs'
}));

router.use(xssSanitizer);

router.get('/', (req, res) => {
  res.json({
    servicio: 'Medical API',
    version: 'v1',
    estado: 'ok',
    docs: '/api/v1/docs',
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/departamentos', require('./departamentos.routes'));
router.use('/especialidades', require('./especialidades.routes'));
router.use('/doctores', require('./doctores.routes'));
router.use('/pacientes', require('./pacientes.routes'));
router.use('/citas', require('./citas.routes'));
router.use('/historial', require('./historial.routes'));
router.use('/pagos', require('./pagos.routes'));
router.use('/resultados', require('./resultados.routes'));
router.use('/reportes', require('./reportes.routes'));
router.use('/auditoria', require('./auditoria.routes'));

module.exports = router;
