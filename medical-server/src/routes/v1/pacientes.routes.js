/**
 * @swagger
 * tags:
 *   name: Pacientes
 *   description: Gestión de pacientes
 */

/**
 * @swagger
 * /api/v1/pacientes:
 *   get:
 *     summary: Listar pacientes con paginación y búsqueda
 *     tags: [Pacientes]
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
 *         name: buscar
 *         schema:
 *           type: string
 *         example: Juan
 *     responses:
 *       200:
 *         description: Lista paginada de pacientes
 *   post:
 *     summary: Registrar nuevo paciente
 *     tags: [Pacientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, email, rut, fechaNacimiento, genero]
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: Juan
 *               apellido:
 *                 type: string
 *                 example: Pérez
 *               email:
 *                 type: string
 *                 example: juan@paciente.com
 *               telefono:
 *                 type: string
 *                 example: "+56911111111"
 *               rut:
 *                 type: string
 *                 example: 12345678-9
 *               fechaNacimiento:
 *                 type: string
 *                 example: "1990-05-15"
 *               genero:
 *                 type: string
 *                 enum: [masculino, femenino, otro]
 *               direccion:
 *                 type: string
 *               prevision:
 *                 type: string
 *                 enum: [fonasa, isapre, particular, otro]
 *               contactoEmergencia:
 *                 type: object
 *                 properties:
 *                   nombre:
 *                     type: string
 *                   telefono:
 *                     type: string
 *                   parentesco:
 *                     type: string
 *     responses:
 *       201:
 *         description: Paciente registrado
 *       409:
 *         description: RUT o email ya registrado
 */

/**
 * @swagger
 * /api/v1/pacientes/{id}:
 *   get:
 *     summary: Obtener paciente por ID
 *     tags: [Pacientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos del paciente
 *       404:
 *         description: No encontrado
 *   put:
 *     summary: Actualizar paciente
 *     tags: [Pacientes]
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
 *               apellido:
 *                 type: string
 *               telefono:
 *                 type: string
 *               direccion:
 *                 type: string
 *               prevision:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado correctamente
 *   delete:
 *     summary: Desactivar paciente
 *     tags: [Pacientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Desactivado correctamente
 */

/**
 * @swagger
 * /api/v1/pacientes/{id}/foto:
 *   put:
 *     summary: Subir o actualizar foto de perfil del paciente (Cloudinary)
 *     tags: [Pacientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [foto]
 *             properties:
 *               foto:
 *                 type: string
 *                 format: binary
 *                 description: Imagen JPG, PNG o WebP — máximo 2MB — recortada a 400x400
 *     responses:
 *       200:
 *         description: Foto actualizada — retorna URL de Cloudinary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensaje:
 *                   type: string
 *                 foto:
 *                   type: string
 *                   example: "https://res.cloudinary.com/tu_cloud/image/upload/medical-app/avatares/xyz.jpg"
 *       400:
 *         description: No se recibió ningún archivo
 *       404:
 *         description: Paciente no encontrado
 */

/**
 * @swagger
 * /api/v1/pacientes/mi-ficha:
 *   get:
 *     summary: Ficha del paciente autenticado
 *     tags: [Pacientes]
 *     responses:
 *       200:
 *         description: Datos de la ficha del paciente
 *       404:
 *         description: El usuario no tiene una ficha de paciente asociada
 */

const router = require('express').Router();
const { listar, obtener, crear, actualizar, eliminar, subirFoto, miFicha } = require('../../controllers/pacientes.controller');
const { authenticate, authorize, scopeDoctor } = require('../../middleware/auth');
const validar = require('../../middleware/validar');
const { uploadAvatar } = require('../../config/multer');
const { validarCrearPaciente } = require('../../middleware/validaciones/pacientes.validaciones');

// Ficha del paciente autenticado (sin permiso de módulo: es su propio dato).
// Debe ir antes de '/:id' para no ser capturada por esa ruta.
router.get('/mi-ficha', authenticate, miFicha);
router.get('/', authenticate, authorize('pacientes', 'leer'), scopeDoctor, listar);
router.get('/:id', authenticate, authorize('pacientes', 'leer'), scopeDoctor, obtener);
router.post('/', authenticate, authorize('pacientes', 'crear'), validarCrearPaciente, validar, crear);
router.put('/:id', authenticate, authorize('pacientes', 'editar'), actualizar);
router.delete('/:id', authenticate, authorize('pacientes', 'eliminar'), eliminar);
router.put('/:id/foto', authenticate, authorize('pacientes', 'editar'), uploadAvatar.single('foto'), subirFoto);

module.exports = router;
