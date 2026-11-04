// ═══════════════════════════════════════════════════════════════
// tests/setup.js — Configuración global de Jest
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-with-at-least-32-characters';
process.env.MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || 'test-mfa-encryption-key-with-at-least-32-characters';

// Usar base de datos de TEST separada — nunca la de producción
const MONGO_TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/medical_test';
const databaseName = new URL(MONGO_TEST_URI).pathname.replace(/^\//, '');

if (!databaseName.includes('test')) {
    throw new Error('MONGO_TEST_URI debe apuntar a una base de datos exclusiva de pruebas');
}

beforeAll(async () => {
    // Desconectar cualquier conexión existente
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(MONGO_TEST_URI);
    await mongoose.connection.dropDatabase();
    await mongoose.syncIndexes();
});

afterEach(async () => {
    // Limpiar todas las colecciones después de cada test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});
