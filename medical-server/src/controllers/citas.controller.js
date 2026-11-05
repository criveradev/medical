// ═══════════════════════════════════════════════════════════════
// src/controllers/citas.controller.js
// Lógica de negocio para citas médicas
// Incluye: verificación de disponibilidad, notificaciones Socket.io y email
// ═══════════════════════════════════════════════════════════════

const Cita     = require('../models/Cita');
const Doctor   = require('../models/Doctor');
const Paciente = require('../models/Paciente');
const { enviarConfirmacionCita, enviarCancelacionCita, enviarCitaAgendada } = require('../services/email.service');
const notificaciones = require('../services/notificaciones.service');
const logger         = require('../config/logger');
const { diaSemana, instanteLocal, rangoDia } = require('../lib/fecha');
const {
  ESTADOS_SIN_RESERVA,
  existeSolape,
  httpError,
  validarHorarioDoctor,
} = require('../services/citas.service');
const distributedLock = require('../services/distributed-lock.service');

const withDoctorScheduleLock = async (doctorId, operation) => {
  const lock = await distributedLock.acquire(`agenda-doctor:${doctorId}`, 15_000);
  if (!lock) throw httpError(409, 'La agenda está siendo actualizada; intenta nuevamente');
  try {
    return await operation();
  } finally {
    await lock.release();
  }
};

// Populate anidado reutilizable para citas
const populateCita = [
  { path: 'pacienteId', populate: { path: 'usuarioId', select: 'nombre apellido email telefono' } },
  { path: 'doctorId',   populate: [
    { path: 'usuarioId',     select: 'nombre apellido' },
    { path: 'especialidadId', select: 'nombre' }
  ]}
];

/**
 * Lista citas con paginación y filtros (estado, doctor, fecha). Si el solicitante
 * es paciente (req.pacienteScope), se restringe a sus propias citas.
 * @route GET /api/v1/citas
 * @param {import('express').Request} req - query: { page, limit, estado, doctorId, fecha }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, pagina, totalPaginas, citas }.
 */
exports.listar = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const { estado, doctorId, fecha } = req.query;
    const filtro = {};

    if (estado)   filtro.estado   = estado;
    if (doctorId) filtro.doctorId = doctorId;
    if (req.doctorScope) filtro.doctorId = req.doctorScope;
    // Un paciente solo ve sus propias citas
    if (req.pacienteScope) filtro.pacienteId = req.pacienteScope;
    if (fecha) {
      const { inicio, fin } = rangoDia(fecha);
      filtro.fechaHora = { $gte: inicio, $lte: fin };
    }

    const total = await Cita.countDocuments(filtro);
    const citas = await Cita.find(filtro)
      .populate(populateCita)
      .skip(skip).limit(limit).sort({ fechaHora: 1 });

    res.json({ total, pagina: page, totalPaginas: Math.ceil(total / limit), citas });
  } catch (error) {
    next(error);
  }
};

/**
 * Devuelve una cita por ID con populate profundo (paciente, doctor, especialidad).
 * Un paciente solo puede ver su propia cita.
 * @route GET /api/v1/citas/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { cita } | 403 ajena | 404 no encontrada.
 */
exports.obtener = async (req, res, next) => {
  try {
    const cita = await Cita.findById(req.params.id).populate(populateCita);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    // Un paciente solo puede ver su propia cita
    if (req.pacienteScope) {
      const pid = String(cita.pacienteId?._id || cita.pacienteId);
      if (pid !== req.pacienteScope)
        return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });
    }

    if (req.doctorScope) {
      const did = String(cita.doctorId?._id || cita.doctorId);
      if (did !== req.doctorScope)
        return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });
    }

    res.json({ cita });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea una cita. Verifica que existan doctor y paciente, comprueba la
 * disponibilidad del doctor (detección de solapamientos), notifica por Socket.io
 * y envía email de "cita agendada" al paciente.
 * @route POST /api/v1/citas
 * @param {import('express').Request} req - body: { pacienteId, doctorId, fechaHora, motivo, tipo, observaciones }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 201 { cita } | 404 doctor/paciente | 409 horario ocupado.
 */
