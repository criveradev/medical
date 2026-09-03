const crypto = require('crypto');
const mongoose = require('mongoose');

const COLLECTION = 'distributed_locks';

/**
 * Adquiere un lease en MongoDB. Un índice único sobre `_id` garantiza que solo
 * una instancia ejecute el trabajo, incluso durante despliegues con solapamiento.
 *
 * @param {string} name Nombre estable del trabajo.
 * @param {number} ttlMs Duración máxima del lease.
 * @returns {Promise<{release: () => Promise<void>}|null>}
 */
const acquire = async (name, ttlMs) => {
  const owner = `${process.pid}:${crypto.randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const collection = mongoose.connection.collection(COLLECTION);

  try {
    const lock = await collection.findOneAndUpdate(
      {
        _id: name,
        $or: [
          { expiresAt: { $lte: now } },
          { expiresAt: { $exists: false } }
        ]
      },
      { $set: { owner, acquiredAt: now, expiresAt } },
      { upsert: true, returnDocument: 'after' }
    );

    if (!lock || lock.owner !== owner) return null;

    return {
      release: async () => {
        await collection.deleteOne({ _id: name, owner });
      }
    };
  } catch (error) {
    // Dos procesos pueden intentar el upsert a la vez. El índice de `_id`
    // convierte al perdedor en E11000, que equivale a "lock no adquirido".
    if (error.code === 11000) return null;
    throw error;
  }
};

module.exports = { acquire };
