// ═══════════════════════════════════════════════════════════════
// src/config/email.js — Configuración de Nodemailer
// ═══════════════════════════════════════════════════════════════

const nodemailer = require('nodemailer');
const logger     = require('./logger');

let transporter;

if (process.env.NODE_ENV === 'test') {
  // En tests no se envía correo real: transporte simulado para no depender de
  // SMTP (que sería lento o fallaría) y para no enviar correos durante las pruebas.
  transporter = {
    sendMail: async () => ({ messageId: 'test' }),
    verify:   () => {}
  };
} else if (process.env.RESEND_API_KEY) {
  // En producción con API HTTP de Resend (ver email.service.js) NO se usa SMTP:
  // se evita crear el transporte y el verify() para no provocar timeouts en
  // hosts que bloquean los puertos SMTP (Render free, Railway…).
  logger.info('Email vía API HTTP de Resend (sin SMTP)');
  transporter = {
    sendMail: async () => ({ messageId: 'resend-api' }),
    verify:   () => {}
  };
} else if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  // Verificar conexión al arrancar el servidor
  transporter.verify((error) => {
    if (error) {
      logger.warn(`Error conexión email: ${error.message}`);
    } else {
      logger.info('Servidor de email listo');
    }
  });
} else {
  logger.warn('Email no configurado — define RESEND_API_KEY o las variables SMTP');
  transporter = {
    sendMail: async () => {
      const error = new Error('Servicio de email no configurado');
      error.status = 503;
      throw error;
    },
    verify: () => {},
  };
}

module.exports = transporter;
