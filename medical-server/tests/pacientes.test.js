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
const transporter = require('../src/config/email');

const origenPrevio = process.env.CLIENT_URL;

beforeAll(() => { process.env.CLIENT_URL = 'https://medical.example.test,https://otro.example.test'; });
afterAll(() => {
    if (origenPrevio === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = origenPrevio;
});
afterEach(() => jest.restoreAllMocks());

function extraerToken(correo) {
    const enlace = new URL(correo.text.match(/https:\/\/[^\s]+\/activar-cuenta#[^\s]+/)[0]);
    expect(enlace.origin).toBe('https://medical.example.test');
    expect(enlace.search).toBe('');
    expect(correo.html).toContain(enlace.href);
    return new URLSearchParams(enlace.hash.slice(1)).get('token');
}

function activar(tokenInvitacion, password = 'Una clave nueva y segura') {
    return request(app).post('/api/v1/registro/activacion').send({ token: tokenInvitacion, password });
}

function loginPaciente(password) {
    return request(app).post('/api/v1/auth/login').send({ email: pacienteData.email, password });
}

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

function crearPaciente(datos = pacienteData) {
    return request(app).post('/api/v1/pacientes').set('Authorization', `Bearer ${token}`).send(datos);
}

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
    test('Crea una ficha y una cuenta pendiente que no admite el RUT como contraseña', async () => {
        const envio = jest.spyOn(transporter, 'sendMail');
        const res = await crearPaciente();

        expect(res.status).toBe(201);
        expect(res.body.paciente.rut).toBe(pacienteData.rut);
        expect(res.body.invitacionEnviada).toBe(true);
        const tokenInvitacion = extraerToken(envio.mock.calls[0][0]);
        expect(JSON.stringify(res.body)).not.toContain(tokenInvitacion);

        const usuario = await User.findById(res.body.paciente.usuarioId).select('+password +activacion');
        expect(usuario.pendienteActivacion).toBe(true);
        expect(usuario.activacion.huella).toMatch(/^[a-f0-9]{64}$/);
        expect(JSON.stringify(usuario)).not.toContain(usuario.activacion.huella);
        expect(await usuario.compararPassword('123456789')).toBe(false);
        expect((await loginPaciente('123456789')).status).toBe(401);
    });

    test('Permite activar una sola vez incluso con dos solicitudes concurrentes', async () => {
        const envio = jest.spyOn(transporter, 'sendMail');
        const alta = await crearPaciente();
        const invitacion = extraerToken(envio.mock.calls[0][0]);

        const claveA = 'Una clave nueva y segura';
        const claveB = 'Otra clave nueva y segura';
        const [a, b] = await Promise.all([activar(invitacion, claveA), activar(invitacion, claveB)]);
        expect([a.status, b.status].sort()).toEqual([200, 400]);
        expect((await activar(invitacion)).status).toBe(400);
        expect((await loginPaciente(a.status === 200 ? claveA : claveB)).status).toBe(200);

        const usuario = await User.findById(alta.body.paciente.usuarioId).select('+activacion');
        expect(usuario.pendienteActivacion).toBe(false);
        expect(usuario.activacion).toBeUndefined();
    });

    test('Rechaza una invitación vencida y mantiene la cuenta pendiente', async () => {
        const envio = jest.spyOn(transporter, 'sendMail');
        const alta = await crearPaciente();
        const invitacion = extraerToken(envio.mock.calls[0][0]);
        await User.findByIdAndUpdate(alta.body.paciente.usuarioId, { 'activacion.venceEn': new Date(0) });

        expect((await activar(invitacion)).status).toBe(400);
        expect((await loginPaciente('Una clave nueva y segura')).status).toBe(401);
    });

    test('Rechaza secretos alterados, contraseñas inválidas y enlaces emitidos para otro correo', async () => {
        const envio = jest.spyOn(transporter, 'sendMail');
        const alta = await crearPaciente();
        const invitacion = extraerToken(envio.mock.calls[0][0]);
        const [id, secreto] = invitacion.split('.');
        const alterado = `${id}.${secreto[0] === 'a' ? 'b' : 'a'}${secreto.slice(1)}`;

        expect((await activar({ $ne: null })).status).toBe(400);
        expect((await activar(alterado)).status).toBe(400);
        expect((await activar(invitacion, '123')).status).toBe(400);
        expect((await activar(invitacion, '12.345.678-9')).status).toBe(400);
        expect((await activar(invitacion, 'á'.repeat(37))).status).toBe(400);
        await User.findByIdAndUpdate(alta.body.paciente.usuarioId, { email: 'cambio@example.test' });
        expect((await activar(invitacion)).status).toBe(400);
    });

    test('Permite reenviar después de un fallo sin duplicar la ficha ni divulgar el error del correo', async () => {
        const envio = jest.spyOn(transporter, 'sendMail')
            .mockRejectedValueOnce(new Error('Respuesta privada del proveedor'));
        const alta = await crearPaciente();
        const anterior = extraerToken(envio.mock.calls[0][0]);
        const url = `/api/v1/pacientes/${alta.body.paciente._id}/activacion`;
        expect(alta.status).toBe(201);
        expect(alta.body.invitacionEnviada).toBe(false);
        expect(JSON.stringify(alta.body)).not.toContain('Respuesta privada');
        expect((await request(app).post(url)).status).toBe(401);
        expect((await request(app).post(url).set('Authorization', `Bearer ${token}`)).status).toBe(409);

        await User.findByIdAndUpdate(alta.body.paciente.usuarioId, { 'activacion.venceEn': new Date(Date.now() + 60_000) });
        const resultados = await Promise.all([
            request(app).post(url).set('Authorization', `Bearer ${token}`),
            request(app).post(url).set('Authorization', `Bearer ${token}`),
        ]);
        expect(resultados.map(resultado => resultado.status).sort()).toEqual([200, 409]);
        expect(envio).toHaveBeenCalledTimes(2);
        const nueva = extraerToken(envio.mock.calls[1][0]);
        expect((await activar(anterior)).status).toBe(400);
        expect((await activar(nueva)).status).toBe(200);
        expect(await Paciente.countDocuments()).toBe(1);
        expect((await request(app).post(url).set('Authorization', `Bearer ${token}`)).status).toBe(409);
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
        expect(await User.exists({ email: 'otro@test.com' })).toBeNull();
        expect(await Paciente.countDocuments()).toBe(1);
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