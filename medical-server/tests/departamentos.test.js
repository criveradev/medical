// ═══════════════════════════════════════════════════════════════
// tests/departamentos.test.js — Tests de departamentos
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';

const request = require('supertest');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const Departamento = require('../src/models/Departamento');

// Datos de prueba
const rolAdmin = {
    nombre: 'administrador',
    descripcion: 'Acceso total',
    permisos: []
};

const usuarioAdmin = {
    nombre: 'Admin',
    apellido: 'Test',
    email: 'admin@test.com',
    password: 'Admin1234'
};

let token;

// Crear rol, usuario y hacer login antes de cada test
beforeEach(async () => {
    const adminRole = await Role.create(rolAdmin);
    await User.create({ ...usuarioAdmin, roleId: adminRole._id });

    const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });

    token = login.body.accessToken;
});

// ─── Tests de Listar ─────────────────────────────────────────
describe('GET /api/v1/departamentos', () => {
    test('✅ Listar departamentos con token válido', async () => {
        await Departamento.create({ nombre: 'Medicina General' });

        const res = await request(app)
            .get('/api/v1/departamentos')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('departamentos');
        expect(res.body.departamentos.length).toBe(1);
    });

    test('❌ Listar departamentos sin token', async () => {
        const res = await request(app)
            .get('/api/v1/departamentos');

        expect(res.status).toBe(401);
    });
});

// ─── Tests de Crear ──────────────────────────────────────────
describe('POST /api/v1/departamentos', () => {
    test('✅ Crear departamento correctamente', async () => {
        const res = await request(app)
            .post('/api/v1/departamentos')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Cardiología', descripcion: 'Enfermedades del corazón' });

        expect(res.status).toBe(201);
        expect(res.body.departamento.nombre).toBe('Cardiología');
    });

    test('❌ Crear departamento sin nombre', async () => {
        const res = await request(app)
            .post('/api/v1/departamentos')
            .set('Authorization', `Bearer ${token}`)
            .send({ descripcion: 'Sin nombre' });

        expect(res.status).toBe(400);
    });

    test('❌ Crear departamento duplicado', async () => {
        await Departamento.create({ nombre: 'Cardiología' });

        const res = await request(app)
            .post('/api/v1/departamentos')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Cardiología' });

        expect(res.status).toBe(409);
    });

    test('❌ Crear departamento sin token', async () => {
        const res = await request(app)
            .post('/api/v1/departamentos')
            .send({ nombre: 'Neurología' });

        expect(res.status).toBe(401);
    });
});

// ─── Tests de Actualizar ──────────────────────────────────────
describe('PUT /api/v1/departamentos/:id', () => {
    test('✅ Actualizar departamento correctamente', async () => {
        const dep = await Departamento.create({ nombre: 'Pediatría' });

        const res = await request(app)
            .put(`/api/v1/departamentos/${dep._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Pediatría General', descripcion: 'Atención a niños' });

        expect(res.status).toBe(200);
        expect(res.body.departamento.nombre).toBe('Pediatría General');
    });

    test('❌ Actualizar departamento con ID inválido', async () => {
        const res = await request(app)
            .put('/api/v1/departamentos/id-invalido')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Nuevo nombre' });

        expect(res.status).toBe(400);
    });
});

// ─── Tests de Eliminar ────────────────────────────────────────
describe('DELETE /api/v1/departamentos/:id', () => {
    test('✅ Desactivar departamento correctamente', async () => {
        const dep = await Departamento.create({ nombre: 'Traumatología' });

        const res = await request(app)
            .delete(`/api/v1/departamentos/${dep._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.mensaje).toBe('Departamento desactivado');
    });

    test('❌ Desactivar departamento con ID inválido', async () => {
        const res = await request(app)
            .delete('/api/v1/departamentos/id-invalido')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });
});