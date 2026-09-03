/**
 * @swagger
 * tags:
 *   name: Citas
 *   description: Gestión de citas médicas
 */

/**
 * @swagger
 * /api/v1/citas:
 *   get:
 *     summary: Listar citas con filtros y paginación
 *     tags: [Citas]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 10
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, confirmada, completada, cancelada, no_asistio]
 *       - in: query
 *         name: doctorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *         example: "2026-06-10"
 *     responses:
 *       200:
 *         description: Lista paginada de citas
 *   post:
 *     summary: Crear nueva cita médica
 *     tags: [Citas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pacienteId, doctorId, fechaHora, motivo, tipo]
 *             properties:
 *               pacienteId:
 *                 type: string
 *               doctorId:
 *                 type: string
 *               fechaHora:
 *                 type: string
 *                 example: "2026-06-10T09:00:00"
 *               motivo:
 *                 type: string
 *                 example: Control general
 *               tipo:
 *                 type: string
 *                 enum: [primera_vez, control, urgencia]
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cita creada
 *       409:
 *         description: Doctor ya tiene cita en ese horario
 */

/**
 * @swagger
 * /api/v1/citas/disponibilidad/{doctorId}:
 *   get:
 *     summary: Ver slots disponibles del doctor para una fecha
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fecha
 *         required: true
 *         schema:
 *           type: string
 *         example: "2026-06-10"
 *     responses:
 *       200:
 *         description: Slots disponibles y ocupados
 */

/**
 * @swagger
 * /api/v1/citas/{id}:
 *   get:
 *     summary: Obtener cita por ID
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos de la cita
 *       404:
 *         description: No encontrada
 *   put:
 *     summary: Actualizar datos de la cita
 *     tags: [Citas]
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
 *               fechaHora:
 *                 type: string
 *               motivo:
 *                 type: string
 *               tipo:
 *                 type: string
 *               observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizada correctamente
 */

/**
 * @swagger
 * /api/v1/citas/{id}/estado:
 *   put:
 *     summary: Cambiar estado de la cita
 *     tags: [Citas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [pendiente, confirmada, completada, cancelada, no_asistio]
 *               motivoCancelacion:
 *                 type: string
 *               canceladoPor:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estado actualizado — envía email si es confirmada
 */

const router = require('express').Router();
const { listar, obtener, crear, actualizar, cambiarEstado, disponibilidad } = require('../../controllers/citas.controller');
const { authenticate, authorize, scopePaciente, scopeDoctor } = require('../../middleware/auth');
const idempotency = require('../../middleware/idempotency');
const validar = require('../../middleware/validar');
const { validarCrearCita, validarCambiarEstado } = require('../../middleware/validaciones/citas.validaciones');

router.get('/disponibilidad/:doctorId', authenticate, authorize('citas', 'leer'), scopeDoctor, disponibilidad);
router.get('/', authenticate, authorize('citas', 'leer'), scopePaciente, scopeDoctor, listar);
router.get('/:id', authenticate, authorize('citas', 'leer'), scopePaciente, scopeDoctor, obtener);
router.post('/', authenticate, authorize('citas', 'crear'), idempotency(), validarCrearCita, validar, crear);
router.put('/:id', authenticate, authorize('citas', 'editar'), actualizar);
router.put('/:id/estado', authenticate, authorize('citas', 'editar'), validarCambiarEstado, validar, cambiarEstado);

module.exports = router;
