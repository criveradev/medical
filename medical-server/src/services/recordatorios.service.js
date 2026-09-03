// ═══════════════════════════════════════════════════════════════
// src/services/recordatorios.service.js — Cron de recordatorios
// ═══════════════════════════════════════════════════════════════

const cron   = require('node-cron');
const Cita   = require('../models/Cita');
const logger = require('../config/logger');
const { enviarRecordatorioCita } = require('./email.service');
const { DateTime } = require('luxon');
const { APP_TIME_ZONE } = require('../lib/fecha');
const distributedLock = require('./distributed-lock.service');

const LOCK_TTL_MS = 30 * 60 * 1000;

const ejecutarRecordatorios = async () => {
  const lock = await distributedLock.acquire('recordatorios-diarios', LOCK_TTL_MS);
  if (!lock) {
    logger.info('Recordatorios omitidos: otra instancia posee el lock');
    return;
  }

  logger.info('Ejecutando cron de recordatorios...');

  try {
    const diaManana = DateTime.now().setZone(APP_TIME_ZONE).plus({ days: 1 });
    const manana = diaManana.startOf('day').toUTC().toJSDate();
    const finManana = diaManana.endOf('day').toUTC().toJSDate();

    const citas = await Cita.find({
      fechaHora: { $gte: manana, $lte: finManana },
      estado: { $in: ['pendiente', 'confirmada'] }
    })
    .populate({
      path: 'pacienteId',
      populate: { path: 'usuarioId', select: 'nombre apellido email' }
    })
    .populate({
      path: 'doctorId',
      populate: { path: 'usuarioId', select: 'nombre apellido' }
    });

    logger.info(`Recordatorios: ${citas.length} citas encontradas para mañana`);

    for (const cita of citas) {
      const claimedAt = new Date();
      const staleClaim = new Date(claimedAt.getTime() - 15 * 60 * 1000);
      try {
        const claimed = await Cita.findOneAndUpdate(
          {
            _id: cita._id,
            recordatorioEnviadoAt: null,
            $or: [
              { recordatorioClaimedAt: null },
              { recordatorioClaimedAt: { $lt: staleClaim } },
            ],
          },
          { $set: { recordatorioClaimedAt: claimedAt } },
          { returnDocument: 'after' }
        );
        if (!claimed) continue;

        const pacienteUser = cita.pacienteId.usuarioId;
        const doctorUser = cita.doctorId.usuarioId;

        await enviarRecordatorioCita({
          pacienteNombre: `${pacienteUser.nombre} ${pacienteUser.apellido}`,
          pacienteEmail: pacienteUser.email,
          doctorNombre: `Dr. ${doctorUser.nombre} ${doctorUser.apellido}`,
          fechaHora: cita.fechaHora,
          motivo: cita.motivo
        });

        await Cita.updateOne(
          { _id: cita._id, recordatorioClaimedAt: claimedAt },
          { $set: { recordatorioEnviadoAt: new Date() }, $unset: { recordatorioClaimedAt: 1 } }
        );

        logger.info(`Recordatorio enviado para cita ${cita._id}`);
      } catch (error) {
        try {
          await Cita.updateOne(
            { _id: cita._id, recordatorioClaimedAt: claimedAt },
            { $unset: { recordatorioClaimedAt: 1 } }
          );
        } catch (releaseError) {
          logger.warn(`No se pudo liberar el claim del recordatorio ${cita._id}: ${releaseError.message}`);
        }
        logger.error(`Error enviando recordatorio para cita ${cita._id}: ${error.message}`);
      }
    }
  } finally {
    await lock.release();
  }
};

/**
 * Inicia el cron diario (09:00) que busca las citas pendientes/confirmadas del
 * día siguiente y envía un email recordatorio a cada paciente.
 * @returns {void}
 */
const iniciarRecordatorios = () => {
  if (process.env.ENABLE_REMINDER_CRON === 'false') {
    logger.info('Cron de recordatorios deshabilitado');
    return null;
  }

  // Ejecutar todos los días a las 9:00 AM
  const task = cron.schedule('0 9 * * *', async () => {
    try {
      await ejecutarRecordatorios();
    } catch (error) {
      logger.error(`Error en cron recordatorios: ${error.message}`);
    }
  }, { timezone: APP_TIME_ZONE });

  logger.info(`Cron de recordatorios iniciado — 09:00 (${APP_TIME_ZONE})`);
  return task;
};

module.exports = iniciarRecordatorios;
module.exports.ejecutarRecordatorios = ejecutarRecordatorios;
