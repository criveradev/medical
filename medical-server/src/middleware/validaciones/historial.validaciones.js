// ═══════════════════════════════════════════════════════════════
// src/middleware/validaciones/historial.validaciones.js
// ═══════════════════════════════════════════════════════════════

const { body } = require('express-validator');

exports.validarCrearHistorial = [
  body('pacienteId')
    .notEmpty().withMessage('El paciente es requerido')
    .isMongoId().withMessage('ID de paciente inválido'),
  body('citaId')
    .notEmpty().withMessage('La cita es requerida')
    .isMongoId().withMessage('ID de cita inválido'),
  body('doctorId')
    .notEmpty().withMessage('El doctor es requerido')
    .isMongoId().withMessage('ID de doctor inválido'),
  body('diagnostico')
    .notEmpty().withMessage('El diagnóstico es requerido')
    .isLength({ min: 3 }).withMessage('El diagnóstico debe tener al menos 3 caracteres'),
  body('proximaCita')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Formato de fecha de próxima cita inválido')
];
