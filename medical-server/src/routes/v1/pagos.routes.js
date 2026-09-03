/**
 * @swagger
 * tags:
 *   name: Pagos
 *   description: Control de pagos de consultas médicas
 */

/**
 * @swagger
 * /api/v1/pagos:
 *   get:
 *     summary: Listar pagos con filtros
 *     tags: [Pagos]
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, pagado, anulado]
 *       - in: query
 *         name: pacienteId
 *         schema:
 *           type: string
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *         example: "2026-01-01"
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *         example: "2026-12-31"
 *     responses:
 *       200:
 *         description: Lista de pagos con total recaudado
 *   post:
 *     summary: Registrar pago de una cita
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [citaId, pacienteId, monto, metodo]
 *             properties:
 *               citaId:
 *                 type: string
 *               pacienteId:
 *                 type: string
 *               monto:
 *                 type: number
 *                 example: 25000
 *               metodo:
 *                 type: string
 *                 enum: [efectivo, tarjeta, transferencia, fonasa, isapre]
 *               comprobante:
 *                 type: string
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Pago registrado
 *       409:
 *         description: Ya existe un pago para esta cita
 */

/**
 * @swagger
 * /api/v1/pagos/{id}:
 *   get:
 *     summary: Obtener pago por ID
 *     tags: [Pagos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos del pago
 *       404:
 *         description: No encontrado
 *   put:
 *     summary: Actualizar pago
 *     tags: [Pagos]
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
 *               monto:
 *                 type: number
 *               metodo:
 *                 type: string
 *                 enum: [efectivo, tarjeta, transferencia, fonasa, isapre]
 *               estado:
 *                 type: string
 *                 enum: [pendiente, pagado, anulado]
 *               comprobante:
 *                 type: string
 *               observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pago actualizado
 */

/**
 * @swagger
 * /api/v1/pagos/{id}/anular:
 *   put:
 *     summary: Anular pago
 *     tags: [Pagos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pago anulado
 *       404:
 *         description: No encontrado
 */

const router = require('express').Router();
const { listar, obtener, crear, actualizar, anular } = require('../../controllers/pagos.controller');
const { authenticate, authorize, scopePaciente } = require('../../middleware/auth');
const validar = require('../../middleware/validar');
const { validarCrearPago, validarActualizarPago } = require('../../middleware/validaciones/pagos.validaciones');
const idempotency = require('../../middleware/idempotency');

router.get('/', authenticate, authorize('pagos', 'leer'), scopePaciente, listar);
router.get('/:id', authenticate, authorize('pagos', 'leer'), scopePaciente, obtener);
router.post('/', authenticate, authorize('pagos', 'crear'), idempotency(), validarCrearPago, validar, crear);
router.put('/:id', authenticate, authorize('pagos', 'editar'), validarActualizarPago, validar, actualizar);
router.put('/:id/anular', authenticate, authorize('pagos', 'editar'), anular);

module.exports = router;
