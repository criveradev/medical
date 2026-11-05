
/**
 * @swagger
 * tags:
 *   name: Departamentos
 *   description: Gestión de departamentos médicos
 */

/**
 * @swagger
 * /api/v1/departamentos:
 *   get:
 *     summary: Listar departamentos activos
 *     tags: [Departamentos]
 *     responses:
 *       200:
 *         description: Lista de departamentos
 *   post:
 *     summary: Crear departamento
 *     tags: [Departamentos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Medicina General
 *               descripcion:
 *                 type: string
 *                 example: Atención primaria
 *     responses:
 *       201:
 *         description: Departamento creado
 *       409:
 *         description: Ya existe
 */

/**
 * @swagger
 * /api/v1/departamentos/{id}:
 *   put:
 *     summary: Actualizar departamento
 *     tags: [Departamentos]
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
 *               nombre:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Actualizado correctamente
 *       404:
 *         description: No encontrado
 *   delete:
 *     summary: Desactivar departamento
 *     tags: [Departamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Desactivado correctamente
 *       404:
 *         description: No encontrado
 */

const router = require('express').Router();
const { listar, crear, actualizar, eliminar } = require('../../controllers/departamentos.controller');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('departamentos', 'leer'), listar);
router.post('/', authenticate, authorize('departamentos', 'crear'), crear);
router.put('/:id', authenticate, authorize('departamentos', 'editar'), actualizar);
router.delete('/:id', authenticate, authorize('departamentos', 'eliminar'), eliminar);

module.exports = router;


