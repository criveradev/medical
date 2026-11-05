// ═══════════════════════════════════════════════════════════════
// tests/historial.test.js — Tests de historial clínico
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
const Especialidad = require('../src/models/Especialidad');
const Departamento = require('../src/models/Departamento');

// ─── Datos de prueba ──────────────────────────────────────────
const roles = [
    { nombre: 'administrador', descripcion: 'Acceso total', permisos: [] },
    {
        nombre: 'doctor', descripcion: 'Doctor', permisos: [
            { module: 'historial', actions: ['crear', 'leer', 'editar'] },
            { module: 'pacientes', actions: ['leer'] }
        ]
    },
    { nombre: 'paciente', descripcion: 'Paciente', permisos: [{ module: 'historial', actions: ['leer'] }] }
];

const usuarioAdmin  = { nombre: 'Admin',  apellido: 'Test',  email: 'admin@test.com',  password: 'Admin1234' };
const usuarioDoctor = { nombre: 'Carlos', apellido: 'López', email: 'doctor@test.com', password: 'Doctor1234' };

let token;
let doctorId;
let pacienteId;
let citaId;

beforeEach(async () => {
    const rolesCreados = await Role.insertMany(roles);
    const adminRole   = rolesCreados.find(r => r.nombre === 'administrador');
    const doctorRole  = rolesCreados.find(r => r.nombre === 'doctor');
    const pacienteRole = rolesCreados.find(r => r.nombre === 'paciente');

    // Admin
    await User.create({ ...usuarioAdmin, roleId: adminRole._id });
    const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });
    token = loginRes.body.accessToken;

    // Doctor
    const userDoctor = await User.create({ ...usuarioDoctor, roleId: doctorRole._id });
    const dep = await Departamento.create({ nombre: 'Medicina General' });
    const esp = await Especialidad.create({ nombre: 'Medicina Familiar', departamentoId: dep._id });
    const doctor = await Doctor.create({
        usuarioId: userDoctor._id, especialidadId: esp._id,
        matricula: 'MED-001', duracionConsulta: 30,
        horarios: [{ dia: 'lunes', horaInicio: '08:00', horaFin: '17:00' }]
    });
    doctorId = doctor._id;

    // Paciente
    const userPaciente = await User.create({
        nombre: 'Juan', apellido: 'Pérez', email: 'juan@test.com',
        password: '12345678-9', roleId: pacienteRole._id
    });
    const paciente = await Paciente.create({
        usuarioId: userPaciente._id, rut: '12345678-9',
        fechaNacimiento: '1990-05-15', genero: 'masculino', prevision: 'fonasa'
    });
    pacienteId = paciente._id;

    // Cita
    const cita = await Cita.create({
        pacienteId, doctorId,
        fechaHora: new Date('2026-06-10T09:00:00'),
        motivo: 'Control general', tipo: 'primera_vez'
    });
    citaId = cita._id;
});

// ─── Listar por paciente ──────────────────────────────────────
describe('GET /api/v1/historial/paciente/:pacienteId', () => {
    test('✅ Listar historial de paciente', async () => {
        const res = await request(app)
            .get(`/api/v1/historial/paciente/${pacienteId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('historial');
        expect(Array.isArray(res.body.historial)).toBe(true);
    });

    test('✅ Historial vacío si no tiene registros', async () => {
        const res = await request(app)
            .get(`/api/v1/historial/paciente/${pacienteId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(0);
    });

    test('❌ Listar sin token', async () => {
        const res = await request(app)
            .get(`/api/v1/historial/paciente/${pacienteId}`);

        expect(res.status).toBe(401);
    });
});

// ─── Crear historial ──────────────────────────────────────────
describe('POST /api/v1/historial', () => {
    test('✅ Registrar historial correctamente', async () => {
        const res = await request(app)
            .post('/api/v1/historial')
            .set('Authorization', `Bearer ${token}`)
            .send({
                pacienteId, citaId, doctorId,
                diagnostico:  'Cuadro gripal leve',
                tratamiento:  'Reposo 3 días',
                receta:       'Paracetamol 500mg',
                observaciones: 'Paciente estable'
            });

        expect(res.status).toBe(201);
        expect(res.body.registro.diagnostico).toBe('Cuadro gripal leve');
    });

    test('❌ Registrar historial para cita inexistente', async () => {
        const res = await request(app)
            .post('/api/v1/historial')
            .set('Authorization', `Bearer ${token}`)
            .send({
                pacienteId, doctorId,
                citaId:      '6a1e3b9c23f7382925d313fa',
                diagnostico: 'Cuadro gripal'
            });

        expect(res.status).toBe(404);
    });

    test('❌ Registrar historial duplicado para la misma cita', async () => {
        const payload = { pacienteId, citaId, doctorId, diagnostico: 'Gripe' };

        await request(app)
            .post('/api/v1/historial')
            .set('Authorization', `Bearer ${token}`)
            .send(payload);

        const res = await request(app)
            .post('/api/v1/historial')
            .set('Authorization', `Bearer ${token}`)
            .send(payload);

        expect(res.status).toBe(409);
    });

    test('❌ Registrar sin token', async () => {
        const res = await request(app)
            .post('/api/v1/historial')
            .send({ pacienteId, citaId, doctorId, diagnostico: 'Gripe' });

        expect(res.status).toBe(401);
    });
});

// ─── Obtener registro ─────────────────────────────────────────
describe('GET /api/v1/historial/:id', () => {
    test('✅ Obtener registro por ID', async () => {
        const creado = await request(app)
            .post('/api/v1/historial')
            .set('Authorization', `Bearer ${token}`)
            .send({ pacienteId, citaId, doctorId, diagnostico: 'Gripe' });

        const registroId = creado.body.registro._id;

        const res = await request(app)
            .get(`/api/v1/historial/${registroId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.registro._id).toBe(registroId);
    });

    test('❌ Registro inexistente', async () => {
        const res = await request(app)
            .get('/api/v1/historial/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('❌ ID inválido', async () => {
        const res = await request(app)
            .get('/api/v1/historial/id-invalido')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });
});

// ─── Actualizar historial ─────────────────────────────────────
describe('PUT /api/v1/historial/:id', () => {
    test('✅ Actualizar historial correctamente', async () => {
        const creado = await request(app)
            .post('/api/v1/historial')
            .set('Authorization', `Bearer ${token}`)
            .send({ pacienteId, citaId, doctorId, diagnostico: 'Gripe' });

        const registroId = creado.body.registro._id;

        const res = await request(app)
            .put(`/api/v1/historial/${registroId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ diagnostico: 'Gripe actualizada', tratamiento: 'Reposo' });

        expect(res.status).toBe(200);
        expect(res.body.registro.diagnostico).toBe('Gripe actualizada');
    });

    test('❌ Actualizar historial inexistente', async () => {
        const res = await request(app)
            .put('/api/v1/historial/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`)
            .send({ diagnostico: 'Nuevo diagnóstico' });

        expect(res.status).toBe(404);
    });
});
