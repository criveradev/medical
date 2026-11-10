// ═══════════════════════════════════════════════════════════════
// src/services/email.service.js — Servicio de envío de emails
// ═══════════════════════════════════════════════════════════════

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const transporter = require('../config/email');
const { LOGO_CID, renderizarEmail } = require('../templates/email');

// Versión PNG de medical-client/public/favicon.svg para los clientes de correo.
const LOGO = readFileSync(join(__dirname, '../assets/medical-email.png'));
const LOGO_ARCHIVO = 'medical.png';

// Remitente de los correos. En proveedores transaccionales (Resend, SendGrid…)
// el usuario SMTP no es una dirección válida de envío, así que se usa EMAIL_FROM
// (una dirección verificada); si no se define, cae a EMAIL_USER (caso iCloud/Gmail).
const REMITENTE = `"Medical" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

/**
 * Envía un correo. Si RESEND_API_KEY está definida, usa la API HTTP de Resend
 * (puerto 443) — necesario en hosts que bloquean SMTP (Render free, Railway…).
 * Si no, cae a SMTP vía Nodemailer (ideal para desarrollo local).
 * @param {{to: string, subject: string, html: string, text: string}} param0 - Contenido del correo.
 * @returns {Promise<void>}
 */
const enviar = async ({ to, subject, html, text }) => {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        accept:         'application/json',
      },
      body: JSON.stringify({
        from:    REMITENTE,
        to:      [to],
        subject,
        html,
        text,
        attachments: [{
          filename: LOGO_ARCHIVO,
          content: LOGO.toString('base64'),
          content_type: 'image/png',
          content_id: LOGO_CID,
        }],
      }),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`Resend API ${res.status}: ${detalle}`);
    }
    return;
  }
  // Fallback: SMTP (desarrollo local)
  await transporter.sendMail({
    from: REMITENTE, to, subject, html, text,
    attachments: [{ filename: LOGO_ARCHIVO, content: LOGO, contentType: 'image/png', cid: LOGO_CID }],
  });
};

function enviarCita(
  { pacienteNombre, pacienteEmail, doctorNombre, fechaHora, motivo },
  { subject, titulo, mensaje, notas },
) {
  const instante = new Date(fechaHora);
  const fecha = instante.toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const hora = instante.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const detalles = [['Profesional', doctorNombre], ['Fecha', fecha], ['Hora', hora]];
  if (motivo) detalles.push(['Motivo', motivo]);

  return enviar({
    to: pacienteEmail,
    subject,
    ...renderizarEmail({ titulo, saludo: `Hola, ${pacienteNombre}.`, mensaje, detalles, notas }),
  });
}

exports.enviarRecordatorioCita = datos => enviarCita(datos, {
  subject: '🏥 Recordatorio de cita médica',
  titulo: 'Recordatorio de cita médica',
  mensaje: 'Te recordamos que tienes una cita programada para mañana.',
  notas: ['Llega 10 minutos antes de la cita.', 'Si necesitas cancelar, contáctanos con anticipación.'],
});

exports.enviarCitaAgendada = datos => enviarCita(datos, {
  subject: '📅 Cita médica agendada',
  titulo: 'Cita agendada',
  mensaje: 'Agendamos tu cita médica con los siguientes datos.',
  notas: ['Te avisaremos cuando la cita esté confirmada.', 'Llega 10 minutos antes de la cita.'],
});

exports.enviarConfirmacionCita = datos => enviarCita(datos, {
  subject: '✅ Cita médica confirmada',
  titulo: 'Cita confirmada',
  mensaje: 'Confirmamos tu cita médica.',
  notas: ['Llega 10 minutos antes de la cita.'],
});

exports.enviarCancelacionCita = ({ motivoCancelacion, ...datos }) => enviarCita(
  { ...datos, motivo: motivoCancelacion },
  {
    subject: '❌ Cita médica cancelada',
    titulo: 'Cita cancelada',
    mensaje: 'Tu cita médica fue cancelada.',
    notas: ['Puedes agendar una nueva cita desde el portal.'],
  },
);

exports.enviarNuevoResultado = ({ pacienteNombre, pacienteEmail, tipo, nombre, doctorNombre }) => enviar({
  to: pacienteEmail,
  subject: '🧪 Nuevo resultado médico disponible',
  ...renderizarEmail({
    titulo: 'Nuevo resultado médico',
    saludo: `Hola, ${pacienteNombre}.`,
    mensaje: 'Hay un nuevo resultado médico disponible en tu ficha.',
    detalles: [['Examen', nombre], ['Tipo', tipo], ['Profesional', doctorNombre]],
    notas: ['Puedes consultarlo y descargarlo desde la sección «Mis resultados» del portal.'],
  }),
});

exports.enviarVerificacionRegistro = ({ email, codigo }) => enviar({
  to: email,
  subject: 'Verifica tu correo en Medical',
  ...renderizarEmail({
    titulo: 'Verifica tu correo',
    mensaje: 'Ingresa este código de seis dígitos en el formulario de registro de Medical.',
    codigo,
    notas: ['El código vence en 15 minutos.'],
  }),
});

exports.enviarActivacionPaciente = ({ email, enlace }) => enviar({
  to: email,
  subject: 'Activa tu cuenta de Medical',
  ...renderizarEmail({
    titulo: 'Activa tu cuenta',
    mensaje: 'Usa esta invitación para elegir tu contraseña y acceder al portal de pacientes.',
    accion: { url: enlace, texto: 'Activar cuenta' },
    notas: ['El enlace es de un solo uso y vence en 24 horas. Si no esperabas esta invitación, ignora el mensaje.'],
  }),
});
