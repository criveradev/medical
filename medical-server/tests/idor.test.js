// ═══════════════════════════════════════════════════════════════
// tests/idor.test.js — Autorización a nivel de objeto (scopePaciente)
// Verifica que un paciente NO pueda acceder a datos de otro paciente
// (IDOR) y SÍ a los suyos propios.
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';

const request      = require('supertest');
const app          = require('../src/app');
const Role         = require('../src/models/Role');
const User         = require('../src/models/User');
const Doctor       = require('../src/models/Doctor');
const Paciente     = require('../src/models/Paciente');
const Cita         = require('../src/models/Cita');
const Historial    = require('../src/models/Historial');
const Pago         = require('../src/models/Pago');
const Resultado    = require('../src/models/Resultado');
const Especialidad = require('../src/models/Especialidad');
const Departamento = require('../src/models/Departamento');

// Permisos de lectura que tiene el rol paciente en el sistema real
const roles = [
  { nombre: 'administrador', descripcion: 'Acceso total', permisos: [] },
  {
    nombre: 'paciente', descripcion: 'Paciente', permisos: [
      { module: 'citas',      actions: ['leer'] },
      { module: 'historial',  actions: ['leer'] },
      { module: 'pagos',      actions: ['leer'] },
      { module: 'resultados', actions: ['leer'] }
    ]
  },
  {
    nombre: 'doctor', descripcion: 'Doctor', permisos: [
      { module: 'citas', actions: ['leer'] },
      { module: 'pacientes', actions: ['leer'] },
      { module: 'historial', actions: ['leer'] },
      { module: 'resultados', actions: ['leer'] },
      { module: 'reportes', actions: ['leer'] }
    ]
  }
];

let tokenA;                 // token del paciente A (el "atacante")
let tokenDoctorA;
let pacienteAId, pacienteBId;
let citaAId, citaBId;
let histAId, histBId;
let pagoAId, pagoBId;
let resAId, resBId;
let doctorAId, doctorBId;

// Crea usuario(paciente) + ficha de paciente; devuelve {userId, pacienteId}
async function crearPaciente(roleId, { nombre, email, rut, password }) {
  const user = await User.create({ nombre, apellido: 'Test', email, password, roleId });
  const paciente = await Paciente.create({
    usuarioId: user._id, rut, fechaNacimiento: '1990-05-15', genero: 'masculino', prevision: 'fonasa'
  });
  return { userId: user._id, pacienteId: paciente._id };
}

