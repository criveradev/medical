// ═══════════════════════════════════════════════════════════════
// tests/usuarios.test.js — Tests de gestión de usuarios (admin)
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';

const request = require('supertest');
const app     = require('../src/app');
const Role    = require('../src/models/Role');
const User    = require('../src/models/User');

// ─── Datos de prueba ──────────────────────────────────────────
const usuarioAdmin = { nombre: 'Admin', apellido: 'Test', email: 'admin@test.com', password: 'Admin1234' };

const nuevoUsuario = {
    nombre:    'Pedro',
    apellido:  'Soto',
    email:     'pedro@test.com',
    password:  'Pedro1234',
    rolNombre: 'recepcionista'
};

const roles = [
    { nombre: 'administrador', descripcion: 'Acceso total', permisos: [] },
    {
        nombre: 'recepcionista', descripcion: 'Recepción', permisos: [
            { module: 'pacientes',  actions: ['crear', 'leer', 'editar'] },
            { module: 'citas',      actions: ['crear', 'leer', 'editar'] }
        ]
    }
];

let token;

beforeEach(async () => {
    const rolesCreados  = await Role.insertMany(roles);
    const adminRole     = rolesCreados.find(r => r.nombre === 'administrador');
    await User.create({ ...usuarioAdmin, roleId: adminRole._id });

    const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });
    token = loginRes.body.accessToken;
});

// ─── Crear usuario ────────────────────────────────────────────
describe('POST /api/v1/auth/usuarios', () => {
    test('✅ Crear usuario correctamente', async () => {
        const res = await request(app)
            .post('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send(nuevoUsuario);

        expect(res.status).toBe(201);
        expect(res.body.usuario.email).toBe(nuevoUsuario.email);
    });

    test('❌ Crear usuario con email duplicado', async () => {
        await request(app)
            .post('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send(nuevoUsuario);

        const res = await request(app)
            .post('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send(nuevoUsuario);

        expect(res.status).toBe(409);
    });

    test('❌ Crear usuario con rol inexistente', async () => {
        const res = await request(app)
            .post('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...nuevoUsuario, rolNombre: 'rol_que_no_existe' });

        expect(res.status).toBe(400);
    });

    test('❌ Crear usuario sin campos requeridos', async () => {
        const res = await request(app)
            .post('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Solo nombre' });

        expect(res.status).toBe(400);
    });

    test('❌ Crear usuario sin token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/usuarios')
            .send(nuevoUsuario);

        expect(res.status).toBe(401);
    });
});

// ─── Listar usuarios ──────────────────────────────────────────
describe('GET /api/v1/auth/usuarios', () => {
    test('✅ Listar usuarios con token de admin', async () => {
        const res = await request(app)
            .get('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('usuarios');
        expect(res.body.total).toBeGreaterThan(0);
    });

    test('❌ Listar usuarios sin token', async () => {
        const res = await request(app).get('/api/v1/auth/usuarios');
        expect(res.status).toBe(401);
    });
});

// ─── Actualizar usuario ───────────────────────────────────────
describe('PUT /api/v1/auth/usuarios/:id', () => {
    test('✅ Actualizar usuario correctamente', async () => {
        const creado = await request(app)
            .post('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send(nuevoUsuario);

        const userId = creado.body.usuario._id;

        const res = await request(app)
            .put(`/api/v1/auth/usuarios/${userId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Pedro Actualizado', telefono: '+56911111111' });

        expect(res.status).toBe(200);
        expect(res.body.usuario.nombre).toBe('Pedro Actualizado');
    });

    test('✅ Cambiar rol de usuario', async () => {
        const creado = await request(app)
            .post('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send(nuevoUsuario);

        const userId = creado.body.usuario._id;

        const res = await request(app)
            .put(`/api/v1/auth/usuarios/${userId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ rolNombre: 'administrador' });

        expect(res.status).toBe(200);
    });

    test('❌ Actualizar usuario inexistente', async () => {
        const res = await request(app)
            .put('/api/v1/auth/usuarios/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'No existe' });

        expect(res.status).toBe(404);
    });

    test('❌ Actualizar con ID inválido', async () => {
        const res = await request(app)
            .put('/api/v1/auth/usuarios/id-invalido')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Test' });

        expect(res.status).toBe(400);
    });
});

// ─── Eliminar usuario (soft delete) ───────────────────────────
describe('DELETE /api/v1/auth/usuarios/:id', () => {
    test('✅ Desactivar usuario correctamente', async () => {
        const creado = await request(app)
            .post('/api/v1/auth/usuarios')
            .set('Authorization', `Bearer ${token}`)
            .send(nuevoUsuario);

        const userId = creado.body.usuario._id;

        const res = await request(app)
            .delete(`/api/v1/auth/usuarios/${userId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.mensaje).toBe('Usuario desactivado correctamente');
    });

    test('❌ Desactivar usuario inexistente', async () => {
        const res = await request(app)
            .delete('/api/v1/auth/usuarios/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('❌ Desactivar sin token', async () => {
        const res = await request(app)
            .delete('/api/v1/auth/usuarios/6a1e3b9c23f7382925d313fa');
        expect(res.status).toBe(401);
    });
});

// ─── Cambiar contraseña ───────────────────────────────────────
describe('PUT /api/v1/auth/cambiar-password', () => {
    test('✅ Cambiar contraseña correctamente', async () => {
        const res = await request(app)
            .put('/api/v1/auth/cambiar-password')
            .set('Authorization', `Bearer ${token}`)
            .send({ passwordActual: 'Admin1234', passwordNueva: 'NuevoPass123' });

        expect(res.status).toBe(200);
        expect(res.body.mensaje).toContain('actualizada');
    });

    test('❌ Cambiar con contraseña actual incorrecta', async () => {
        const res = await request(app)
            .put('/api/v1/auth/cambiar-password')
            .set('Authorization', `Bearer ${token}`)
            .send({ passwordActual: 'WrongPass', passwordNueva: 'NuevoPass123' });

        expect(res.status).toBe(401);
    });

    test('❌ Cambiar con contraseña muy corta', async () => {
        const res = await request(app)
            .put('/api/v1/auth/cambiar-password')
            .set('Authorization', `Bearer ${token}`)
            .send({ passwordActual: 'Admin1234', passwordNueva: '123' });

        expect(res.status).toBe(400);
    });

    test('❌ Cambiar sin token', async () => {
        const res = await request(app)
            .put('/api/v1/auth/cambiar-password')
            .send({ passwordActual: 'Admin1234', passwordNueva: 'NuevoPass123' });

        expect(res.status).toBe(401);
    });
});
