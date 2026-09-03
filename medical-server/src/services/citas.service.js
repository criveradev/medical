const Cita = require('../models/Cita');
const { enZona } = require('../lib/fecha');

const ESTADOS_SIN_RESERVA = ['cancelada', 'no_asistio'];

function httpError(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function validarRelacionCita(cita, { pacienteId, doctorId }) {
  if (pacienteId && String(cita.pacienteId) !== String(pacienteId)) {
    throw httpError(409, 'El paciente no corresponde a la cita');
  }
  if (doctorId && String(cita.doctorId) !== String(doctorId)) {
    throw httpError(409, 'El doctor no corresponde a la cita');
  }
}

function validarHorarioDoctor(doctor, fechaHora) {
  const fecha = enZona(fechaHora);
  if (fecha.toMillis() <= Date.now()) {
    throw httpError(400, 'La cita debe agendarse en una fecha futura');
  }

  const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const horario = doctor.horarios.find((item) => item.dia === dias[fecha.weekday - 1] && item.activo);
  if (!horario) throw httpError(409, 'El doctor no atiende en ese día');

  const [horaInicio, minutoInicio] = horario.horaInicio.split(':').map(Number);
  const [horaFin, minutoFin] = horario.horaFin.split(':').map(Number);
  const inicio = fecha.startOf('day').set({ hour: horaInicio, minute: minutoInicio });
  const fin = fecha.startOf('day').set({ hour: horaFin, minute: minutoFin });
  const finCita = fecha.plus({ minutes: doctor.duracionConsulta || 30 });

  if (fecha < inicio || finCita > fin) {
    throw httpError(409, 'La hora está fuera del horario de atención del doctor');
  }
}

async function existeSolape({ doctorId, fechaHora, duracion, excluirCitaId }) {
  const inicio = new Date(fechaHora);
  const fin = new Date(inicio.getTime() + duracion * 60000);
  const ventanaInicio = new Date(inicio.getTime() - duracion * 60000);
  const filtro = {
    doctorId,
    estado: { $nin: ESTADOS_SIN_RESERVA },
    fechaHora: { $gt: ventanaInicio, $lt: fin },
  };
  if (excluirCitaId) filtro._id = { $ne: excluirCitaId };

  const candidatas = await Cita.find(filtro).select('fechaHora');
  return candidatas.some((cita) => {
    const inicioExistente = new Date(cita.fechaHora).getTime();
    const finExistente = inicioExistente + duracion * 60000;
    return inicio.getTime() < finExistente && inicioExistente < fin.getTime();
  });
}

module.exports = {
  ESTADOS_SIN_RESERVA,
  existeSolape,
  httpError,
  validarHorarioDoctor,
  validarRelacionCita,
};
