// ═══════════════════════════════════════════════════════════════
// src/controllers/resultados.controller.js
// Resultados médicos con archivos subidos a Cloudinary
// Al eliminar, borra también el archivo de Cloudinary
// ═══════════════════════════════════════════════════════════════

const Resultado      = require('../models/Resultado');
const Cita           = require('../models/Cita');
const Paciente       = require('../models/Paciente');
const Doctor         = require('../models/Doctor');
const { cloudinary } = require('../config/cloudinary');
const notificaciones = require('../services/notificaciones.service');
const logger         = require('../config/logger');
const { enviarNuevoResultado } = require('../services/email.service');
const { validarRelacionCita } = require('../services/citas.service');

function serializarResultado(resultado) {
  const data = resultado.toObject ? resultado.toObject() : { ...resultado };
  data.tieneArchivo = Boolean(data.archivo || data.archivoPublicId);
  delete data.archivo;
  delete data.archivoPublicId;
  delete data.archivoResourceType;
  delete data.archivoFormat;
  return data;
}

function autorizadoSobreResultado(resultado, req) {
  const pacienteId = String(resultado.pacienteId?._id || resultado.pacienteId);
  const doctorId = String(resultado.doctorId?._id || resultado.doctorId);
  return (!req.pacienteScope || pacienteId === req.pacienteScope)
    && (!req.doctorScope || doctorId === req.doctorScope);
}

async function eliminarArchivoSubido(archivo) {
  if (!archivo?.filename) return;
  await cloudinary.uploader.destroy(archivo.filename, {
    resource_type: 'image',
    type: 'authenticated',
    invalidate: true,
  });
}

/**
 * Lista los resultados de un paciente (con doctor y cita poblados).
 * @route GET /api/v1/resultados/paciente/:pacienteId
 * @param {import('express').Request} req - params: { pacienteId }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, resultados }.
 */
exports.listarPorPaciente = async (req, res, next) => {
  try {
    const filtro = { pacienteId: req.params.pacienteId };
    if (req.doctorScope) filtro.doctorId = req.doctorScope;
    const resultados = await Resultado.find(filtro).select('+archivoPublicId +archivoResourceType +archivoFormat')
      .populate({ path: 'doctorId', populate: { path: 'usuarioId', select: 'nombre apellido' } })
      .populate('citaId', 'fechaHora motivo')
      .sort({ createdAt: -1 });
    res.json({ total: resultados.length, resultados: resultados.map(serializarResultado) });
  } catch (error) {
    next(error);
  }
};

/**
 * Devuelve un resultado por ID con populate profundo. Un paciente solo puede ver
 * resultados propios.
 * @route GET /api/v1/resultados/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { resultado } | 403 ajeno | 404 no encontrado.
 */
exports.obtener = async (req, res, next) => {
  try {
    const resultado = await Resultado.findById(req.params.id).select('+archivoPublicId +archivoResourceType +archivoFormat')
      .populate({ path: 'pacienteId', populate: { path: 'usuarioId', select: 'nombre apellido' } })
      .populate({ path: 'doctorId',   populate: { path: 'usuarioId', select: 'nombre apellido' } })
      .populate('citaId', 'fechaHora motivo');
    if (!resultado) return res.status(404).json({ mensaje: 'Resultado no encontrado' });

    if (!autorizadoSobreResultado(resultado, req))
      return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });

    res.json({ resultado: serializarResultado(resultado) });
  } catch (error) {
    next(error);
  }
};

/**
 * Registra un resultado médico (archivo opcional subido a Cloudinary), notifica
 * al paciente por Socket.io y le envía un email avisando del nuevo resultado.
 * @route POST /api/v1/resultados
 * @param {import('express').Request} req - body: { pacienteId, citaId, doctorId, tipo, nombre, descripcion, observaciones, fecha }; req.file opcional.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 201 { resultado } | 404 cita no encontrada.
 */
