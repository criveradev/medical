// ═══════════════════════════════════════════════════════════════
// tests/pagos.test.js — Tests de pagos de consultas médicas
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
            { module: 'pacientes', actions: ['leer'] }
        ]
    },
    { nombre: 'paciente', descripcion: 'Paciente', permisos: [] }
];

const usuarioAdmin  = { nombre: 'Admin',  apellido: 'Test',  email: 'admin@test.com',  password: 'Admin1234' };
const usuarioDoctor = { nombre: 'Carlos', apellido: 'López', email: 'doctor@test.com', password: 'Doctor1234' };

let token;
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
        pacienteId, doctorId: doctor._id,
        fechaHora: new Date('2026-06-10T09:00:00'),
        motivo: 'Control general', tipo: 'primera_vez'
    });
    citaId = cita._id;
});

// ─── Listar ──────────────────────────────────────────────────
describe('GET /api/v1/pagos', () => {
    test('✅ Listar pagos con token válido', async () => {
        const res = await request(app)
            .get('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('pagos');
        expect(res.body).toHaveProperty('totalRecaudado');
    });

    test('✅ Filtrar por estado', async () => {
        const res = await request(app)
            .get('/api/v1/pagos?estado=pendiente')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });

    test('✅ Filtrar por paciente', async () => {
        const res = await request(app)
            .get(`/api/v1/pagos?pacienteId=${pacienteId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });

    test('❌ Listar sin token', async () => {
        const res = await request(app).get('/api/v1/pagos');
        expect(res.status).toBe(401);
    });
});

// ─── Crear ───────────────────────────────────────────────────
describe('POST /api/v1/pagos', () => {
    test('✅ Registrar pago correctamente', async () => {
        const res = await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .send({ citaId, pacienteId, monto: 25000, metodo: 'efectivo' });

        expect(res.status).toBe(201);
        expect(res.body.pago.monto).toBe(25000);
        expect(res.body.pago.estado).toBe('pendiente');
    });

    test('✅ Reproduce la respuesta sin duplicar el pago con Idempotency-Key', async () => {
        const payload = { citaId, pacienteId, monto: 25000, metodo: 'efectivo' };
        const key = 'pago-test-idempotente-001';
        const first = await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .set('Idempotency-Key', key)
            .send(payload);

        await new Promise(resolve => setImmediate(resolve));

        const replay = await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .set('Idempotency-Key', key)
            .send(payload);

        expect(first.status).toBe(201);
        expect(replay.status).toBe(201);
        expect(replay.headers['idempotency-replayed']).toBe('true');
        expect(replay.body.pago._id).toBe(first.body.pago._id);
    });

    test('❌ Registrar pago duplicado para la misma cita', async () => {
        const payload = { citaId, pacienteId, monto: 25000, metodo: 'efectivo' };

        await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .send(payload);

        const res = await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .send(payload);

        expect(res.status).toBe(409);
    });

    test('❌ Registrar pago para cita inexistente', async () => {
        const res = await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .send({ citaId: '6a1e3b9c23f7382925d313fa', pacienteId, monto: 25000, metodo: 'efectivo' });

        expect(res.status).toBe(404);
    });

    test('❌ Registrar sin token', async () => {
        const res = await request(app)
            .post('/api/v1/pagos')
            .send({ citaId, pacienteId, monto: 25000, metodo: 'efectivo' });

        expect(res.status).toBe(401);
    });
});

// ─── Obtener ─────────────────────────────────────────────────
describe('GET /api/v1/pagos/:id', () => {
    test('✅ Obtener pago por ID', async () => {
        const creado = await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .send({ citaId, pacienteId, monto: 25000, metodo: 'transferencia' });

        const pagoId = creado.body.pago._id;

        const res = await request(app)
            .get(`/api/v1/pagos/${pagoId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.pago._id).toBe(pagoId);
    });

    test('❌ Pago inexistente', async () => {
        const res = await request(app)
            .get('/api/v1/pagos/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('❌ ID inválido', async () => {
        const res = await request(app)
            .get('/api/v1/pagos/id-invalido')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });
});

// ─── Actualizar ───────────────────────────────────────────────
describe('PUT /api/v1/pagos/:id', () => {
    test('✅ Confirmar pago correctamente', async () => {
        const creado = await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .send({ citaId, pacienteId, monto: 25000, metodo: 'tarjeta' });

        const pagoId = creado.body.pago._id;

        const res = await request(app)
            .put(`/api/v1/pagos/${pagoId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ estado: 'pagado' });

        expect(res.status).toBe(200);
        expect(res.body.pago.estado).toBe('pagado');
        expect(res.body.pago).toHaveProperty('fechaPago');
    });

    test('❌ Actualizar pago inexistente', async () => {
        const res = await request(app)
            .put('/api/v1/pagos/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`)
            .send({ estado: 'pagado' });

        expect(res.status).toBe(404);
    });
});

// ─── Anular ───────────────────────────────────────────────────
describe('PUT /api/v1/pagos/:id/anular', () => {
    test('✅ Anular pago correctamente', async () => {
        const creado = await request(app)
            .post('/api/v1/pagos')
            .set('Authorization', `Bearer ${token}`)
            .send({ citaId, pacienteId, monto: 25000, metodo: 'fonasa' });

        const pagoId = creado.body.pago._id;

        const res = await request(app)
            .put(`/api/v1/pagos/${pagoId}/anular`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.pago.estado).toBe('anulado');
    });

    test('❌ Anular pago inexistente', async () => {
        const res = await request(app)
            .put('/api/v1/pagos/6a1e3b9c23f7382925d313fa/anular')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('❌ Anular sin token', async () => {
        const res = await request(app)
            .put(`/api/v1/pagos/6a1e3b9c23f7382925d313fa/anular`);

        expect(res.status).toBe(401);
    });
});
