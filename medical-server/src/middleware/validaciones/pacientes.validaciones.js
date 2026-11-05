// ═══════════════════════════════════════════════════════════════
// src/middleware/validaciones/pacientes.validaciones.js
// ═══════════════════════════════════════════════════════════════

const { body } = require('express-validator');

exports.validarCrearPaciente = [
  body('nombre').notEmpty().withMessage('El nombre es requerido'),
  body('apellido').notEmpty().withMessage('El apellido es requerido'),
  body('email')
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido'),
  body('rut').notEmpty().withMessage('El RUT es requerido'),
  body('fechaNacimiento')
    .notEmpty().withMessage('La fecha de nacimiento es requerida')
    .isISO8601().withMessage('Formato de fecha inválido'),
  body('genero')
    .notEmpty().withMessage('El género es requerido')
    .isIn(['masculino', 'femenino', 'otro']).withMessage('Género inválido'),
  body('prevision')
    .optional()
    .isIn(['fonasa', 'isapre', 'particular', 'otro']).withMessage('Previsión inválida')
];
