// ═══════════════════════════════════════════════════════════════
// src/services/email.service.js — Servicio de envío de emails
// ═══════════════════════════════════════════════════════════════

const transporter = require('../config/email');

// Remitente de los correos. En proveedores transaccionales (Resend, SendGrid…)
// el usuario SMTP no es una dirección válida de envío, así que se usa EMAIL_FROM
// (una dirección verificada); si no se define, cae a EMAIL_USER (caso iCloud/Gmail).
const REMITENTE = `"Medical" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

/**
 * Envía un correo. Si RESEND_API_KEY está definida, usa la API HTTP de Resend
 * (puerto 443) — necesario en hosts que bloquean SMTP (Render free, Railway…).
 * Si no, cae a SMTP vía Nodemailer (ideal para desarrollo local).
 * @param {{to: string, subject: string, html: string}} param0 - Destinatario, asunto y cuerpo HTML.
 * @returns {Promise<void>}
 */
const enviar = async ({ to, subject, html }) => {
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
      }),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      throw new Error(`Resend API ${res.status}: ${detalle}`);
    }
    return;
  }
  // Fallback: SMTP (desarrollo local)
  await transporter.sendMail({ from: REMITENTE, to, subject, html });
};

/**
 * Envía email de recordatorio de cita (24h antes)
 * Llamado por el cron de recordatorios.service.js
 */
exports.enviarRecordatorioCita = async ({ pacienteNombre, pacienteEmail, doctorNombre, fechaHora, motivo }) => {
  const fecha = new Date(fechaHora).toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const hora = new Date(fechaHora).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit'
  });

  await enviar({
    to:      pacienteEmail,
    subject: '🏥 Recordatorio de cita médica',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Recordatorio de cita médica</h2>
        <p>Estimado/a <strong>${pacienteNombre}</strong>,</p>
        <p>Le recordamos que tiene una cita médica programada para mañana:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>👨‍⚕️ Doctor:</strong> ${doctorNombre}</p>
          <p><strong>📅 Fecha:</strong> ${fecha}</p>
          <p><strong>🕐 Hora:</strong> ${hora}</p>
          <p><strong>📋 Motivo:</strong> ${motivo}</p>
        </div>
        <p>Por favor llegue 10 minutos antes de su cita.</p>
        <p>Si necesita cancelar, contáctenos con anticipación.</p>
        <hr/>
        <p style="color: #6b7280; font-size: 12px;">Medical App — Sistema de citas médicas</p>
      </div>
    `
  });
};

/**
 * Envía email cuando se agenda (crea) una cita.
 * Llamado por citas.controller.js al crear la cita.
 */
exports.enviarCitaAgendada = async ({ pacienteNombre, pacienteEmail, doctorNombre, fechaHora, motivo }) => {
  const fecha = new Date(fechaHora).toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const hora = new Date(fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  await enviar({
    to:      pacienteEmail,
    subject: '📅 Cita médica agendada',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Cita agendada</h2>
        <p>Estimado/a <strong>${pacienteNombre}</strong>,</p>
        <p>Su cita médica ha sido agendada con éxito. Estos son los detalles:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>👨‍⚕️ Doctor:</strong> ${doctorNombre}</p>
          <p><strong>📅 Fecha:</strong> ${fecha}</p>
          <p><strong>🕐 Hora:</strong> ${hora}</p>
          <p><strong>📋 Motivo:</strong> ${motivo}</p>
        </div>
        <p>Le avisaremos cuando su cita sea confirmada. Por favor llegue 10 minutos antes.</p>
        <hr/>
        <p style="color: #6b7280; font-size: 12px;">Medical App — Sistema de citas médicas</p>
      </div>
    `
  });
};

/**
 * Envía email cuando se sube un nuevo resultado médico del paciente.
 * Llamado por resultados.controller.js al crear un resultado.
 */
exports.enviarNuevoResultado = async ({ pacienteNombre, pacienteEmail, tipo, nombre, doctorNombre }) => {
  await enviar({
    to:      pacienteEmail,
    subject: '🧪 Nuevo resultado médico disponible',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Tienes un nuevo resultado</h2>
        <p>Estimado/a <strong>${pacienteNombre}</strong>,</p>
        <p>Se ha cargado un nuevo resultado médico en tu ficha:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>🧪 Examen:</strong> ${nombre}</p>
          <p><strong>📂 Tipo:</strong> ${tipo}</p>
          <p><strong>👨‍⚕️ Profesional:</strong> ${doctorNombre}</p>
        </div>
        <p>Puedes consultarlo y descargarlo desde tu portal, en la sección <strong>Mis resultados</strong>.</p>
        <hr/>
        <p style="color: #6b7280; font-size: 12px;">Medical App — Sistema de citas médicas</p>
      </div>
    `
  });
};

/**
 * Envía email cuando una cita se cancela.
 * Llamado por citas.controller.js al cambiar el estado a 'cancelada'.
 */
exports.enviarCancelacionCita = async ({ pacienteNombre, pacienteEmail, doctorNombre, fechaHora, motivoCancelacion }) => {
  const fecha = new Date(fechaHora).toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const hora = new Date(fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  await enviar({
    to:      pacienteEmail,
    subject: '❌ Cita médica cancelada',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Cita cancelada</h2>
        <p>Estimado/a <strong>${pacienteNombre}</strong>,</p>
        <p>Le informamos que su cita médica ha sido cancelada:</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>👨‍⚕️ Doctor:</strong> ${doctorNombre}</p>
          <p><strong>📅 Fecha:</strong> ${fecha}</p>
          <p><strong>🕐 Hora:</strong> ${hora}</p>
          ${motivoCancelacion ? `<p><strong>📝 Motivo:</strong> ${motivoCancelacion}</p>` : ''}
        </div>
        <p>Si lo desea, puede agendar una nueva cita cuando guste.</p>
        <hr/>
        <p style="color: #6b7280; font-size: 12px;">Medical App — Sistema de citas médicas</p>
      </div>
    `
  });
};

/**
 * Envía email de confirmación cuando una cita cambia a estado 'confirmada'
 * Llamado por citas.controller.js al cambiar el estado
 */
exports.enviarConfirmacionCita = async ({ pacienteNombre, pacienteEmail, doctorNombre, fechaHora, motivo }) => {
  const fecha = new Date(fechaHora).toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const hora = new Date(fechaHora).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit'
  });

  await enviar({
    to:      pacienteEmail,
    subject: '✅ Cita médica confirmada',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Cita confirmada</h2>
        <p>Estimado/a <strong>${pacienteNombre}</strong>,</p>
        <p>Su cita médica ha sido confirmada exitosamente:</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>👨‍⚕️ Doctor:</strong> ${doctorNombre}</p>
          <p><strong>📅 Fecha:</strong> ${fecha}</p>
          <p><strong>🕐 Hora:</strong> ${hora}</p>
          <p><strong>📋 Motivo:</strong> ${motivo}</p>
        </div>
        <p>Por favor llegue 10 minutos antes de su cita.</p>
        <p>Si necesita cancelar, contáctenos con anticipación.</p>
        <hr/>
        <p style="color: #6b7280; font-size: 12px;">Medical App — Sistema de citas médicas</p>
      </div>
    `
  });
};
