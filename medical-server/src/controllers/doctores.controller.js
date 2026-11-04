// ═══════════════════════════════════════════════════════════════
// src/controllers/doctores.controller.js
// Caché Redis:
//   - 'doctores:lista:{page}:{limit}:{especialidadId}'  → TTL 5 min
//   - 'doctores:detalle:{id}'                           → TTL 5 min
// Invalidación en crear/actualizar/eliminar/horarios/foto
// ═══════════════════════════════════════════════════════════════

const Doctor       = require('../models/Doctor');
const User         = require('../models/User');
const Especialidad = require('../models/Especialidad');
const cache        = require('../services/cache.service');

// Populate anidado reutilizable
const populateDoctor = [
  { path: 'usuarioId', select: 'nombre apellido email telefono' },
  { path: 'especialidadId', populate: { path: 'departamentoId', select: 'nombre' } }
];

/**
 * Genera una matrícula única con formato MED-#### cuando no se proporciona una.
 * Reintenta ante colisiones y, como último recurso, usa un sufijo temporal.
 * @returns {Promise<string>} Matrícula disponible (ej. "MED-0007").
 */
const generarMatricula = async () => {
  for (let intento = 0; intento < 5; intento++) {
    const total     = await Doctor.countDocuments();
    const candidato = `MED-${String(total + 1 + intento).padStart(4, '0')}`;
    const existe    = await Doctor.exists({ matricula: candidato });
    if (!existe) return candidato;
  }
  // Fallback prácticamente único si hubo colisiones repetidas
  return `MED-${Date.now().toString().slice(-6)}`;
};

/**
 * Previsualiza la próxima matrícula que se asignaría a un doctor.
 * @route GET /api/v1/doctores/siguiente-matricula
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { matricula }.
 */
exports.siguienteMatricula = async (req, res, next) => {
  try {
    res.json({ matricula: await generarMatricula() });
  } catch (error) {
    next(error);
  }
};

/**
 * Devuelve el perfil del doctor autenticado (sin requerir permiso de módulo).
 * @route GET /api/v1/doctores/mi-perfil
 * @param {import('express').Request} req - req.user inyectado por authenticate.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { doctor } | 404 si no tiene perfil asociado.
 */
exports.miPerfil = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({ usuarioId: req.user._id }).populate(populateDoctor);
    if (!doctor) return res.status(404).json({ mensaje: 'No tienes un perfil de doctor asociado' });
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
};

/**
 * Lista doctores con paginación y filtro opcional por especialidad. Cachea el
 * resultado en Redis (TTL 5 min) por combinación de página/límite/especialidad.
 * @route GET /api/v1/doctores
 * @param {import('express').Request} req - query: { page, limit, especialidadId }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { total, pagina, totalPaginas, doctores }.
 */
exports.listar = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const { especialidadId } = req.query;

    const filtro = { activo: true };
    if (especialidadId) filtro.especialidadId = especialidadId;

    // Clave única por combinación de filtros y paginación
    const clave = `doctores:lista:${page}:${limit}:${especialidadId || 'todos'}`;

    const resultado = await cache.get(clave, async () => {
      const total    = await Doctor.countDocuments(filtro);
      const doctores = await Doctor.find(filtro)
        .populate(populateDoctor)
        .skip(skip).limit(limit).sort({ createdAt: -1 });
      return { total, pagina: page, totalPaginas: Math.ceil(total / limit), doctores };
    }, cache.TTL.MEDIO);

    res.json(resultado);
  } catch (error) {
    next(error);
  }
};

/**
 * Devuelve un doctor por ID con su usuario, especialidad y departamento.
 * @route GET /api/v1/doctores/:id
 * @param {import('express').Request} req - params: { id }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { doctor } | 404 no encontrado.
 */
exports.obtener = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(populateDoctor);
    if (!doctor) return res.status(404).json({ mensaje: 'Doctor no encontrado' });
    res.json({ doctor });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un doctor. Verifica que el usuario tenga rol doctor y que la especialidad
 * exista; genera la matrícula si no se envía. Invalida la caché de doctores.
 * @route POST /api/v1/doctores
 * @param {import('express').Request} req - body: { usuarioId, especialidadId, matricula?, duracionConsulta, horarios }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 201 { doctor } | 400 rol inválido | 404 usuario/especialidad | 409 duplicado.
 */
