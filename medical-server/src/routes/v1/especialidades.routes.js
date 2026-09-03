/**
 * @swagger
 * tags:
 *   name: Especialidades
 *   description: Gestión de especialidades médicas
 */

/**
 * @swagger
 * /api/v1/especialidades:
 *   get:
 *     summary: Listar especialidades activas
 *     tags: [Especialidades]
 *     responses:
 *       200:
 *         description: Lista de especialidades
 *   post:
 *     summary: Crear especialidad
 *     tags: [Especialidades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, departamentoId]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Medicina Familiar
 *               descripcion:
 *                 type: string
 *               departamentoId:
 *                 type: string
 *                 example: 6a1e3b9c23f7382925d313fa
 *     responses:
 *       201:
 *         description: Especialidad creada
 *       404:
 *         description: Departamento no encontrado
 */

/**
 * @swagger
 * /api/v1/especialidades/departamento/{departamentoId}:
 *   get:
 *     summary: Listar especialidades por departamento
 *     tags: [Especialidades]
 *     parameters:
 *       - in: path
 *         name: departamentoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de especialidades del departamento
 */

/**
 * @swagger
 * /api/v1/especialidades/{id}:
 *   put:
 *     summary: Actualizar especialidad
 *     tags: [Especialidades]
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
 *               departamentoId:
 *                 type: string
 *               activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Actualizada correctamente
 *       404:
 *         description: No encontrada
 *   delete:
 *     summary: Desactivar especialidad
 *     tags: [Especialidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Desactivada correctamente
 */

const router = require('express').Router();
const { listar, listarPorDepartamento, crear, actualizar, eliminar } = require('../../controllers/especialidades.controller');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('especialidades', 'leer'), listar);
router.get('/departamento/:departamentoId', authenticate, authorize('especialidades', 'leer'), listarPorDepartamento);
router.post('/', authenticate, authorize('especialidades', 'crear'), crear);
router.put('/:id', authenticate, authorize('especialidades', 'editar'), actualizar);
router.delete('/:id', authenticate, authorize('especialidades', 'eliminar'), eliminar);

module.exports = router;