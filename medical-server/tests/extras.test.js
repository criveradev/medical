// ═══════════════════════════════════════════════════════════════
// tests/extras.test.js — Endpoints y permisos añadidos recientemente
//   - GET /api/v1/pacientes/mi-ficha
//   - GET /api/v1/doctores/mi-perfil
//   - GET /api/v1/doctores/siguiente-matricula
//   - PUT /api/v1/auth/perfil/foto (sin archivo → 400)
//   - Permisos: recepcionista doctores:leer, doctor citas:leer
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';

const request      = require('supertest');
const app          = require('../src/app');
const Role         = require('../src/models/Role');
const User         = require('../src/models/User');
const Doctor       = require('../src/models/Doctor');
const Paciente     = require('../src/models/Paciente');
const Especialidad = require('../src/models/Especialidad');
const Departamento = require('../src/models/Departamento');

const roles = [
  { nombre: 'administrador', descripcion: 'Acceso total', permisos: [] },
  {
    nombre: 'recepcionista', descripcion: 'Recepción', permisos: [
      { module: 'pacientes', actions: ['crear', 'leer', 'editar'] },
      { module: 'citas', actions: ['crear', 'leer', 'editar'] },
      { module: 'doctores', actions: ['leer'] },
    ]
  },
  {
    nombre: 'doctor', descripcion: 'Doctor', permisos: [
      { module: 'citas', actions: ['leer'] },
      { module: 'pacientes', actions: ['leer'] },
    ]
  },
  { nombre: 'paciente', descripcion: 'Paciente', permisos: [{ module: 'citas', actions: ['leer'] }] },
];

const PASS = 'Clave1234';
let tokenAdmin, tokenRecep, tokenDoctor, tokenPaciente;

async function login(email) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASS });
  return res.body.accessToken;
}

beforeEach(async () => {
  const r = await Role.insertMany(roles);
  const byName = (n) => r.find((x) => x.nombre === n)._id;

  await User.create({ nombre: 'Admin', apellido: 'Test', email: 'admin@test.com', password: PASS, roleId: byName('administrador') });
  await User.create({ nombre: 'Reni', apellido: 'Recep', email: 'recep@test.com', password: PASS, roleId: byName('recepcionista') });

  const userDoctor = await User.create({ nombre: 'Dino', apellido: 'Doc', email: 'doc@test.com', password: PASS, roleId: byName('doctor') });
  const dep = await Departamento.create({ nombre: 'Medicina General' });
  const esp = await Especialidad.create({ nombre: 'Medicina Familiar', departamentoId: dep._id });
  await Doctor.create({
    usuarioId: userDoctor._id, especialidadId: esp._id, matricula: 'MED-001',
    duracionConsulta: 30, horarios: [{ dia: 'lunes', horaInicio: '08:00', horaFin: '17:00' }],
  });

  const userPaciente = await User.create({ nombre: 'Pia', apellido: 'Pac', email: 'pac@test.com', password: PASS, roleId: byName('paciente') });
  await Paciente.create({ usuarioId: userPaciente._id, rut: '12.345.678-9', fechaNacimiento: '1990-05-15', genero: 'femenino', prevision: 'fonasa' });

  tokenAdmin = await login('admin@test.com');
  tokenRecep = await login('recep@test.com');
  tokenDoctor = await login('doc@test.com');
  tokenPaciente = await login('pac@test.com');
});

// ─── Ficha / perfil propios ───────────────────────────────────
describe('GET /api/v1/pacientes/mi-ficha', () => {
  test('✅ El paciente obtiene su propia ficha', async () => {
    const res = await request(app).get('/api/v1/pacientes/mi-ficha').set('Authorization', `Bearer ${tokenPaciente}`);
    expect(res.status).toBe(200);
    expect(res.body.paciente.rut).toBe('12.345.678-9');
  });
  test('❌ Un usuario sin ficha de paciente recibe 404', async () => {
    const res = await request(app).get('/api/v1/pacientes/mi-ficha').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(404);
  });
  test('❌ Sin token → 401', async () => {
    const res = await request(app).get('/api/v1/pacientes/mi-ficha');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/doctores/mi-perfil', () => {
  test('✅ El doctor obtiene su propio perfil', async () => {
    const res = await request(app).get('/api/v1/doctores/mi-perfil').set('Authorization', `Bearer ${tokenDoctor}`);
    expect(res.status).toBe(200);
    expect(res.body.doctor.matricula).toBe('MED-001');
  });
  test('❌ Un usuario sin perfil de doctor recibe 404', async () => {
    const res = await request(app).get('/api/v1/doctores/mi-perfil').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/doctores/siguiente-matricula', () => {
  test('✅ Sugiere una matrícula con formato MED-####', async () => {
    const res = await request(app).get('/api/v1/doctores/siguiente-matricula').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body.matricula).toMatch(/^MED-\d{4}$/);
  });
});

// ─── Foto de perfil ───────────────────────────────────────────
describe('PUT /api/v1/auth/perfil/foto', () => {
  test('❌ Sin archivo → 400', async () => {
    const res = await request(app).put('/api/v1/auth/perfil/foto').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(400);
  });
  test('❌ Sin token → 401', async () => {
    const res = await request(app).put('/api/v1/auth/perfil/foto');
    expect(res.status).toBe(401);
  });
});

// ─── Permisos ajustados ───────────────────────────────────────
describe('Permisos recientes', () => {
  test('✅ Recepción puede leer doctores (para agendar)', async () => {
    const res = await request(app).get('/api/v1/doctores').set('Authorization', `Bearer ${tokenRecep}`);
    expect(res.status).toBe(200);
  });
  test('✅ El doctor puede leer citas (su agenda)', async () => {
    const res = await request(app).get('/api/v1/citas').set('Authorization', `Bearer ${tokenDoctor}`);
    expect(res.status).toBe(200);
  });
});
