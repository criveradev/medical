// ═══════════════════════════════════════════════════════════════
// tests/doctores.test.js — Tests de doctores y horarios
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';

const request    = require('supertest');
const app        = require('../src/app');
const Role       = require('../src/models/Role');
const User       = require('../src/models/User');
const Doctor     = require('../src/models/Doctor');
const Especialidad  = require('../src/models/Especialidad');
const Departamento  = require('../src/models/Departamento');

// ─── Datos de prueba ──────────────────────────────────────────
const roles = [
    { nombre: 'administrador', descripcion: 'Acceso total', permisos: [] },
    {
        nombre: 'doctor', descripcion: 'Doctor', permisos: [
            { module: 'pacientes',   actions: ['leer'] },
            { module: 'calendario',  actions: ['leer'] },
            { module: 'historial',   actions: ['crear', 'leer', 'editar'] },
            { module: 'reportes',    actions: ['leer'] }
        ]
    }
];

const usuarioAdmin  = { nombre: 'Admin',  apellido: 'Test', email: 'admin@test.com',  password: 'Admin1234' };
const usuarioDoctor = { nombre: 'Carlos', apellido: 'López', email: 'doctor@test.com', password: 'Doctor1234' };

const horariosBase = [
    { dia: 'lunes',     horaInicio: '08:00', horaFin: '17:00' },
    { dia: 'martes',    horaInicio: '08:00', horaFin: '17:00' },
    { dia: 'miercoles', horaInicio: '08:00', horaFin: '17:00' },
    { dia: 'jueves',    horaInicio: '08:00', horaFin: '17:00' },
    { dia: 'viernes',   horaInicio: '08:00', horaFin: '17:00' }
];

let token;
let doctorId;
let userDoctorId;
let especialidadId;

beforeEach(async () => {
    const rolesCreados = await Role.insertMany(roles);
    const adminRole  = rolesCreados.find(r => r.nombre === 'administrador');
    const doctorRole = rolesCreados.find(r => r.nombre === 'doctor');

    await User.create({ ...usuarioAdmin, roleId: adminRole._id });
    const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });
    token = loginRes.body.accessToken;

    const userDoctor = await User.create({ ...usuarioDoctor, roleId: doctorRole._id });
    userDoctorId = userDoctor._id.toString();

    const dep = await Departamento.create({ nombre: 'Medicina General' });
    const esp = await Especialidad.create({ nombre: 'Medicina Familiar', departamentoId: dep._id });
    especialidadId = esp._id.toString();

    const doctor = await Doctor.create({
        usuarioId:       userDoctor._id,
        especialidadId:  esp._id,
        matricula:       'MED-001',
        duracionConsulta: 30,
        horarios:        horariosBase
    });
    doctorId = doctor._id.toString();
});

