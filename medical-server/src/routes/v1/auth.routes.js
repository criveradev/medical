/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación y gestión de usuarios del staff
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@medical.com
 *               password:
 *                 type: string
 *                 example: Admin1234
 *     responses:
 *       200:
 *         description: Login exitoso — retorna accessToken y refreshToken
 *       401:
 *         description: Credenciales inválidas
 */

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Renovar access token usando el refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nuevos tokens generados
 *       401:
 *         description: Refresh token inválido o expirado
 */

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Cerrar sesión e invalidar refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 */

/**
 * @swagger
 * /api/v1/auth/perfil:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Datos del usuario y su rol
 */

/**
 * @swagger
 * /api/v1/auth/cambiar-password:
 *   put:
 *     summary: Cambiar contraseña del usuario autenticado
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [passwordActual, passwordNueva]
 *             properties:
 *               passwordActual:
 *                 type: string
 *                 example: Admin1234
 *               passwordNueva:
 *                 type: string
 *                 example: NuevoPassword123
 *     responses:
 *       200:
 *         description: Contraseña actualizada — se invalida el refresh token
 *       401:
 *         description: Contraseña actual incorrecta
 */

/**
 * @swagger
 * /api/v1/auth/usuarios:
 *   get:
 *     summary: Listar usuarios del staff
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *   post:
 *     summary: Crear usuario del staff
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, email, password, rolNombre]
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               rolNombre:
 *                 type: string
 *                 enum: [administrador, recepcionista, enfermero, doctor, paciente]
 *               telefono:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado
 *       409:
 *         description: Email ya registrado
 */

/**
 * @swagger
 * /api/v1/auth/usuarios/{id}:
 *   put:
 *     summary: Actualizar usuario
 *     tags: [Auth]
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
 *               email:
 *                 type: string
 *               telefono:
 *                 type: string
 *               rolNombre:
 *                 type: string
 *               activo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: No encontrado
 *   delete:
 *     summary: Desactivar usuario
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario desactivado
 */

/**
 * @swagger
 * /api/v1/auth/perfil/foto:
 *   put:
 *     summary: Subir o actualizar la foto de perfil del usuario autenticado
 *     tags: [Auth]
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
 *                 description: Imagen JPG, PNG o WebP — máx. 2 MB — recortada a 400x400
 *     responses:
 *       200:
 *         description: Foto actualizada — retorna la URL de Cloudinary
 *       400:
 *         description: No se recibió ningún archivo
 */

const router = require('express').Router();
const {
    login,
    csrf,
    refresh,
    logout,
    perfil,
    cambiarPassword,
    subirFotoPerfil,
    crearUsuario,
    listarUsuarios,
    actualizarUsuario,
    eliminarUsuario,
    revocarSesiones,
    verificarMfaLogin,
    iniciarMfa,
    confirmarMfa,
    deshabilitarMfa,
    resetMfa
} = require('../../controllers/auth.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { limiterLogin } = require('../../middleware/rateLimiters');
const validar = require('../../middleware/validar');
const { uploadAvatar } = require('../../config/multer');
const { validarLogin, validarCrearUsuario } = require('../../middleware/validaciones/auth.validaciones');

// ── Públicas ──────────────────────────────────────────────────────────────────
router.post('/login', limiterLogin, validarLogin, validar, login);
router.get('/csrf', csrf);
router.post('/refresh', refresh);
router.post('/mfa/verify', limiterLogin, verificarMfaLogin);

// ── Autenticado (cualquier rol) ───────────────────────────────────────────────
router.post('/logout', authenticate, logout);
router.get('/perfil', authenticate, perfil);
router.put('/perfil/foto', authenticate, uploadAvatar.single('foto'), subirFotoPerfil);
router.put('/cambiar-password', authenticate, cambiarPassword);
router.post('/mfa/setup', authenticate, iniciarMfa);
router.post('/mfa/confirm', authenticate, confirmarMfa);
router.post('/mfa/disable', authenticate, deshabilitarMfa);

// ── Solo administrador ────────────────────────────────────────────────────────
router.post('/usuarios', authenticate, authorize('usuarios', 'crear'), validarCrearUsuario, validar, crearUsuario);
router.get('/usuarios', authenticate, authorize('usuarios', 'leer'), listarUsuarios);
router.put('/usuarios/:id', authenticate, authorize('usuarios', 'editar'), actualizarUsuario);
router.delete('/usuarios/:id', authenticate, authorize('usuarios', 'eliminar'), eliminarUsuario);
router.post('/usuarios/:id/revocar-sesiones', authenticate, authorize('usuarios', 'editar'), revocarSesiones);
router.delete('/usuarios/:id/mfa', authenticate, authorize('usuarios', 'editar'), resetMfa);

module.exports = router;