exports.crear = async (req, res, next) => {
  try {
    const { usuarioId, especialidadId, matricula, duracionConsulta, horarios } = req.body;

    // Verificar que el usuario tiene rol doctor
    const user = await User.findById(usuarioId).populate('roleId');
    if (!user) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    if (user.roleId.nombre !== 'doctor')
      return res.status(400).json({ mensaje: 'El usuario debe tener rol doctor' });

    const especialidad = await Especialidad.findById(especialidadId);
    if (!especialidad) return res.status(404).json({ mensaje: 'Especialidad no encontrada' });

    // La matrícula es opcional: si no se envía, se genera automáticamente (MED-####)
    const matriculaFinal = (matricula && matricula.trim()) || await generarMatricula();

    const doctor = await Doctor.create({ usuarioId, especialidadId, matricula: matriculaFinal, duracionConsulta, horarios });
    await cache.delPorPatron('doctores:*');
    res.status(201).json({ mensaje: 'Doctor creado', doctor });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ mensaje: 'Matrícula o usuario ya registrado' });
    next(error);
  }
};

/**
 * Actualiza datos del doctor (especialidad, matrícula, duración, horarios, estado)
 * e invalida la caché de doctores.
 * @route PUT /api/v1/doctores/:id
 * @param {import('express').Request} req - params: { id }; body parcial.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { doctor } | 404 no encontrado.
 */
exports.actualizar = async (req, res, next) => {
  try {
    const { especialidadId, matricula, duracionConsulta, horarios, activo } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id, { especialidadId, matricula, duracionConsulta, horarios, activo }, { returnDocument: 'after' }
    ).populate('usuarioId', 'nombre apellido email');
    if (!doctor) return res.status(404).json({ mensaje: 'Doctor no encontrado' });
    await cache.delPorPatron('doctores:*');
    res.json({ mensaje: 'Doctor actualizado', doctor });
  } catch (error) {
    next(error);
  }
};

/**
 * Reemplaza los horarios de atención del doctor e invalida la caché.
 * @route PUT /api/v1/doctores/:id/horarios
 * @param {import('express').Request} req - params: { id }; body: { horarios }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { horarios } | 404 no encontrado.
 */
exports.actualizarHorarios = async (req, res, next) => {
  try {
    const { horarios } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { horarios }, { returnDocument: 'after' });
    if (!doctor) return res.status(404).json({ mensaje: 'Doctor no encontrado' });
    await cache.delPorPatron('doctores:*');
    res.json({ mensaje: 'Horarios actualizados', horarios: doctor.horarios });
  } catch (error) {
    next(error);
  }
};

/**
 * Genera los slots de atención del doctor para una fecha y marca los ocupados.
 * @route GET /api/v1/doctores/disponibilidad/:doctorId
 * @param {import('express').Request} req - params: { doctorId }; query: { fecha }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { fecha, doctorId, slots[] } | 400 falta fecha | 404 doctor.
 */
exports.disponibilidad = require('./citas.controller').disponibilidad;

/**
 * Sube/actualiza la foto del doctor (Multer → Cloudinary).
 * @route PUT /api/v1/doctores/:id/foto
 * @param {import('express').Request} req - params: { id }; req.file con la imagen.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>} 200 { foto, doctor } | 400 sin archivo | 404 no encontrado.
 */
exports.subirFoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ mensaje: 'No se recibió ningún archivo' });

    // req.file.path contiene la URL segura de Cloudinary
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { foto: req.file.path },
      { returnDocument: 'after' }
    ).populate('usuarioId', 'nombre apellido email');

    if (!doctor) return res.status(404).json({ mensaje: 'Doctor no encontrado' });

    res.json({ mensaje: 'Foto actualizada', foto: doctor.foto, doctor });
  } catch (error) {
    next(error);
  }
};
