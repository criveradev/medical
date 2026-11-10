const request = require('supertest');
const { generate } = require('otplib');
const app = require('../src/app');
const Role = require('../src/models/Role');
const User = require('../src/models/User');
const { ACCESS_COOKIE } = require('../src/config/auth-cookies');
const { inicializar } = require('../src/services/notificaciones.service');

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
  test('rechaza el desafío como sesión HTTP o Socket.IO hasta verificar el segundo factor', async () => {
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
    const { challengeToken } = challengedLogin.body;
    const io = { use: jest.fn(), on: jest.fn() };
    inicializar(io);
    const [[autenticarSocket]] = io.use.mock.calls;

    const [porHeader, porCookie] = await Promise.all([
      request(app).get('/api/v1/auth/perfil').set('Authorization', `Bearer ${challengeToken}`),
      request(app).get('/api/v1/auth/perfil').set('Cookie', `${ACCESS_COOKIE}=${challengeToken}`),
    ]);
    expect([porHeader.status, porCookie.status]).toEqual([401, 401]);

    const intentosSocket = [
      { handshake: { auth: { token: challengeToken } }, request: { headers: {} } },
      { handshake: {}, request: { headers: { cookie: `${ACCESS_COOKIE}=${challengeToken}` } } },
    ];
    for (const socket of intentosSocket) {
      const next = jest.fn();
      await autenticarSocket(socket, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(socket.user).toBeUndefined();
    }

    const verificationCode = await generate({ secret: setup.body.secret });
    const verified = await request(app)
      .post('/api/v1/auth/mfa/verify')
      .send({ challengeToken, code: verificationCode });
    expect(verified.status).toBe(200);
    expect(verified.body.usuario.mfaEnabled).toBe(true);
    expect(verified.body.accessToken).toBeTruthy();

    const perfil = await request(app).get('/api/v1/auth/perfil')
      .set('Authorization', `Bearer ${verified.body.accessToken}`);
    expect(perfil.status).toBe(200);

    const socket = { handshake: {}, request: { headers: { cookie: `${ACCESS_COOKIE}=${verified.body.accessToken}` } } };
    const next = jest.fn();
    await autenticarSocket(socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(String(socket.user._id)).toBe(verified.body.usuario.id);
  });

  test('rechaza un desafío incompleto sin producir error interno', async () => {
    const response = await request(app).post('/api/v1/auth/mfa/verify').send({});
    expect(response.status).toBe(400);
  });
});
