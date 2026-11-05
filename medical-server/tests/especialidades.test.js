// ═══════════════════════════════════════════════════════════════
// tests/especialidades.test.js — Tests de especialidades médicas
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';

const request      = require('supertest');
const app          = require('../src/app');
const Role         = require('../src/models/Role');
const User         = require('../src/models/User');
const Especialidad = require('../src/models/Especialidad');
const Departamento = require('../src/models/Departamento');

// ─── Datos de prueba ──────────────────────────────────────────
const usuarioAdmin = { nombre: 'Admin', apellido: 'Test', email: 'admin@test.com', password: 'Admin1234' };

let token;
let depId;

beforeEach(async () => {
    const adminRole = await Role.create({ nombre: 'administrador', descripcion: 'Acceso total', permisos: [] });
    await User.create({ ...usuarioAdmin, roleId: adminRole._id });

    const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });
    token = loginRes.body.accessToken;

    const dep = await Departamento.create({ nombre: 'Medicina General' });
    depId = dep._id.toString();
});

// ─── Listar ──────────────────────────────────────────────────
describe('GET /api/v1/especialidades', () => {
    test('✅ Listar especialidades', async () => {
        await Especialidad.create({ nombre: 'Cardiología', departamentoId: depId });

        const res = await request(app)
            .get('/api/v1/especialidades')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('especialidades');
        expect(res.body.especialidades.length).toBe(1);
    });

    test('✅ Listar retorna vacío sin especialidades', async () => {
        const res = await request(app)
            .get('/api/v1/especialidades')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.especialidades.length).toBe(0);
    });

    test('❌ Listar sin token', async () => {
        const res = await request(app).get('/api/v1/especialidades');
        expect(res.status).toBe(401);
    });
});

// ─── Listar por departamento ──────────────────────────────────
describe('GET /api/v1/especialidades/departamento/:departamentoId', () => {
    test('✅ Listar por departamento correcto', async () => {
        await Especialidad.create({ nombre: 'Medicina Familiar', departamentoId: depId });

        const res = await request(app)
            .get(`/api/v1/especialidades/departamento/${depId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.especialidades.length).toBe(1);
    });

    test('✅ Departamento sin especialidades retorna vacío', async () => {
        const otroDep = await Departamento.create({ nombre: 'Otro' });

        const res = await request(app)
            .get(`/api/v1/especialidades/departamento/${otroDep._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.especialidades.length).toBe(0);
    });
});

// ─── Crear ───────────────────────────────────────────────────
describe('POST /api/v1/especialidades', () => {
    test('✅ Crear especialidad correctamente', async () => {
        const res = await request(app)
            .post('/api/v1/especialidades')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Cardiología', descripcion: 'Corazón', departamentoId: depId });

        expect(res.status).toBe(201);
        expect(res.body.especialidad.nombre).toBe('Cardiología');
    });

    test('❌ Crear con departamento inexistente', async () => {
        const res = await request(app)
            .post('/api/v1/especialidades')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Neurología', departamentoId: '6a1e3b9c23f7382925d313fa' });

        expect(res.status).toBe(404);
    });

    test('❌ Crear sin token', async () => {
        const res = await request(app)
            .post('/api/v1/especialidades')
            .send({ nombre: 'Neurología', departamentoId: depId });

        expect(res.status).toBe(401);
    });
});

// ─── Actualizar ───────────────────────────────────────────────
describe('PUT /api/v1/especialidades/:id', () => {
    test('✅ Actualizar especialidad correctamente', async () => {
        const esp = await Especialidad.create({ nombre: 'Pediatría', departamentoId: depId });

        const res = await request(app)
            .put(`/api/v1/especialidades/${esp._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Pediatría General', descripcion: 'Niños' });

        expect(res.status).toBe(200);
        expect(res.body.especialidad.nombre).toBe('Pediatría General');
    });

    test('❌ Actualizar especialidad inexistente', async () => {
        const res = await request(app)
            .put('/api/v1/especialidades/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'No existe' });

        expect(res.status).toBe(404);
    });

    test('❌ Actualizar con ID inválido', async () => {
        const res = await request(app)
            .put('/api/v1/especialidades/id-invalido')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Test' });

        expect(res.status).toBe(400);
    });
});

// ─── Eliminar ─────────────────────────────────────────────────
describe('DELETE /api/v1/especialidades/:id', () => {
    test('✅ Desactivar especialidad correctamente', async () => {
        const esp = await Especialidad.create({ nombre: 'Traumatología', departamentoId: depId });

        const res = await request(app)
            .delete(`/api/v1/especialidades/${esp._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.mensaje).toBe('Especialidad desactivada');
    });

    test('❌ Desactivar especialidad inexistente', async () => {
        const res = await request(app)
            .delete('/api/v1/especialidades/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('❌ Desactivar sin token', async () => {
        const esp = await Especialidad.create({ nombre: 'Oncología', departamentoId: depId });

        const res = await request(app)
            .delete(`/api/v1/especialidades/${esp._id}`);

        expect(res.status).toBe(401);
    });
});
