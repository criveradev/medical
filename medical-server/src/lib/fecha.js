const { DateTime } = require('luxon');

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'America/Santiago';
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

function errorFecha(mensaje) {
  const error = new Error(mensaje);
  error.status = 400;
  return error;
}

function fechaLocal(fecha) {
  const valor = DateTime.fromISO(String(fecha || ''), { zone: APP_TIME_ZONE });
  if (!valor.isValid) throw errorFecha('Fecha inválida');
  return valor;
}

function instanteLocal(fecha, hora) {
  const valor = DateTime.fromISO(`${fecha}T${hora}`, { zone: APP_TIME_ZONE });
  if (!valor.isValid) throw errorFecha('Fecha u hora inválida');
  return valor;
}

function rangoDia(fecha) {
  const dia = fechaLocal(fecha).startOf('day');
  return {
    inicio: dia.toUTC().toJSDate(),
    fin: dia.endOf('day').toUTC().toJSDate(),
  };
}

function diaSemana(fecha) {
  return DIAS[fechaLocal(fecha).weekday - 1];
}

function enZona(fecha) {
  const valor = DateTime.fromJSDate(new Date(fecha), { zone: APP_TIME_ZONE });
  if (!valor.isValid) throw errorFecha('Fecha inválida');
  return valor;
}

module.exports = {
  APP_TIME_ZONE,
  diaSemana,
  enZona,
  fechaLocal,
  instanteLocal,
  rangoDia,
};
