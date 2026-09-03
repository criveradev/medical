/**
 * @swagger
 * tags:
 *   name: Historial
 *   description: Historial clínico de pacientes
 */

/**
 * @swagger
 * /api/v1/historial/paciente/{pacienteId}:
 *   get:
 *     summary: Obtener historial completo de un paciente
 *     tags: [Historial]
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de registros del historial
 */

/**
 * @swagger
 * /api/v1/historial/{id}:
 *   get:
 *     summary: Obtener registro de historial por ID
 *     tags: [Historial]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registro del historial
 *       404:
 *         description: No encontrado
 *   put:
 *     summary: Actualizar registro de historial
 *     tags: [Historial]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diagnostico:
 *                 type: string
 *               tratamiento:
 *                 type: string
 *               receta:
 *                 type: string
 *               observaciones:
 *                 type: string
 *               proximaCita:
 *                 type: string
 *                 example: "2026-06-17T09:00:00"
 *     responses:
 *       200:
 *         description: Actualizado correctamente
 */

/**
 * @swagger
 * /api/v1/historial:
 *   post:
 *     summary: Registrar diagnóstico — solo doctor
 *     tags: [Historial]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pacienteId, citaId, doctorId, diagnostico]
 *             properties:
 *               pacienteId:
 *                 type: string
 *               citaId:
 *                 type: string
 *               doctorId:
 *                 type: string
 *               diagnostico:
 *                 type: string
 *                 example: Cuadro gripal leve
 *               tratamiento:
 *                 type: string
 *                 example: Reposo 3 días
 *               receta:
 *                 type: string
 *                 example: Paracetamol 500mg cada 8 horas
 *               observaciones:
 *                 type: string
 *               proximaCita:
 *                 type: string
 *                 example: "2026-06-17T09:00:00"
 *     responses:
 *       201:
 *         description: Historial registrado — cita marcada como completada
 *       409:
 *         description: Ya existe registro para esta cita
 */

const router = require('express').Router();
const { listarPorPaciente, obtener, crear, actualizar } = require('../../controllers/historial.controller');
const { authenticate, authorize, scopePaciente, scopeDoctor } = require('../../middleware/auth');
const validar = require('../../middleware/validar');
const { validarCrearHistorial } = require('../../middleware/validaciones/historial.validaciones');

router.get('/paciente/:pacienteId', authenticate, authorize('historial', 'leer'), scopePaciente, scopeDoctor, listarPorPaciente);
router.get('/:id', authenticate, authorize('historial', 'leer'), scopePaciente, scopeDoctor, obtener);
router.post('/', authenticate, authorize('historial', 'crear'), validarCrearHistorial, validar, scopeDoctor, crear);
router.put('/:id', authenticate, authorize('historial', 'editar'), scopeDoctor, actualizar);

module.exports = router;
