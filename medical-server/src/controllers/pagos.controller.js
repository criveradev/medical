// ═══════════════════════════════════════════════════════════════
// src/controllers/pagos.controller.js
// Control de pagos por consulta — una cita solo puede tener un pago
// Emite evento Socket.io a admins al registrar nuevo pago
// ═══════════════════════════════════════════════════════════════

const Pago           = require('../models/Pago');
const Cita           = require('../models/Cita');
const notificaciones = require('../services/notificaciones.service');
const { validarRelacionCita } = require('../services/citas.service');

/**
 * Lista pagos con filtros (estado, paciente, rango de fechas) y calcula el total
 * recaudado. Un paciente solo ve sus propios pagos.
 * @route GET /api/v1/pagos
 * @param {import('express').Request} req - query: { estado, pacienteId, desde, hasta }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, totalRecaudado, pagos }.
 */
exports.listar = async (req, res, next) => {
  try {
    const { estado, pacienteId, desde, hasta } = req.query;
    const filtro = {};

    if (estado)     filtro.estado     = estado;
    if (pacienteId) filtro.pacienteId = pacienteId;
    // Un paciente solo ve sus propios pagos (prevalece sobre el query)
    if (req.pacienteScope) filtro.pacienteId = req.pacienteScope;
    if (desde || hasta) {
      filtro.createdAt = {};
      if (desde) filtro.createdAt.$gte = new Date(desde);
      if (hasta) filtro.createdAt.$lte = new Date(hasta);
    }

    const pagos = await Pago.find(filtro)
      .populate({ path: 'pacienteId', populate: { path: 'usuarioId', select: 'nombre apellido' } })
      .populate('citaId', 'fechaHora motivo')
      .sort({ createdAt: -1 });

    // Calcular total recaudado de pagos completados
    const totalRecaudado = pagos.reduce((sum, p) => sum + (p.estado === 'pagado' ? p.monto : 0), 0);
    res.json({ total: pagos.length, totalRecaudado, pagos });
  } catch (error) {
    next(error);
  }
};

/**
 * Devuelve un pago por ID con paciente y cita poblados. Un paciente solo puede
 * ver pagos propios.
 * @route GET /api/v1/pagos/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { pago } | 403 ajeno | 404 no encontrado.
 */
exports.obtener = async (req, res, next) => {
  try {
    const pago = await Pago.findById(req.params.id)
      .populate({ path: 'pacienteId', populate: { path: 'usuarioId', select: 'nombre apellido email' } })
      .populate('citaId', 'fechaHora motivo tipo');
    if (!pago) return res.status(404).json({ mensaje: 'Pago no encontrado' });

    // Un paciente solo puede ver su propio pago
    if (req.pacienteScope) {
      const pid = String(pago.pacienteId?._id || pago.pacienteId);
      if (pid !== req.pacienteScope)
        return res.status(403).json({ mensaje: 'No autorizado sobre este recurso' });
    }

    res.json({ pago });
  } catch (error) {
    next(error);
  }
};

/**
 * Registra el pago de una cita (una cita = un pago) y notifica a admins.
 * @route POST /api/v1/pagos
 * @param {import('express').Request} req - body: { citaId, pacienteId, monto, metodo, comprobante, observaciones }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 201 { pago } | 404 cita | 409 pago duplicado.
 */
exports.crear = async (req, res, next) => {
  try {
    const { citaId, pacienteId, monto, metodo, comprobante, observaciones } = req.body;

    const cita = await Cita.findById(citaId);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    validarRelacionCita(cita, { pacienteId });

    // Una cita solo puede tener un pago
    const existente = await Pago.findOne({ citaId });
    if (existente) return res.status(409).json({ mensaje: 'Ya existe un pago para esta cita' });

    const pago = await Pago.create({ citaId, pacienteId, monto, metodo, comprobante, observaciones });
    notificaciones.pagoRegistrado(pago);
    res.status(201).json({ mensaje: 'Pago registrado', pago });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un pago; al pasar a estado "pagado" registra la fecha de pago.
 * @route PUT /api/v1/pagos/:id
 * @param {import('express').Request} req - params: { id }; body parcial.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { pago } | 404 no encontrado.
 */
exports.actualizar = async (req, res, next) => {
  try {
    const { monto, metodo, estado, comprobante, observaciones } = req.body;
    const cambios = { monto, metodo, estado, comprobante, observaciones };

    // Registrar fecha de pago al confirmar
    if (estado === 'pagado') cambios.fechaPago = new Date();

    const pago = await Pago.findByIdAndUpdate(req.params.id, cambios, { returnDocument: 'after' });
    if (!pago) return res.status(404).json({ mensaje: 'Pago no encontrado' });
    res.json({ mensaje: 'Pago actualizado', pago });
  } catch (error) {
    next(error);
  }
};

/**
 * Anula un pago (estado = "anulado").
 * @route PUT /api/v1/pagos/:id/anular
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { pago } | 404 no encontrado.
 */
exports.anular = async (req, res, next) => {
  try {
    const pago = await Pago.findByIdAndUpdate(req.params.id, { estado: 'anulado' }, { returnDocument: 'after' });
    if (!pago) return res.status(404).json({ mensaje: 'Pago no encontrado' });
    res.json({ mensaje: 'Pago anulado', pago });
  } catch (error) {
    next(error);
  }
};
