// ═══════════════════════════════════════════════════════════════
// src/controllers/especialidades.controller.js
// Caché Redis:
//   - 'especialidades:todas'           → TTL 30 min
//   - 'especialidades:dep:{id}'        → TTL 30 min
// Invalidación en crear/actualizar/eliminar
// ═══════════════════════════════════════════════════════════════

const Especialidad = require('../models/Especialidad');
const Departamento = require('../models/Departamento');
const cache        = require('../services/cache.service');

const CLAVE_TODAS = 'especialidades:todas';
const clavePorDep = (depId) => `especialidades:dep:${depId}`;

/**
 * Lista las especialidades activas (cacheadas en Redis, TTL 30 min).
 * @route GET /api/v1/especialidades
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, especialidades }.
 */
exports.listar = async (req, res, next) => {
  try {
    const resultado = await cache.get(
      CLAVE_TODAS,
      async () => {
        const especialidades = await Especialidad.find({ activo: true })
          .populate('departamentoId', 'nombre');
        return { total: especialidades.length, especialidades };
      },
      cache.TTL.LARGO
    );

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Lista las especialidades activas de un departamento (cacheadas, TTL 30 min).
 * @route GET /api/v1/especialidades/departamento/:departamentoId
 * @param {import('express').Request} req - params: { departamentoId }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, especialidades }.
 */
exports.listarPorDepartamento = async (req, res, next) => {
  try {
    const { departamentoId } = req.params;

    const resultado = await cache.get(
      clavePorDep(departamentoId),
      async () => {
        const especialidades = await Especialidad.find({ departamentoId, activo: true })
          .populate('departamentoId', 'nombre');
        return { total: especialidades.length, especialidades };
      },
      cache.TTL.LARGO
    );

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea una especialidad (verifica que el departamento exista) e invalida la caché.
 * @route POST /api/v1/especialidades
 * @param {import('express').Request} req - body: { nombre, descripcion, departamentoId }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 201 { especialidad } | 404 departamento no encontrado.
 */
exports.crear = async (req, res, next) => {
  try {
    const { nombre, descripcion, departamentoId } = req.body;
    const departamento = await Departamento.findById(departamentoId);
    if (!departamento) return res.status(404).json({ mensaje: 'Departamento no encontrado' });

    const especialidad = await Especialidad.create({ nombre, descripcion, departamentoId });

    // Invalidar lista global y la del departamento afectado
    await cache.del([CLAVE_TODAS, clavePorDep(departamentoId)]);

    res.status(201).json({ mensaje: 'Especialidad creada', especialidad });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza una especialidad e invalida la caché de especialidades.
 * @route PUT /api/v1/especialidades/:id
 * @param {import('express').Request} req - params: { id }; body parcial.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { especialidad } | 404 no encontrada.
 */
exports.actualizar = async (req, res, next) => {
  try {
    const { nombre, descripcion, departamentoId, activo } = req.body;
    const especialidad = await Especialidad.findByIdAndUpdate(
      req.params.id, { nombre, descripcion, departamentoId, activo }, { returnDocument: 'after' }
    ).populate('departamentoId', 'nombre');
    if (!especialidad) return res.status(404).json({ mensaje: 'Especialidad no encontrada' });

    // Invalidar todas las claves de especialidades (no sabemos qué departamento cambió)
    await cache.delPorPatron('especialidades:*');

    res.json({ mensaje: 'Especialidad actualizada', especialidad });
  } catch (error) {
    next(error);
  }
};

/**
 * Desactiva (soft delete) una especialidad e invalida la caché.
 * @route DELETE /api/v1/especialidades/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 desactivada | 404 no encontrada.
 */
exports.eliminar = async (req, res, next) => {
  try {
    const especialidad = await Especialidad.findByIdAndUpdate(
      req.params.id, { activo: false }, { returnDocument: 'after' }
    );
    if (!especialidad) return res.status(404).json({ mensaje: 'Especialidad no encontrada' });

    await cache.delPorPatron('especialidades:*');

    res.json({ mensaje: 'Especialidad desactivada' });
  } catch (error) {
    next(error);
  }
};
