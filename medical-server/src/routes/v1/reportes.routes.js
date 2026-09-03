/**
 * @swagger
 * tags:
 *   name: Reportes
 *   description: Estadísticas y reportes del sistema
 */

/**
 * @swagger
 * /api/v1/reportes/doctor/{doctorId}:
 *   get:
 *     summary: Reporte de atenciones del doctor
 *     tags: [Reportes]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
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
 *         description: Reporte con atenciones, pacientes únicos, citas por mes y diagnósticos frecuentes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodo:
 *                   type: object
 *                   properties:
 *                     desde:
 *                       type: string
 *                     hasta:
 *                       type: string
 *                 resumen:
 *                   type: object
 *                   properties:
 *                     totalAtenciones:
 *                       type: integer
 *                     totalPacientesUnicos:
 *                       type: integer
 *                     citasPorEstado:
 *                       type: array
 *                     citasPorMes:
 *                       type: array
 *                 ultimasAtenciones:
 *                   type: array
 *                 diagnosticosFrecuentes:
 *                   type: array
 */

/**
 * @swagger
 * /api/v1/reportes/admin:
 *   get:
 *     summary: Reporte general del sistema — solo administrador
 *     tags: [Reportes]
 *     parameters:
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
 *         description: Reporte con total pacientes, recaudación y citas por mes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodo:
 *                   type: object
 *                 resumen:
 *                   type: object
 *                   properties:
 *                     totalPacientes:
 *                       type: integer
 *                     totalRecaudado:
 *                       type: number
 *                     citasPorEstado:
 *                       type: array
 *                     citasPorMes:
 *                       type: array
 */


/**
 * @swagger
 * /api/v1/reportes/doctor/{doctorId}/pdf:
 *   get:
 *     summary: Descargar reporte del doctor en PDF
 *     tags: [Reportes]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
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
 *         description: Archivo PDF descargado
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /api/v1/reportes/doctor/{doctorId}/excel:
 *   get:
 *     summary: Descargar reporte del doctor en Excel (.xlsx)
 *     tags: [Reportes]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
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
 *         description: Archivo Excel descargado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */

const router = require('express').Router();
const { reporteDoctor, reporteAdmin, reporteDoctorPDF, reporteDoctorExcel } = require('../../controllers/reportes.controller');
const { authenticate, authorize, requireRole, scopeDoctor } = require('../../middleware/auth');

// Rutas específicas ANTES de la genérica para evitar conflictos de matching
router.get('/doctor/:doctorId/pdf',   authenticate, authorize('reportes', 'leer'), scopeDoctor, reporteDoctorPDF);
router.get('/doctor/:doctorId/excel', authenticate, authorize('reportes', 'leer'), scopeDoctor, reporteDoctorExcel);
router.get('/doctor/:doctorId',       authenticate, authorize('reportes', 'leer'), scopeDoctor, reporteDoctor);
router.get('/admin',                  authenticate, requireRole('administrador'), authorize('reportes', 'leer'), reporteAdmin);

module.exports = router;
