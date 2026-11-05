// ═══════════════════════════════════════════════════════════════
// src/middleware/validaciones/citas.validaciones.js
// ═══════════════════════════════════════════════════════════════

const { body } = require('express-validator');

exports.validarCrearCita = [
  body('pacienteId')
    .notEmpty().withMessage('El paciente es requerido')
    .isMongoId().withMessage('ID de paciente inválido'),
  body('doctorId')
    .notEmpty().withMessage('El doctor es requerido')
    .isMongoId().withMessage('ID de doctor inválido'),
  body('fechaHora')
    .notEmpty().withMessage('La fecha y hora es requerida')
    .isISO8601().withMessage('Formato de fecha inválido'),
  body('motivo')
    .notEmpty().withMessage('El motivo es requerido')
    .isLength({ min: 5 }).withMessage('Mínimo 5 caracteres'),
  body('tipo')
    .notEmpty().withMessage('El tipo es requerido')
    .isIn(['primera_vez', 'control', 'urgencia']).withMessage('Tipo inválido')
];

exports.validarCambiarEstado = [
  body('estado')
    .notEmpty().withMessage('El estado es requerido')
    .isIn(['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'])
    .withMessage('Estado inválido')
];
