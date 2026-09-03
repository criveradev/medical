// ═══════════════════════════════════════════════════════════════
// src/middleware/validaciones/pagos.validaciones.js
// ═══════════════════════════════════════════════════════════════

const { body } = require('express-validator');

const metodos = ['efectivo', 'tarjeta', 'transferencia', 'fonasa', 'isapre'];
const estados = ['pendiente', 'pagado', 'anulado'];

exports.validarCrearPago = [
  body('citaId')
    .notEmpty().withMessage('La cita es requerida')
    .isMongoId().withMessage('ID de cita inválido'),
  body('pacienteId')
    .notEmpty().withMessage('El paciente es requerido')
    .isMongoId().withMessage('ID de paciente inválido'),
  body('monto')
    .notEmpty().withMessage('El monto es requerido')
    .isFloat({ min: 0 }).withMessage('El monto debe ser un número mayor o igual a 0'),
  body('metodo')
    .notEmpty().withMessage('El método de pago es requerido')
    .isIn(metodos).withMessage('Método de pago inválido')
];

exports.validarActualizarPago = [
  body('monto')
    .optional()
    .isFloat({ min: 0 }).withMessage('El monto debe ser un número mayor o igual a 0'),
  body('metodo')
    .optional()
    .isIn(metodos).withMessage('Método de pago inválido'),
  body('estado')
    .optional()
    .isIn(estados).withMessage('Estado inválido')
];
