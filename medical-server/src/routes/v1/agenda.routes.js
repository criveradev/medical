const router = require('express').Router();
const { body, param, query } = require('express-validator');
const Doctor = require('../../models/Doctor');
const Especialidad = require('../../models/Especialidad');
const { crear, disponibilidad } = require('../../controllers/citas.controller');
const { authenticate, requireRole, scopePaciente } = require('../../middleware/auth');
const { validarCrearCita } = require('../../middleware/validaciones/citas.validaciones');
const validar = require('../../middleware/validar');
const idempotency = require('../../middleware/idempotency');

router.get('/profesionales', async (req, res) => {
  const especialidades = await Especialidad.find({ activo: true }).select('nombre').lean();
  const doctores = await Doctor.find({
    activo: true,
    especialidadId: { $in: especialidades.map(especialidad => especialidad._id) },
  }).select('usuarioId especialidadId')
    .populate({ path: 'usuarioId', match: { activo: true }, select: 'nombre apellido' })
    .lean();

  res.json({
    especialidades,
    profesionales: doctores.filter(doctor => doctor.usuarioId).map(doctor => ({
      _id: doctor._id,
      especialidadId: doctor.especialidadId,
      nombre: `${doctor.usuarioId.nombre} ${doctor.usuarioId.apellido}`,
    })),
  });
});

router.get('/cupos/:doctorId',
  param('doctorId').isMongoId(),
  query('fecha').isString().matches(/^\d{4}-\d{2}-\d{2}$/).isISO8601({ strict: true }),
  validar,
  (req, res, next) => {
    res.locals.agendaPublica = true;
    return disponibilidad(req, res, next);
  },
);

router.post('/reservas', authenticate, requireRole('paciente'), scopePaciente,
  (req, res, next) => {
    const { doctorId, fechaHora, motivo, tipo } = req.body || {};
    req.body = { pacienteId: req.pacienteScope, doctorId, fechaHora, motivo, tipo };
    next();
  },
  ...validarCrearCita, body('motivo').isString().trim().isLength({ min: 5, max: 300 }),
  validar, idempotency(), crear,
);

module.exports = router;