beforeEach(async () => {
  const rolesCreados = await Role.insertMany(roles);
  const pacienteRole = rolesCreados.find(r => r.nombre === 'paciente');
  const doctorRole = rolesCreados.find(r => r.nombre === 'doctor');

  // Doctor (necesario para citas/historial/resultados)
  const userDoctor = await User.create({
    nombre: 'Carlos', apellido: 'López', email: 'doctor@test.com',
    password: 'Doctor1234', roleId: doctorRole._id
  });
  const dep = await Departamento.create({ nombre: 'Medicina General' });
  const esp = await Especialidad.create({ nombre: 'Medicina Familiar', departamentoId: dep._id });
  const doctor = await Doctor.create({
    usuarioId: userDoctor._id, especialidadId: esp._id, matricula: 'MED-001',
    duracionConsulta: 30, horarios: [{ dia: 'lunes', horaInicio: '08:00', horaFin: '17:00' }]
  });
  doctorAId = doctor._id;

  const userDoctorB = await User.create({
    nombre: 'Diana', apellido: 'Rojas', email: 'doctor-b@test.com',
    password: 'Doctor1234', roleId: doctorRole._id
  });
  const doctorB = await Doctor.create({
    usuarioId: userDoctorB._id, especialidadId: esp._id, matricula: 'MED-002',
    duracionConsulta: 30, horarios: [{ dia: 'lunes', horaInicio: '08:00', horaFin: '17:00' }]
  });
  doctorBId = doctorB._id;

  // Dos pacientes distintos
  const A = await crearPaciente(pacienteRole._id, {
    nombre: 'Ana', email: 'ana@test.com', rut: '11111111-1', password: 'Paciente123'
  });
  const B = await crearPaciente(pacienteRole._id, {
    nombre: 'Beto', email: 'beto@test.com', rut: '22222222-2', password: 'Paciente123'
  });
  pacienteAId = A.pacienteId;
  pacienteBId = B.pacienteId;

  // Una cita por paciente
  const citaA = await Cita.create({ pacienteId: pacienteAId, doctorId: doctor._id, fechaHora: new Date('2026-06-15T09:00:00'), motivo: 'Control A', tipo: 'control' });
  const citaB = await Cita.create({ pacienteId: pacienteBId, doctorId: doctorB._id, fechaHora: new Date('2026-06-15T10:00:00'), motivo: 'Control B', tipo: 'control' });
  citaAId = citaA._id; citaBId = citaB._id;

  // Historial, pago y resultado por paciente
  const hA = await Historial.create({ pacienteId: pacienteAId, citaId: citaAId, doctorId: doctor._id, diagnostico: 'Diag A' });
  const hB = await Historial.create({ pacienteId: pacienteBId, citaId: citaBId, doctorId: doctorB._id, diagnostico: 'Diag B' });
  histAId = hA._id; histBId = hB._id;

  const pA = await Pago.create({ citaId: citaAId, pacienteId: pacienteAId, monto: 1000, metodo: 'efectivo' });
  const pB = await Pago.create({ citaId: citaBId, pacienteId: pacienteBId, monto: 2000, metodo: 'efectivo' });
  pagoAId = pA._id; pagoBId = pB._id;

  const rA = await Resultado.create({ pacienteId: pacienteAId, citaId: citaAId, doctorId: doctor._id, tipo: 'examen_sangre', nombre: 'Hemograma A' });
  const rB = await Resultado.create({ pacienteId: pacienteBId, citaId: citaBId, doctorId: doctorB._id, tipo: 'examen_sangre', nombre: 'Hemograma B' });
  resAId = rA._id; resBId = rB._id;

  // Login como paciente A
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'ana@test.com', password: 'Paciente123' });
  tokenA = login.body.accessToken;
  const loginDoctor = await request(app).post('/api/v1/auth/login').send({ email: 'doctor@test.com', password: 'Doctor1234' });
  tokenDoctorA = loginDoctor.body.accessToken;
});

const auth = () => ({ Authorization: `Bearer ${tokenA}` });
const authDoctor = () => ({ Authorization: `Bearer ${tokenDoctorA}` });

// ─── Historial ────────────────────────────────────────────────
describe('IDOR · Historial', () => {
  test('❌ Paciente A NO puede listar el historial de B', async () => {
    const res = await request(app).get(`/api/v1/historial/paciente/${pacienteBId}`).set(auth());
    expect(res.status).toBe(403);
  });
  test('✅ Paciente A SÍ puede listar su propio historial', async () => {
    const res = await request(app).get(`/api/v1/historial/paciente/${pacienteAId}`).set(auth());
    expect(res.status).toBe(200);
  });
  test('❌ Paciente A NO puede leer un registro de historial de B por ID', async () => {
    const res = await request(app).get(`/api/v1/historial/${histBId}`).set(auth());
    expect(res.status).toBe(403);
  });
  test('✅ Paciente A SÍ puede leer su propio registro por ID', async () => {
    const res = await request(app).get(`/api/v1/historial/${histAId}`).set(auth());
    expect(res.status).toBe(200);
  });
});

// ─── Resultados ───────────────────────────────────────────────
describe('IDOR · Resultados', () => {
  test('❌ A NO puede listar resultados de B', async () => {
    const res = await request(app).get(`/api/v1/resultados/paciente/${pacienteBId}`).set(auth());
    expect(res.status).toBe(403);
  });
  test('❌ A NO puede leer un resultado de B por ID', async () => {
    const res = await request(app).get(`/api/v1/resultados/${resBId}`).set(auth());
    expect(res.status).toBe(403);
  });
  test('✅ A SÍ puede leer su propio resultado por ID', async () => {
    const res = await request(app).get(`/api/v1/resultados/${resAId}`).set(auth());
    expect(res.status).toBe(200);
  });
});