// ─── Listar ──────────────────────────────────────────────────
describe('GET /api/v1/doctores', () => {
    test('✅ Listar doctores con token válido', async () => {
        const res = await request(app)
            .get('/api/v1/doctores')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('doctores');
        expect(res.body.doctores.length).toBeGreaterThan(0);
    });

    test('✅ Listar con paginación', async () => {
        const res = await request(app)
            .get('/api/v1/doctores?page=1&limit=5')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('pagina');
        expect(res.body).toHaveProperty('totalPaginas');
    });

    test('✅ Filtrar por especialidad', async () => {
        const res = await request(app)
            .get(`/api/v1/doctores?especialidadId=${especialidadId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.doctores.length).toBe(1);
    });

    test('❌ Listar sin token', async () => {
        const res = await request(app).get('/api/v1/doctores');
        expect(res.status).toBe(401);
    });
});

// ─── Obtener ─────────────────────────────────────────────────
describe('GET /api/v1/doctores/:id', () => {
    test('✅ Obtener doctor por ID', async () => {
        const res = await request(app)
            .get(`/api/v1/doctores/${doctorId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.doctor._id).toBe(doctorId);
    });

    test('❌ Doctor con ID inválido', async () => {
        const res = await request(app)
            .get('/api/v1/doctores/id-invalido')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });

    test('❌ Doctor inexistente', async () => {
        const res = await request(app)
            .get('/api/v1/doctores/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });
});

// ─── Crear ───────────────────────────────────────────────────
describe('POST /api/v1/doctores', () => {
    test('✅ Crear doctor correctamente', async () => {
        // Crear un nuevo usuario doctor
        const doctorRole = await Role.findOne({ nombre: 'doctor' });
        const nuevoUser = await User.create({
            nombre: 'Ana', apellido: 'Martínez',
            email: 'ana@test.com', password: 'Ana12345',
            roleId: doctorRole._id
        });

        const res = await request(app)
            .post('/api/v1/doctores')
            .set('Authorization', `Bearer ${token}`)
            .send({
                usuarioId:      nuevoUser._id,
                especialidadId,
                matricula:      'MED-002',
                duracionConsulta: 30,
                horarios:       horariosBase
            });

        expect(res.status).toBe(201);
        expect(res.body.doctor.matricula).toBe('MED-002');
    });

    test('❌ Crear doctor con matrícula duplicada', async () => {
        const doctorRole = await Role.findOne({ nombre: 'doctor' });
        const nuevoUser = await User.create({
            nombre: 'Luis', apellido: 'Vera',
            email: 'luis@test.com', password: 'Luis1234',
            roleId: doctorRole._id
        });

        const res = await request(app)
            .post('/api/v1/doctores')
            .set('Authorization', `Bearer ${token}`)
            .send({ usuarioId: nuevoUser._id, especialidadId, matricula: 'MED-001' });

        expect(res.status).toBe(409);
    });

    test('❌ Crear doctor con usuario que no tiene rol doctor', async () => {
        const adminRole = await Role.findOne({ nombre: 'administrador' });
        const nuevoUser = await User.create({
            nombre: 'Otro', apellido: 'Admin',
            email: 'otro@test.com', password: 'Otro1234',
            roleId: adminRole._id
        });

        const res = await request(app)
            .post('/api/v1/doctores')
            .set('Authorization', `Bearer ${token}`)
            .send({ usuarioId: nuevoUser._id, especialidadId, matricula: 'MED-003' });

        expect(res.status).toBe(400);
    });

    test('❌ Crear doctor sin token', async () => {
        const res = await request(app)
            .post('/api/v1/doctores')
            .send({ usuarioId: userDoctorId, especialidadId, matricula: 'MED-999' });

        expect(res.status).toBe(401);
    });
});

// ─── Actualizar ───────────────────────────────────────────────
describe('PUT /api/v1/doctores/:id', () => {
    test('✅ Actualizar doctor correctamente', async () => {
        const res = await request(app)
            .put(`/api/v1/doctores/${doctorId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ duracionConsulta: 45 });

        expect(res.status).toBe(200);
    });

    test('❌ Actualizar doctor con ID inválido', async () => {
        const res = await request(app)
            .put('/api/v1/doctores/id-invalido')
            .set('Authorization', `Bearer ${token}`)
            .send({ duracionConsulta: 45 });

        expect(res.status).toBe(400);
    });
});

// ─── Horarios ─────────────────────────────────────────────────
describe('PUT /api/v1/doctores/:id/horarios', () => {
    test('✅ Actualizar horarios correctamente', async () => {
        const nuevosHorarios = [
            { dia: 'lunes', horaInicio: '09:00', horaFin: '18:00' }
        ];

        const res = await request(app)
            .put(`/api/v1/doctores/${doctorId}/horarios`)
            .set('Authorization', `Bearer ${token}`)
            .send({ horarios: nuevosHorarios });

        expect(res.status).toBe(200);
        expect(res.body.horarios[0].horaInicio).toBe('09:00');
    });

    test('❌ Actualizar horarios de doctor inexistente', async () => {
        const res = await request(app)
            .put('/api/v1/doctores/6a1e3b9c23f7382925d313fa/horarios')
            .set('Authorization', `Bearer ${token}`)
            .send({ horarios: horariosBase });

        expect(res.status).toBe(404);
    });
});

// ─── Disponibilidad ───────────────────────────────────────────
describe('GET /api/v1/doctores/disponibilidad/:doctorId', () => {
    test('✅ Ver disponibilidad en día con horario', async () => {
        // Usar mediodía para evitar problemas de zona horaria (UTC vs local)
        const res = await request(app)
            .get(`/api/v1/doctores/disponibilidad/${doctorId}?fecha=2030-06-10`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('slots');
        expect(res.body.slots.length).toBeGreaterThan(0);
    });

    test('✅ Doctor no atiende ese día', async () => {
        // 2026-06-07 es domingo
        const res = await request(app)
            .get(`/api/v1/doctores/disponibilidad/${doctorId}?fecha=2030-06-09`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.disponible).toBe(false);
    });

    test('❌ Ver disponibilidad sin fecha', async () => {
        const res = await request(app)
            .get(`/api/v1/doctores/disponibilidad/${doctorId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });
});
