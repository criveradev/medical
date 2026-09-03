const router = require('express').Router();
const { listar } = require('../../controllers/auditoria.controller');
const { authenticate, requireRole } = require('../../middleware/auth');

router.get('/', authenticate, requireRole('administrador'), listar);

module.exports = router;
