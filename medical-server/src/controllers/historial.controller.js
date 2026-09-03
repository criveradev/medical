// ═══════════════════════════════════════════════════════════════
// src/controllers/historial.controller.js
// Registros clínicos por cita — al crear, marca la cita como completada
// Emite evento Socket.io al paciente al registrar nuevo historial
// ═══════════════════════════════════════════════════════════════

const Historial      = require('../models/Historial');
const Cita           = require('../models/Cita');
const notificaciones = require('../services/notificaciones.service');
const { validarRelacionCita } = require('../services/citas.service');

/**
 * Lista el historial clínico de un paciente (con cita y doctor poblados).
 * @route GET /api/v1/historial/paciente/:pacienteId
 * @param {import('express').Request} req - params: { pacienteId }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, historial }.
 */
exports.listarPorPaciente = async (req, res, next) => {
  try {
    const filtro = { pacienteId: req.params.pacienteId };
    if (req.doctorScope) filtro.doctorId = req.doctorScope;
    const historial = await Historial.find(filtro)
      .populate({ path: 'citaId', select: 'fechaHora motivo tipo' })
      .populate({
        path: 'doctorId',
        select: 'matricula usuarioId especialidadId',
        populate: [
          { path: 'usuarioId', select: 'nombre apellido' },
          { path: 'especialidadId', select: 'nombre' },
        ],
      })
      .sort({ createdAt: -1 });
    res.json({ total: historial.length, historial });
  } catch (error) {
    next(error);
  }
};

/**
 * Devuelve un registro de historial por ID con populate profundo. Un paciente
 * solo puede ver registros propios.
 * @route GET /api/v1/historial/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { registro } | 403 ajeno | 404 no encontrado.
 */
exports.obtener = async (req, res, next) => {
  try {
    const registro = await Historial.findById(req.params.id)
      .populate({ path: 'pacienteId', populate: { path: 'usuarioId', select: 'nombre apellido' } })
      .populate({ path: 'doctorId',   populate: { path: 'usuarioId', select: 'nombre apellido' } })
      .populate('citaId', 'fechaHora motivo tipo');
    if (!registro) return res.status(404).json({ mensaje: 'Registro no encontrado' });

    // Un paciente solo puede ver su propio historial
    if (req.pacienteScope) {
      const pid = String(registro.pacienteId?._id || registro.pacienteId);
      if (pid !== req.pacienteScope)
        return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });
    }

    if (req.doctorScope) {
      const did = String(registro.doctorId?._id || registro.doctorId);
      if (did !== req.doctorScope)
        return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });
    }

    res.json({ registro });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un registro de historial para una cita (una cita = un historial), marca
 * la cita como completada y notifica al paciente por Socket.io.
 * @route POST /api/v1/historial
 * @param {import('express').Request} req - body: { pacienteId, citaId, doctorId, diagnostico, tratamiento, receta, observaciones, proximaCita }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 201 { registro } | 404 cita | 409 historial duplicado.
 */
exports.crear = async (req, res, next) => {
  try {
    const { pacienteId, citaId, doctorId, diagnostico, tratamiento, receta, observaciones, proximaCita } = req.body;

    const cita = await Cita.findById(citaId);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    validarRelacionCita(cita, { pacienteId, doctorId });

    // Verificar que no existe historial para esta cita
    const existente = await Historial.findOne({ citaId });
    if (existente) return res.status(409).json({ mensaje: 'Ya existe un registro para esta cita' });

    const registro = await Historial.create({ pacienteId, citaId, doctorId, diagnostico, tratamiento, receta, observaciones, proximaCita });

    // Marcar la cita como completada automáticamente
    await Cita.findByIdAndUpdate(citaId, { estado: 'completada' }, { runValidators: true });

    // Notificar al paciente
    notificaciones.historialRegistrado(registro);

    res.status(201).json({ mensaje: 'Historial registrado', registro });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un registro de historial (diagnóstico, tratamiento, receta, etc.).
 * @route PUT /api/v1/historial/:id
 * @param {import('express').Request} req - params: { id }; body parcial.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { registro } | 404 no encontrado.
 */
exports.actualizar = async (req, res, next) => {
  try {
    const { diagnostico, tratamiento, receta, observaciones, proximaCita } = req.body;
    const existente = await Historial.findById(req.params.id);
    if (!existente) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    if (req.doctorScope && String(existente.doctorId) !== req.doctorScope)
      return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });

    const cambios = { diagnostico, tratamiento, receta, observaciones, proximaCita };
    Object.keys(cambios).forEach((campo) => cambios[campo] === undefined && delete cambios[campo]);
    const registro = await Historial.findByIdAndUpdate(
      req.params.id, cambios, { returnDocument: 'after', runValidators: true }
    );
    if (!registro) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    res.json({ mensaje: 'Historial actualizado', registro });
  } catch (error) {
    next(error);
  }
};
