// ═══════════════════════════════════════════════════════════════
// tests/pacientes.test.js — Tests de pacientes
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';

const request = require('supertest');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const Paciente = require('../src/models/Paciente');

// Datos de prueba
const rolAdmin = {
    nombre: 'administrador',
    descripcion: 'Acceso total',
    permisos: []
};

const rolPaciente = {
    nombre: 'paciente',
    descripcion: 'Solo lectura',
    permisos: [
        { module: 'citas', actions: ['leer'] },
        { module: 'historial', actions: ['leer'] }
    ]
};

const usuarioAdmin = {
    nombre: 'Admin',
    apellido: 'Test',
    email: 'admin@test.com',
    password: 'Admin1234'
};

const pacienteData = {
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@test.com',
    telefono: '+56911111111',
    rut: '12345678-9',
    fechaNacimiento: '1990-05-15',
    genero: 'masculino',
    direccion: 'Av. Principal 123',
    prevision: 'fonasa',
    contactoEmergencia: {
        nombre: 'María Pérez',
        telefono: '+56922222222',
        parentesco: 'madre'
    }
};

let token;

beforeEach(async () => {
    await Role.create(rolPaciente);
    const adminRole = await Role.create(rolAdmin);
    await User.create({ ...usuarioAdmin, roleId: adminRole._id });

    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });

    token = login.body.accessToken;
});

// ─── Tests de Listar ─────────────────────────────────────────
describe('GET /api/v1/pacientes', () => {
    test('✅ Listar pacientes con token válido', async () => {
        const res = await request(app)
            .get('/api/v1/pacientes')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('pacientes');
    });

    test('✅ Listar pacientes con paginación', async () => {
        const res = await request(app)
            .get('/api/v1/pacientes?page=1&limit=5')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('pagina');
        expect(res.body).toHaveProperty('totalPaginas');
        expect(res.body.porPagina).toBe(5);
    });

    test('❌ Listar pacientes sin token', async () => {
        const res = await request(app)
            .get('/api/v1/pacientes');

        expect(res.status).toBe(401);
    });
});

// ─── Tests de Crear ──────────────────────────────────────────
describe('POST /api/v1/pacientes', () => {
    test('✅ Crear paciente correctamente', async () => {
        const res = await request(app)
            .post('/api/v1/pacientes')
            .set('Authorization', `Bearer ${token}`)
            .send(pacienteData);

        expect(res.status).toBe(201);
        expect(res.body.paciente.rut).toBe(pacienteData.rut);
        expect(res.body).toHaveProperty('nota');
    });

    test('❌ Crear paciente sin campos requeridos', async () => {
        const res = await request(app)
            .post('/api/v1/pacientes')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Juan' });

        expect(res.status).toBe(400);
    });

    test('❌ Crear paciente con RUT duplicado', async () => {
        await request(app)
            .post('/api/v1/pacientes')
            .set('Authorization', `Bearer ${token}`)
            .send(pacienteData);

        const res = await request(app)
            .post('/api/v1/pacientes')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...pacienteData, email: 'otro@test.com' });

        expect(res.status).toBe(409);
    });

    test('❌ Crear paciente sin token', async () => {
        const res = await request(app)
            .post('/api/v1/pacientes')
            .send(pacienteData);

        expect(res.status).toBe(401);
    });
});

// ─── Tests de Obtener ─────────────────────────────────────────
describe('GET /api/v1/pacientes/:id', () => {
    test('✅ Obtener paciente por ID', async () => {
        const creado = await request(app)
            .post('/api/v1/pacientes')
            .set('Authorization', `Bearer ${token}`)
            .send(pacienteData);

        const id = creado.body.paciente._id;

        const res = await request(app)
            .get(`/api/v1/pacientes/${id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.paciente._id).toBe(id);
    });

    test('❌ Obtener paciente con ID inválido', async () => {
        const res = await request(app)
            .get('/api/v1/pacientes/id-invalido')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });

    test('❌ Obtener paciente inexistente', async () => {
        const res = await request(app)
            .get('/api/v1/pacientes/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });
});

// ─── Tests de Buscar ──────────────────────────────────────────
describe('GET /api/v1/pacientes?buscar=', () => {
    test('✅ Buscar paciente por nombre', async () => {
        await request(app)
            .post('/api/v1/pacientes')
            .set('Authorization', `Bearer ${token}`)
            .send(pacienteData);

        const res = await request(app)
            .get('/api/v1/pacientes?buscar=Juan')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.pacientes.length).toBeGreaterThan(0);
    });

    test('✅ Buscar paciente inexistente retorna lista vacía', async () => {
        const res = await request(app)
            .get('/api/v1/pacientes?buscar=NoExiste')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.pacientes.length).toBe(0);
    });
});