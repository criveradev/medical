const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { version } = require('../package.json');

describe('Health checks', () => {
  test('GET /health conserva el endpoint compatible e informa la versión', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', version });
  });

  test('GET /health/live responde mientras el proceso está vivo', async () => {
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', version });
  });

  test('GET /health/ready comprueba la conexión de MongoDB', async () => {
    expect(mongoose.connection.readyState).toBe(1);

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ready',
      version,
      dependencies: { mongodb: 'up' }
    });
  });
});
