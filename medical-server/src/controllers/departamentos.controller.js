// ═══════════════════════════════════════════════════════════════
// src/controllers/departamentos.controller.js
// Caché Redis: lista de departamentos (TTL 30 min)
// Invalidación automática en crear/actualizar/eliminar
// ═══════════════════════════════════════════════════════════════

const Departamento = require('../models/Departamento');
const cache        = require('../services/cache.service');

const CLAVE_CACHE = 'departamentos:todos';

/**
 * Lista los departamentos activos (cacheados en Redis, TTL 30 min).
 * @route GET /api/v1/departamentos
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, departamentos }.
 */
exports.listar = async (req, res, next) => {
  try {
    // Intentar desde caché — si falla Redis, va directo a MongoDB
    const resultado = await cache.get(
      CLAVE_CACHE,
      async () => {
        const departamentos = await Departamento.find({ activo: true });
        return { total: departamentos.length, departamentos };
      },
      cache.TTL.LARGO  // 30 min — los departamentos cambian muy poco
    );

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un departamento e invalida la caché.
 * @route POST /api/v1/departamentos
 * @param {import('express').Request} req - body: { nombre, descripcion }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 201 { departamento } | 409 nombre duplicado.
 */
exports.crear = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    const departamento = await Departamento.create({ nombre, descripcion });

    // Invalidar caché para que el próximo listar refleje el nuevo departamento
    await cache.del(CLAVE_CACHE);

    res.status(201).json({ mensaje: 'Departamento creado', departamento });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ mensaje: 'El departamento ya existe' });
    next(error);
  }
};

/**
 * Actualiza un departamento (nombre, descripción, estado) e invalida la caché.
 * @route PUT /api/v1/departamentos/:id
 * @param {import('express').Request} req - params: { id }; body parcial.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { departamento } | 404 no encontrado.
 */
exports.actualizar = async (req, res, next) => {
  try {
    const { nombre, descripcion, activo } = req.body;
    const departamento = await Departamento.findByIdAndUpdate(
      req.params.id, { nombre, descripcion, activo }, { returnDocument: 'after' }
    );
    if (!departamento) return res.status(404).json({ mensaje: 'Departamento no encontrado' });

    await cache.del(CLAVE_CACHE);

    res.json({ mensaje: 'Departamento actualizado', departamento });
  } catch (error) {
    next(error);
  }
};

/**
 * Desactiva (soft delete) un departamento e invalida la caché.
 * @route DELETE /api/v1/departamentos/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 desactivado | 404 no encontrado.
 */
exports.eliminar = async (req, res, next) => {
  try {
    const departamento = await Departamento.findByIdAndUpdate(
      req.params.id, { activo: false }, { returnDocument: 'after' }
    );
    if (!departamento) return res.status(404).json({ mensaje: 'Departamento no encontrado' });

    await cache.del(CLAVE_CACHE);

    res.json({ mensaje: 'Departamento desactivado' });
  } catch (error) {
    next(error);
  }
};