// ─── Pagos ────────────────────────────────────────────────────
describe('IDOR · Pagos', () => {
  test('❌ A NO puede filtrar pagos por el pacienteId de B', async () => {
    const res = await request(app).get(`/api/v1/pagos?pacienteId=${pacienteBId}`).set(auth());
    expect(res.status).toBe(403);
  });
  test('✅ El listado sin filtro solo devuelve los pagos propios de A', async () => {
    const res = await request(app).get('/api/v1/pagos').set(auth());
    expect(res.status).toBe(200);
    const ids = res.body.pagos.map(p => String(p._id));
    expect(ids).toContain(String(pagoAId));
    expect(ids).not.toContain(String(pagoBId));
  });
  test('❌ A NO puede leer un pago de B por ID', async () => {
    const res = await request(app).get(`/api/v1/pagos/${pagoBId}`).set(auth());
    expect(res.status).toBe(403);
  });
});

// ─── Citas ────────────────────────────────────────────────────
describe('IDOR · Citas', () => {
  test('✅ El listado solo devuelve las citas propias de A', async () => {
    const res = await request(app).get('/api/v1/citas').set(auth());
    expect(res.status).toBe(200);
    const ids = res.body.citas.map(c => String(c._id));
    expect(ids).toContain(String(citaAId));
    expect(ids).not.toContain(String(citaBId));
  });
  test('❌ A NO puede leer una cita de B por ID', async () => {
    const res = await request(app).get(`/api/v1/citas/${citaBId}`).set(auth());
    expect(res.status).toBe(403);
  });
  test('✅ A SÍ puede leer su propia cita por ID', async () => {
    const res = await request(app).get(`/api/v1/citas/${citaAId}`).set(auth());
    expect(res.status).toBe(200);
  });
});

describe('IDOR · Alcance del doctor', () => {
  test('❌ Doctor A no puede pedir la agenda de Doctor B', async () => {
    const res = await request(app).get(`/api/v1/citas?doctorId=${doctorBId}`).set(authDoctor());
    expect(res.status).toBe(403);
  });

  test('❌ Doctor A no puede leer la cita de Doctor B por ID', async () => {
    const res = await request(app).get(`/api/v1/citas/${citaBId}`).set(authDoctor());
    expect(res.status).toBe(403);
  });

  test('❌ Doctor A no puede leer historial ni resultados de Doctor B', async () => {
    const [historial, resultado] = await Promise.all([
      request(app).get(`/api/v1/historial/${histBId}`).set(authDoctor()),
      request(app).get(`/api/v1/resultados/${resBId}`).set(authDoctor()),
    ]);
    expect(historial.status).toBe(403);
    expect(resultado.status).toBe(403);
  });

  test('❌ Doctor A no puede leer la ficha de un paciente no asignado', async () => {
    const res = await request(app).get(`/api/v1/pacientes/${pacienteBId}`).set(authDoctor());
    expect(res.status).toBe(403);
  });

  test('❌ Doctor A no puede generar el reporte de Doctor B', async () => {
    const res = await request(app).get(`/api/v1/reportes/doctor/${doctorBId}`).set(authDoctor());
    expect(res.status).toBe(403);
  });

  test('✅ Doctor A conserva acceso a sus recursos asignados', async () => {
    const [cita, paciente, historial, resultado] = await Promise.all([
      request(app).get(`/api/v1/citas/${citaAId}`).set(authDoctor()),
      request(app).get(`/api/v1/pacientes/${pacienteAId}`).set(authDoctor()),
      request(app).get(`/api/v1/historial/${histAId}`).set(authDoctor()),
      request(app).get(`/api/v1/resultados/${resAId}`).set(authDoctor()),
    ]);
    expect([cita.status, paciente.status, historial.status, resultado.status]).toEqual([200, 200, 200, 200]);
  });
});
