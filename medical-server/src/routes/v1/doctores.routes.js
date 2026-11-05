/**
 * @swagger
 * tags:
 *   name: Doctores
 *   description: Gestión de doctores y horarios
 */

/**
 * @swagger
 * /api/v1/doctores:
 *   get:
 *     summary: Listar doctores con paginación
 *     tags: [Doctores]
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
 *         name: especialidadId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista paginada de doctores
 *   post:
 *     summary: Crear perfil de doctor
 *     tags: [Doctores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuarioId, especialidadId, matricula]
 *             properties:
 *               usuarioId:
 *                 type: string
 *               especialidadId:
 *                 type: string
 *               matricula:
 *                 type: string
 *                 example: MED-001
 *               duracionConsulta:
 *                 type: integer
 *                 example: 30
 *               horarios:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dia:
 *                       type: string
 *                       enum: [lunes, martes, miercoles, jueves, viernes, sabado, domingo]
 *                     horaInicio:
 *                       type: string
 *                       example: "08:00"
 *                     horaFin:
 *                       type: string
 *                       example: "17:00"
 *     responses:
 *       201:
 *         description: Doctor creado
 *       400:
 *         description: El usuario debe tener rol doctor
 *       409:
 *         description: Matrícula ya registrada
 */

/**
 * @swagger
 * /api/v1/doctores/disponibilidad/{doctorId}:
 *   get:
 *     summary: Ver slots disponibles del doctor para una fecha
 *     tags: [Doctores]
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
 *         description: Lista de slots con disponibilidad
 */

/**
 * @swagger
 * /api/v1/doctores/{id}:
 *   get:
 *     summary: Obtener doctor por ID
 *     tags: [Doctores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos del doctor
 *       404:
 *         description: No encontrado
 *   put:
 *     summary: Actualizar doctor
 *     tags: [Doctores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Actualizado correctamente
 */

/**
 * @swagger
 * /api/v1/doctores/{id}/horarios:
 *   put:
 *     summary: Actualizar horarios del doctor
 *     tags: [Doctores]
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
 *             properties:
 *               horarios:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dia:
 *                       type: string
 *                     horaInicio:
 *                       type: string
 *                     horaFin:
 *                       type: string
 *     responses:
 *       200:
 *         description: Horarios actualizados
 */

/**
 * @swagger
 * /api/v1/doctores/{id}/foto:
 *   put:
 *     summary: Subir o actualizar foto de perfil del doctor (Cloudinary)
 *     tags: [Doctores]
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
 *         description: Doctor no encontrado
 */

/**
 * @swagger
 * /api/v1/doctores/mi-perfil:
 *   get:
 *     summary: Perfil del doctor autenticado
 *     tags: [Doctores]
 *     responses:
 *       200:
 *         description: Datos del doctor (incluye especialidad y matrícula)
 *       404:
 *         description: El usuario no tiene un perfil de doctor asociado
 */

/**
 * @swagger
 * /api/v1/doctores/siguiente-matricula:
 *   get:
 *     summary: Previsualiza la próxima matrícula a asignar (MED-####)
 *     tags: [Doctores]
 *     responses:
 *       200:
 *         description: Matrícula sugerida (por ejemplo MED-0007)
 */

const router = require('express').Router();
const { listar, obtener, crear, actualizar, actualizarHorarios, disponibilidad, subirFoto, siguienteMatricula, miPerfil } = require('../../controllers/doctores.controller');
const { authenticate, authorize, scopeDoctor } = require('../../middleware/auth');
const { uploadAvatar } = require('../../config/multer');

router.get('/disponibilidad/:doctorId', authenticate, authorize('citas', 'leer'), scopeDoctor, disponibilidad);
// Perfil del doctor autenticado (sin permiso de módulo: es su propio dato)
router.get('/mi-perfil', authenticate, miPerfil);
// Previsualiza la matrícula que se asignará al próximo doctor (debe ir antes de '/:id')
router.get('/siguiente-matricula', authenticate, authorize('doctores', 'crear'), siguienteMatricula);
router.get('/', authenticate, authorize('doctores', 'leer'), listar);
router.get('/:id', authenticate, authorize('doctores', 'leer'), obtener);
router.post('/', authenticate, authorize('doctores', 'crear'), crear);
router.put('/:id', authenticate, authorize('doctores', 'editar'), actualizar);
router.put('/:id/horarios', authenticate, authorize('doctores', 'editar'), actualizarHorarios);
router.put('/:id/foto', authenticate, authorize('doctores', 'editar'), uploadAvatar.single('foto'), subirFoto);

module.exports = router;
