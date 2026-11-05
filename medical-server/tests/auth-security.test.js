const request = require('supertest');
const { generate } = require('otplib');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');

const credentials = {
  nombre: 'Marta',
  apellido: 'Segura',
  email: 'marta@test.com',
  password: 'ClaveSegura123',
};

const createUser = async () => {
  const role = await Role.create({ nombre: 'administrador', descripcion: 'Administración', permisos: [] });
  return User.create({ ...credentials, roleId: role._id });
};

describe('Seguridad de sesión web', () => {
  test('emite cookies HttpOnly y exige CSRF para mutaciones autenticadas por cookie', async () => {
    await createUser();
    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send({
      email: credentials.email,
      password: credentials.password,
    });

    expect(login.status).toBe(200);
    expect(login.headers['set-cookie'].join(';')).toContain('medical_access=');
    expect(login.headers['set-cookie'].join(';')).toContain('HttpOnly');

    const rejected = await agent.post('/api/v1/auth/logout');
    expect(rejected.status).toBe(403);

    const logout = await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', login.body.csrfToken);
    expect(logout.status).toBe(200);
  });
});

describe('Autenticación multifactor', () => {
  test('activa TOTP, exige desafío al entrar y acepta un código válido', async () => {
    await createUser();
    const firstLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });

    const setup = await request(app)
      .post('/api/v1/auth/mfa/setup')
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`)
      .send({ password: credentials.password });
    expect(setup.status).toBe(200);
    expect(setup.body.qrCode).toMatch(/^data:image\/png;base64,/);

    const activationCode = await generate({ secret: setup.body.secret });
    const confirmation = await request(app)
      .post('/api/v1/auth/mfa/confirm')
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`)
      .send({ code: activationCode });
    expect(confirmation.status).toBe(200);
    expect(confirmation.body.recoveryCodes).toHaveLength(10);

    const challengedLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(challengedLogin.status).toBe(202);
    expect(challengedLogin.body).toMatchObject({ mfaRequired: true });
    expect(challengedLogin.body.accessToken).toBeUndefined();

    const verificationCode = await generate({ secret: setup.body.secret });
    const verified = await request(app)
      .post('/api/v1/auth/mfa/verify')
      .send({ challengeToken: challengedLogin.body.challengeToken, code: verificationCode });
    expect(verified.status).toBe(200);
    expect(verified.body.usuario.mfaEnabled).toBe(true);
    expect(verified.body.accessToken).toBeTruthy();
  });

  test('rechaza un desafío incompleto sin producir error interno', async () => {
    const response = await request(app).post('/api/v1/auth/mfa/verify').send({});
    expect(response.status).toBe(400);
  });
});