exports.crear = async (req, res, next) => {
  try {
    const { pacienteId, doctorId, fechaHora, motivo, tipo, observaciones } = req.body;

    const doctor   = await Doctor.findOne({ _id: doctorId, activo: true }).populate('usuarioId', 'nombre apellido');
    if (!doctor)   return res.status(404).json({ mensaje: 'Doctor no encontrado' });
    const paciente = await Paciente.findOne({ _id: pacienteId, activo: true }).populate('usuarioId', 'nombre apellido email');
    if (!paciente) return res.status(404).json({ mensaje: 'Paciente no encontrado' });

    const fechaCita = new Date(fechaHora);
    const duracion  = doctor.duracionConsulta || 30;
    const cita = await withDoctorScheduleLock(doctorId, async () => {
      validarHorarioDoctor(doctor, fechaCita);
      const haySolape = await existeSolape({ doctorId, fechaHora: fechaCita, duracion });
      if (haySolape) throw httpError(409, 'El doctor ya tiene una cita en ese horario');
      try {
        return await Cita.create({ pacienteId, doctorId, fechaHora, motivo, tipo, observaciones });
      } catch (error) {
        if (error.code === 11000) throw httpError(409, 'El doctor ya tiene una cita en ese horario');
        throw error;
      }
    });

    // Notificar en tiempo real al doctor y admins
    notificaciones.citaCreada(cita);

    // Enviar email al paciente avisando que su cita fue agendada
    try {
      if (paciente.usuarioId?.email) {
        await enviarCitaAgendada({
          pacienteNombre: `${paciente.usuarioId.nombre} ${paciente.usuarioId.apellido}`,
          pacienteEmail:  paciente.usuarioId.email,
          doctorNombre:   doctor.usuarioId ? `Dr. ${doctor.usuarioId.nombre} ${doctor.usuarioId.apellido}` : 'Profesional',
          fechaHora,
          motivo
        });
      }
    } catch (emailError) {
      logger.error(`Error enviando email de cita agendada: ${emailError.message}`);
    }

    res.status(201).json({ mensaje: 'Cita creada', cita });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza los datos básicos de una cita (fecha/hora, motivo, tipo, observaciones).
 * @route PUT /api/v1/citas/:id
 * @param {import('express').Request} req - params: { id }; body parcial.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { cita } | 404 no encontrada.
 */
exports.actualizar = async (req, res, next) => {
  try {
    const { fechaHora, motivo, tipo, observaciones } = req.body;
    const cita = await Cita.findById(req.params.id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    const applyChanges = async () => {
      if (fechaHora) {
        const doctor = await Doctor.findOne({ _id: cita.doctorId, activo: true });
        if (!doctor) throw httpError(404, 'Doctor no encontrado');
        const nuevaFecha = new Date(fechaHora);
        validarHorarioDoctor(doctor, nuevaFecha);
        const ocupado = await existeSolape({
          doctorId: cita.doctorId,
          fechaHora: nuevaFecha,
          duracion: doctor.duracionConsulta || 30,
          excluirCitaId: cita._id,
        });
        if (ocupado) throw httpError(409, 'El doctor ya tiene una cita en ese horario');
        cita.fechaHora = nuevaFecha;
        // Una reprogramación necesita un nuevo recordatorio para la nueva fecha.
        cita.recordatorioClaimedAt = null;
        cita.recordatorioEnviadoAt = null;
      }

      if (motivo !== undefined) cita.motivo = motivo;
      if (tipo !== undefined) cita.tipo = tipo;
      if (observaciones !== undefined) cita.observaciones = observaciones;
      await cita.save();
    };

    if (fechaHora) await withDoctorScheduleLock(cita.doctorId, applyChanges);
    else await applyChanges();
    res.json({ mensaje: 'Cita actualizada', cita });
  } catch (error) {
    next(error);
  }
};

/**
 * Cambia el estado de una cita (confirmada, cancelada, completada, etc.).
 * Envía email de confirmación o de cancelación según corresponda y notifica
 * por Socket.io.
 * @route PUT /api/v1/citas/:id/estado
 * @param {import('express').Request} req - body: { estado, motivoCancelacion, canceladoPor }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { cita } | 404 no encontrada.
 */
exports.cambiarEstado = async (req, res, next) => {
  try {
    const { estado, motivoCancelacion, canceladoPor } = req.body;

    const existente = await Cita.findById(req.params.id);
    if (!existente) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    const cita = await withDoctorScheduleLock(existente.doctorId, async () => {
      const actual = await Cita.findById(req.params.id);
      if (!actual) throw httpError(404, 'Cita no encontrada');
      if (!ESTADOS_SIN_RESERVA.includes(estado) && ESTADOS_SIN_RESERVA.includes(actual.estado)) {
        const doctor = await Doctor.findById(actual.doctorId);
        const ocupado = doctor && await existeSolape({
          doctorId: actual.doctorId,
          fechaHora: actual.fechaHora,
          duracion: doctor.duracionConsulta || 30,
          excluirCitaId: actual._id,
        });
        if (ocupado) throw httpError(409, 'El horario fue ocupado por otra cita');
      }
      return Cita.findByIdAndUpdate(
        req.params.id, { estado, motivoCancelacion, canceladoPor }, { returnDocument: 'after', runValidators: true }
      ).populate(populateCita);
    });

    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    // Enviar email de confirmación al cambiar a estado 'confirmada'
    if (estado === 'confirmada') {
      try {
        const pacienteUser = cita.pacienteId.usuarioId;
        const doctorUser   = cita.doctorId.usuarioId;
        await enviarConfirmacionCita({
          pacienteNombre: `${pacienteUser.nombre} ${pacienteUser.apellido}`,
          pacienteEmail:  pacienteUser.email,
          doctorNombre:   `Dr. ${doctorUser.nombre} ${doctorUser.apellido}`,
          fechaHora:      cita.fechaHora,
          motivo:         cita.motivo
        });
      } catch (emailError) {
        logger.error(`Error enviando email de confirmación: ${emailError.message}`);
      }
    }

    // Enviar email al paciente cuando la cita se cancela
    if (estado === 'cancelada') {
      try {
        const pacienteUser = cita.pacienteId.usuarioId;
        const doctorUser   = cita.doctorId?.usuarioId;
        await enviarCancelacionCita({
          pacienteNombre:    `${pacienteUser.nombre} ${pacienteUser.apellido}`,
          pacienteEmail:     pacienteUser.email,
          doctorNombre:      doctorUser ? `Dr. ${doctorUser.nombre} ${doctorUser.apellido}` : 'Profesional',
          fechaHora:         cita.fechaHora,
          motivoCancelacion: cita.motivoCancelacion
        });
      } catch (emailError) {
        logger.error(`Error enviando email de cancelación: ${emailError.message}`);
      }
    }

    // Notificar cambio de estado al doctor y paciente
    notificaciones.citaActualizada(cita);

    res.json({ mensaje: `Cita ${estado}`, cita });
  } catch (error) {
    next(error);
  }
};

/**
 * Genera los bloques (slots) de atención del doctor para una fecha, según sus
 * horarios, y marca cuáles están ocupados por citas activas.
 * @route GET /api/v1/citas/disponibilidad/:doctorId
 * @param {import('express').Request} req - params: { doctorId }; query: { fecha }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { fecha, doctorId, slots[] } | 400 falta fecha | 404 doctor.
 */
exports.disponibilidad = async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ mensaje: 'La fecha es requerida' });

    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) return res.status(404).json({ mensaje: 'Doctor no encontrado' });

    const nombreDia = diaSemana(fecha);
    const horario   = doctor.horarios.find(h => h.dia === nombreDia && h.activo);

    if (!horario)
      return res.json({ disponible: false, mensaje: `El doctor no atiende los ${nombreDia}` });

    const duracion      = doctor.duracionConsulta || 30;
    const [hIni, mIni] = horario.horaInicio.split(':').map(Number);
    const [hFin, mFin] = horario.horaFin.split(':').map(Number);

    const slots = [];
    let current = instanteLocal(fecha, `${String(hIni).padStart(2, '0')}:${String(mIni).padStart(2, '0')}`);
    const finHorario = instanteLocal(fecha, `${String(hFin).padStart(2, '0')}:${String(mFin).padStart(2, '0')}`);
    while (current.plus({ minutes: duracion }) <= finHorario) {
      slots.push(current);
      current = current.plus({ minutes: duracion });
    }

    const { inicio, fin: finDia } = rangoDia(fecha);

    const citasDelDia = await Cita.find({
      doctorId:  req.params.doctorId,
      estado:    { $nin: ['cancelada', 'no_asistio'] },
      fechaHora: { $gte: inicio, $lte: finDia }
    });

    const ocupados    = citasDelDia.map(c => new Date(c.fechaHora).getTime());
    const disponibles = slots.map(slot => ({
      hora:       slot.toFormat('HH:mm'),
      fechaHora:  slot.toUTC().toJSDate(),
      disponible: !ocupados.includes(slot.toMillis())
    }));

    res.json({ fecha, doctorId: req.params.doctorId, slots: disponibles });
  } catch (error) {
    next(error);
  }
};
