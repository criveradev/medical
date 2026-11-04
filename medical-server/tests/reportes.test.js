// ═══════════════════════════════════════════════════════════════
// tests/reportes.test.js — Tests de reportes y estadísticas
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
            { module: 'reportes', actions: ['leer'] },
            { module: 'pacientes', actions: ['leer'] }
        ]
    },
    { nombre: 'paciente', descripcion: 'Paciente', permisos: [] }
];

const usuarioAdmin  = { nombre: 'Admin',  apellido: 'Test',  email: 'admin@test.com',  password: 'Admin1234' };
const usuarioDoctor = { nombre: 'Carlos', apellido: 'López', email: 'doctor@test.com', password: 'Doctor1234' };

let token;
let doctorId;

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
    doctorId = doctor._id.toString();

    // Paciente con cita completada (para que el reporte tenga datos)
    const userPaciente = await User.create({
        nombre: 'Juan', apellido: 'Pérez', email: 'juan@test.com',
        password: '12345678-9', roleId: pacienteRole._id
    });
    const paciente = await Paciente.create({
        usuarioId: userPaciente._id, rut: '12345678-9',
        fechaNacimiento: '1990-05-15', genero: 'masculino', prevision: 'fonasa'
    });

    await Cita.create({
        pacienteId:  paciente._id,
        doctorId:    doctor._id,
        fechaHora:   new Date('2026-06-10T09:00:00'),
        motivo:      'Control general',
        tipo:        'primera_vez',
        estado:      'completada'
    });
});

// ─── Reporte del Doctor ───────────────────────────────────────
describe('GET /api/v1/reportes/doctor/:doctorId', () => {
    test('✅ Obtener reporte del doctor', async () => {
        const res = await request(app)
            .get(`/api/v1/reportes/doctor/${doctorId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('resumen');
        expect(res.body.resumen).toHaveProperty('totalAtenciones');
        expect(res.body.resumen).toHaveProperty('totalPacientesUnicos');
        expect(res.body.resumen).toHaveProperty('citasPorEstado');
        expect(res.body.resumen).toHaveProperty('citasPorMes');
        expect(res.body).toHaveProperty('ultimasAtenciones');
        expect(res.body).toHaveProperty('diagnosticosFrecuentes');
    });

    test('✅ Reporte del doctor con filtro de fechas', async () => {
        const res = await request(app)
            .get(`/api/v1/reportes/doctor/${doctorId}?desde=2026-01-01&hasta=2026-12-31`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.periodo.desde).toBe('2026-01-01');
        expect(res.body.periodo.hasta).toBe('2026-12-31');
        expect(res.body.resumen.totalAtenciones).toBe(1);
    });

    test('✅ Reporte doctor con ID inexistente retorna estructura vacía', async () => {
        const res = await request(app)
            .get('/api/v1/reportes/doctor/6a1e3b9c23f7382925d313fa')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.resumen.totalAtenciones).toBe(0);
    });

    test('❌ Reporte con doctor ID inválido', async () => {
        const res = await request(app)
            .get('/api/v1/reportes/doctor/id-invalido')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
    });

    test('❌ Sin token', async () => {
        const res = await request(app)
            .get(`/api/v1/reportes/doctor/${doctorId}`);

        expect(res.status).toBe(401);
    });
});

// ─── Reporte Admin ────────────────────────────────────────────
describe('GET /api/v1/reportes/admin', () => {
    test('✅ Obtener reporte general del sistema', async () => {
        const res = await request(app)
            .get('/api/v1/reportes/admin')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('resumen');
        expect(res.body.resumen).toHaveProperty('totalPacientes');
        expect(res.body.resumen).toHaveProperty('totalRecaudado');
        expect(res.body.resumen).toHaveProperty('citasPorEstado');
        expect(res.body.resumen).toHaveProperty('citasPorMes');
    });

    test('✅ Reporte admin con filtro de fechas', async () => {
        const res = await request(app)
            .get('/api/v1/reportes/admin?desde=2026-01-01&hasta=2026-12-31')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.periodo.desde).toBe('2026-01-01');
        expect(res.body.resumen.totalPacientes).toBe(1);
    });

    test('✅ Total recaudado es 0 sin pagos', async () => {
        const res = await request(app)
            .get('/api/v1/reportes/admin')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.resumen.totalRecaudado).toBe(0);
    });

    test('❌ Sin token', async () => {
        const res = await request(app).get('/api/v1/reportes/admin');
        expect(res.status).toBe(401);
    });
});
