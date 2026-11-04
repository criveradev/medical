require('dotenv').config();
process.env.MONGO_URI = 'mongodb://localhost:27017/medical_test';
process.env.AUDIT_LOG_SECRET = 'test-audit-secret-with-at-least-32-characters';

const request = require('supertest');
const app = require('../src/app');
const AuditEvent = require('../src/models/AuditEvent');
const Role = require('../src/models/Role');
const User = require('../src/models/User');

describe('Auditoría', () => {
  test('registra accesos sensibles y solo permite consultarlos al administrador', async () => {
    const role = await Role.create({ nombre: 'administrador', descripcion: 'Acceso total', permisos: [] });
    await User.create({
      nombre: 'Admin', apellido: 'Auditoría', email: 'audit@test.com', password: 'Admin1234', roleId: role._id,
    });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'audit@test.com', password: 'Admin1234' });

    await request(app)
      .get('/api/v1/pagos')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    await new Promise(resolve => setImmediate(resolve));

    const event = await AuditEvent.findOne({ resource: 'pagos', action: 'read' });
    expect(event).not.toBeNull();
    expect(event.requestId).toBeTruthy();
    expect(event.ipHash).toBeTruthy();

    const response = await request(app)
      .get('/api/v1/auditoria?resource=pagos')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.eventos).toHaveLength(1);
    expect(response.body.eventos[0]).not.toHaveProperty('ipHash');
  });
});