exports.crear = async (req, res, next) => {
  let resultadoCreado = false;
  try {
    const { pacienteId, citaId, doctorId, tipo, nombre, descripcion, observaciones, fecha } = req.body;

    if (req.doctorScope && String(doctorId) !== req.doctorScope) {
      await eliminarArchivoSubido(req.file);
      return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });
    }

    const cita = await Cita.findById(citaId);
    if (!cita) {
      await eliminarArchivoSubido(req.file);
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }
    validarRelacionCita(cita, { pacienteId, doctorId });

    const resultado = await Resultado.create({
      pacienteId,
      citaId,
      doctorId,
      tipo,
      nombre,
      descripcion,
      archivoPublicId: req.file?.filename,
      archivoResourceType: 'image',
      archivoFormat: req.file?.format,
      observaciones,
      fecha,
    });
    resultadoCreado = true;

    // Notificar al paciente (tiempo real)
    notificaciones.resultadoSubido(resultado);

    // Enviar email al paciente avisando del nuevo resultado
    try {
      const pac = await Paciente.findById(pacienteId).populate('usuarioId', 'nombre apellido email');
      const doc = await Doctor.findById(doctorId).populate('usuarioId', 'nombre apellido');
      if (pac?.usuarioId?.email) {
        await enviarNuevoResultado({
          pacienteNombre: `${pac.usuarioId.nombre} ${pac.usuarioId.apellido}`,
          pacienteEmail:  pac.usuarioId.email,
          tipo,
          nombre,
          doctorNombre:   doc?.usuarioId ? `Dr. ${doc.usuarioId.nombre} ${doc.usuarioId.apellido}` : 'Profesional',
        });
      }
    } catch (emailError) {
      logger.error(`Error enviando email de resultado: ${emailError.message}`);
    }

    const resultadoSeguro = await Resultado.findById(resultado._id).select('+archivoPublicId +archivoResourceType +archivoFormat');
    res.status(201).json({ mensaje: 'Resultado registrado', resultado: serializarResultado(resultadoSeguro) });
  } catch (error) {
    if (!resultadoCreado) {
      try {
        await eliminarArchivoSubido(req.file);
      } catch (cleanupError) {
        logger.error(`No se pudo limpiar el archivo huérfano: ${cleanupError.message}`);
      }
    }
    next(error);
  }
};

exports.obtenerArchivo = async (req, res, next) => {
  try {
    const resultado = await Resultado.findById(req.params.id).select('+archivoPublicId +archivoResourceType +archivoFormat');
    if (!resultado) return res.status(404).json({ mensaje: 'Resultado no encontrado' });
    if (!autorizadoSobreResultado(resultado, req))
      return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });

    if (resultado.archivoPublicId) {
      const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
      const url = cloudinary.utils.private_download_url(
        resultado.archivoPublicId,
        resultado.archivoFormat || 'pdf',
        {
          resource_type: resultado.archivoResourceType || 'image',
          type: 'authenticated',
          expires_at: expiresAt,
          attachment: true,
        }
      );
      return res.json({ url, expiraEn: expiresAt });
    }

    if (resultado.archivo) return res.json({ url: resultado.archivo, legado: true });
    return res.status(404).json({ mensaje: 'El resultado no tiene archivo adjunto' });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza los metadatos de un resultado (tipo, nombre, descripción, observaciones).
 * @route PUT /api/v1/resultados/:id
 * @param {import('express').Request} req - params: { id }; body parcial.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { resultado } | 404 no encontrado.
 */
exports.actualizar = async (req, res, next) => {
  try {
    const { tipo, nombre, descripcion, observaciones } = req.body;
    const existente = await Resultado.findById(req.params.id);
    if (!existente) return res.status(404).json({ mensaje: 'Resultado no encontrado' });
    if (!autorizadoSobreResultado(existente, req))
      return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });
    const cambios = { tipo, nombre, descripcion, observaciones };
    Object.keys(cambios).forEach((campo) => cambios[campo] === undefined && delete cambios[campo]);
    const resultado = await Resultado.findByIdAndUpdate(
      req.params.id, cambios, { returnDocument: 'after', runValidators: true }
    ).select('+archivoPublicId +archivoResourceType +archivoFormat');
    res.json({ mensaje: 'Resultado actualizado', resultado: serializarResultado(resultado) });
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina un resultado y, si tenía archivo, lo borra también de Cloudinary.
 * @route DELETE /api/v1/resultados/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 eliminado | 404 no encontrado.
 */
exports.eliminar = async (req, res, next) => {
  try {
    const resultado = await Resultado.findById(req.params.id).select('+archivoPublicId +archivoResourceType +archivoFormat');
    if (!resultado) return res.status(404).json({ mensaje: 'Resultado no encontrado' });
    if (!autorizadoSobreResultado(resultado, req))
      return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });

    if (resultado.archivoPublicId) {
      await cloudinary.uploader.destroy(resultado.archivoPublicId, {
        resource_type: resultado.archivoResourceType || 'image',
        type: 'authenticated',
        invalidate: true,
      });
    }

    await resultado.deleteOne();

    res.json({ mensaje: 'Resultado eliminado' });
  } catch (error) {
    next(error);
  }
};
