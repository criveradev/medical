// ═══════════════════════════════════════════════════════════════
// tests/resultados.test.js — Tests de resultados médicos
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
const Resultado    = require('../src/models/Resultado');
const Especialidad = require('../src/models/Especialidad');
const Departamento = require('../src/models/Departamento');

// ─── Datos de prueba ──────────────────────────────────────────
const roles = [
    { nombre: 'administrador', descripcion: 'Acceso total', permisos: [] },
    {
        nombre: 'doctor', descripcion: 'Doctor', permisos: [
            { module: 'resultados', actions: ['crear', 'leer', 'editar', 'eliminar'] },
            { module: 'pacientes', actions: ['leer'] }
        ]
    },
    { nombre: 'paciente', descripcion: 'Paciente', permisos: [] }
];

const usuarioAdmin  = { nombre: 'Admin',  apellido: 'Test',  email: 'admin@test.com',  password: 'Admin1234' };
const usuarioDoctor = { nombre: 'Carlos', apellido: 'López', email: 'doctor@test.com', password: 'Doctor1234' };

let token;
let doctorId;
let pacienteId;
let citaId;

beforeEach(async () => {
    const rolesCreados = await Role.insertMany(roles);
    const adminRole    = rolesCreados.find(r => r.nombre === 'administrador');
    const doctorRole   = rolesCreados.find(r => r.nombre === 'doctor');
    const pacienteRole = rolesCreados.find(r => r.nombre === 'paciente');

    // Admin
    await User.create({ ...usuarioAdmin, roleId: adminRole._id });
    const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });
    token = loginRes.body.accessToken;

    // Doctor
    const userDoctor = await User.create({ ...usuarioDoctor, roleId: doctorRole._id });
    const dep    = await Departamento.create({ nombre: 'Medicina General' });
    const esp    = await Especialidad.create({ nombre: 'Medicina Familiar', departamentoId: dep._id });
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
describe('GET /api/v1/resultados/paciente/:pacienteId', () => {
    test('✅ Listar resultados de un paciente', async () => {
        await Resultado.create({
            pacienteId, citaId, doctorId,
            tipo: 'examen_sangre', nombre: 'Hemograma'
        });

        const res = await request(app)
            .get(`/api/v1/resultados/paciente/${pacienteId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('resultados');
        expect(res.body.resultados.length).toBe(1);
    });

    test('✅ Paciente sin resultados retorna lista vacía', async () => {
        const res = await request(app)
            .get(`/api/v1/resultados/paciente/${pacienteId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(0);
    });

    test('❌ Listar sin token', async () => {
        const res = await request(app)
            .get(`/api/v1/resultados/paciente/${pacienteId}`);
        expect(res.status).toBe(401);
    });
});

// ─── Crear ───────────────────────────────────────────────────
describe('POST /api/v1/resultados', () => {
    test('✅ Registrar resultado sin archivo', async () => {
        const res = await request(app)
            .post('/api/v1/resultados')
            .set('Authorization', `Bearer ${token}`)
            .field('pacienteId', pacienteId.toString())
            .field('citaId',     citaId.toString())
            .field('doctorId',   doctorId.toString())
            .field('tipo',       'examen_sangre')
            .field('nombre',     'Hemograma completo')
            .field('descripcion', 'Análisis de sangre rutinario');

        expect(res.status).toBe(201);
        expect(res.body.resultado.nombre).toBe('Hemograma completo');
        expect(res.body.resultado.tipo).toBe('examen_sangre');
    });

    test('❌ Crear resultado con cita inexistente', async () => {
        const res = await request(app)
            .post('/api/v1/resultados')
            .set('Authorization', `Bearer ${token}`)
            .field('pacienteId', pacienteId.toString())
            .field('citaId',     '6a1e3b9c23f7382925d313fa')
            .field('doctorId',   doctorId.toString())
            .field('tipo',       'radiografia')
            .field('nombre',     'Rx tórax');

        expect(res.status).toBe(404);
    });

    test('❌ Crear sin token', async () => {
        const res = await request(app)
            .post('/api/v1/resultados')
            .field('pacienteId', pacienteId.toString())
            .field('citaId',     citaId.toString())
            .field('doctorId',   doctorId.toString())
            .field('tipo',       'otro')
            .field('nombre',     'Test');

        expect(res.status).toBe(401);
    });
});

// ─── Obtener ─────────────────────────────────────────────────
describe('GET /api/v1/resultados/:id', () => {
    test('✅ Obtener resultado por ID', async () => {
        const resultado = await Resultado.create({
            pacienteId, citaId, doctorId,
            tipo: 'ecografia', nombre: 'Eco abdominal'
        });

        const res = await request(app)
            .get(`/api/v1/resultados/${resultado._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.resultado._id).toBe(resultado._id.toString());
    });

    test('❌ Resultado inexistente', async () => {
        const res = await request(app)
            .get('/api/v1/resultados/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('❌ ID inválido', async () => {
        const res = await request(app)
            .get('/api/v1/resultados/id-invalido')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });
});

// ─── Actualizar ───────────────────────────────────────────────
describe('PUT /api/v1/resultados/:id', () => {
    test('✅ Actualizar resultado correctamente', async () => {
        const resultado = await Resultado.create({
            pacienteId, citaId, doctorId,
            tipo: 'otro', nombre: 'Test original'
        });

        const res = await request(app)
            .put(`/api/v1/resultados/${resultado._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Test actualizado', observaciones: 'Sin observaciones' });

        expect(res.status).toBe(200);
        expect(res.body.resultado.nombre).toBe('Test actualizado');
    });

    test('❌ Actualizar resultado inexistente', async () => {
        const res = await request(app)
            .put('/api/v1/resultados/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'No existe' });

        expect(res.status).toBe(404);
    });
});

// ─── Eliminar ─────────────────────────────────────────────────
describe('DELETE /api/v1/resultados/:id', () => {
    test('✅ Eliminar resultado correctamente', async () => {
        const resultado = await Resultado.create({
            pacienteId, citaId, doctorId,
            tipo: 'electrocardiograma', nombre: 'ECG'
        });

        const res = await request(app)
            .delete(`/api/v1/resultados/${resultado._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.mensaje).toBe('Resultado eliminado');
    });

    test('❌ Eliminar resultado inexistente', async () => {
        const res = await request(app)
            .delete('/api/v1/resultados/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('❌ Eliminar sin token', async () => {
        const res = await request(app)
            .delete('/api/v1/resultados/6a1e3b9c23f7382925d313fa');
        expect(res.status).toBe(401);
    });
});
