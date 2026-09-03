// ═══════════════════════════════════════════════════════════════
// tests/auth.test.js — Tests de autenticación
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';


const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Role = require('../src/models/Role');

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

let adminRole;
let accessToken;

// Crear rol y usuario antes de los tests
beforeEach(async () => {
    adminRole = await Role.create(rolAdmin);
    await User.create({ ...usuarioAdmin, roleId: adminRole._id });
});

// ─── Tests de Login ───────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
    test('✅ Login exitoso con credenciales correctas', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body.usuario.email).toBe(usuarioAdmin.email);
        expect(res.body.usuario.rol).toBe('administrador');

        accessToken = res.body.accessToken;
    });

    test('✅ Entrega la sesión del navegador en cookies HttpOnly', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });

        const cookies = res.headers['set-cookie'];
        expect(cookies.some(cookie => cookie.startsWith('medical_access=') && cookie.includes('HttpOnly'))).toBe(true);
        expect(cookies.some(cookie => cookie.startsWith('medical_refresh=') && cookie.includes('HttpOnly'))).toBe(true);
        expect(cookies.some(cookie => cookie.startsWith('medical_csrf=') && !cookie.includes('HttpOnly'))).toBe(true);
        expect(res.body).toHaveProperty('csrfToken');
    });

    test('❌ Login fallido con password incorrecta', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: usuarioAdmin.email, password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.mensaje).toBe('Credenciales inválidas');
    });

    test('❌ Login fallido con email inexistente', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'noexiste@test.com', password: 'Admin1234' });

        expect(res.status).toBe(401);
        expect(res.body.mensaje).toBe('Credenciales inválidas');
    });

    test('❌ Login fallido sin email', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ password: 'Admin1234' });

        expect(res.status).toBe(400);
    });

    test('❌ Login fallido sin password', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: usuarioAdmin.email });

        expect(res.status).toBe(400);
    });
});

// ─── Tests del contrato público ───────────────────────────────
describe('Versionado HTTP', () => {
    test('✅ Expone metadatos de la versión canónica', async () => {
        const res = await request(app).get('/api/v1');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            servicio: 'Medical API',
            version: 'v1',
            estado: 'ok',
            docs: '/api/v1/docs',
        });
    });

    test('❌ Rechaza rutas sin una versión explícita', async () => {
        const res = await request(app).post('/api/auth/login');

        expect(res.status).toBe(404);
    });

    test('❌ No publica documentación sin versión', async () => {
        const res = await request(app).get('/api/docs');

        expect(res.status).toBe(404);
    });

    test('✅ Publica la documentación dentro del contrato v1', async () => {
        const res = await request(app).get('/api/v1/docs/');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });

    test('❌ No trata una versión inexistente como ruta legada', async () => {
        const res = await request(app).get('/api/v2');

        expect(res.status).toBe(404);
    });

    test('✅ La raíz informa el estado general sin asumir una versión', async () => {
        const res = await request(app).get('/');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ servicio: 'Medical API', estado: 'ok' });
    });
});

// ─── Tests de Perfil ──────────────────────────────────────────
describe('GET /api/v1/auth/perfil', () => {
    test('✅ Obtener perfil con token válido', async () => {
        // Primero hacer login
        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });

        const token = login.body.accessToken;

        const res = await request(app)
            .get('/api/v1/auth/perfil')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.usuario.email).toBe(usuarioAdmin.email);
    });

    test('❌ Obtener perfil sin token', async () => {
        const res = await request(app)
            .get('/api/v1/auth/perfil');

        expect(res.status).toBe(401);
    });

    test('❌ Obtener perfil con token inválido', async () => {
        const res = await request(app)
            .get('/api/v1/auth/perfil')
            .set('Authorization', 'Bearer tokeninvalido');

        expect(res.status).toBe(401);
    });
});

// ─── Tests de Refresh Token ───────────────────────────────────
describe('POST /api/v1/auth/refresh', () => {
    test('✅ Renovar token con refresh token válido', async () => {
        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });

        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .send({ refreshToken: login.body.refreshToken });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
    });

    test('❌ Renovar token con refresh token inválido', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .send({ refreshToken: 'tokeninvalido' });

        expect(res.status).toBe(401);
    });
});

// ─── Tests de Logout ──────────────────────────────────────────
describe('POST /api/v1/auth/logout', () => {
    test('✅ Cerrar sesión correctamente', async () => {
        const login = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });

        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${login.body.accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.mensaje).toBe('Sesión cerrada correctamente');
    });

    test('✅ Protege mutaciones con cookie mediante CSRF e invalida el access token', async () => {
        const agent = request.agent(app);
        const login = await agent
            .post('/api/v1/auth/login')
            .send({ email: usuarioAdmin.email, password: usuarioAdmin.password });

        const sinCsrf = await agent.post('/api/v1/auth/logout');
        expect(sinCsrf.status).toBe(403);

        const logout = await agent
            .post('/api/v1/auth/logout')
            .set('X-CSRF-Token', login.body.csrfToken);
        expect(logout.status).toBe(200);

        const perfil = await request(app)
            .get('/api/v1/auth/perfil')
            .set('Authorization', `Bearer ${login.body.accessToken}`);
        expect(perfil.status).toBe(401);
    });
});
