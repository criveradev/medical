const mongoose = require('mongoose');
const distributedLock = require('../src/services/distributed-lock.service');

describe('Distributed lock', () => {
  test('solo una instancia adquiere un lease concurrente', async () => {
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => distributedLock.acquire('recordatorios', 60_000))
    );

    const acquiredLocks = attempts.filter(Boolean);
    expect(acquiredLocks).toHaveLength(1);

    await acquiredLocks[0].release();
    const nextLock = await distributedLock.acquire('recordatorios', 60_000);

    expect(nextLock).not.toBeNull();
    await nextLock.release();
  });

  test('recupera un lease expirado tras la caída de otra instancia', async () => {
    await mongoose.connection.collection('distributed_locks').insertOne({
      _id: 'recordatorios-expirado',
      owner: 'instancia-anterior',
      expiresAt: new Date(Date.now() - 1_000)
    });

    const lock = await distributedLock.acquire('recordatorios-expirado', 60_000);

    expect(lock).not.toBeNull();
    await lock.release();
  });
});
