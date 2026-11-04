// ═══════════════════════════════════════════════════════════════
// src/middleware/validaciones/auth.validaciones.js
// ═══════════════════════════════════════════════════════════════

const { body } = require('express-validator');

exports.validarLogin = [
  body('email')
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('Mínimo 6 caracteres')
];

exports.validarCrearUsuario = [
  body('nombre')
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2 }).withMessage('Mínimo 2 caracteres'),
  body('apellido')
    .notEmpty().withMessage('El apellido es requerido'),
  body('email')
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Za-z]/).withMessage('Debe incluir al menos una letra')
    .matches(/\d/).withMessage('Debe incluir al menos un número'),
  body('rolNombre')
    .notEmpty().withMessage('El rol es requerido')
    .isIn(['administrador', 'recepcionista', 'enfermero', 'doctor', 'paciente'])
    .withMessage('Rol inválido')
];
