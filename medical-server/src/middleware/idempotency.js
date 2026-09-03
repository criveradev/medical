const crypto = require('crypto');
const IdempotencyRecord = require('../models/IdempotencyRecord');
const logger = require('../config/logger');

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const PENDING_TIMEOUT_MS = 2 * 60 * 1000;

const hashRequest = (req, includeBody) => crypto.createHash('sha256')
  .update(JSON.stringify({ body: includeBody ? req.body : null, method: req.method, path: req.baseUrl + req.path }))
  .digest('hex');

const replayOrConflict = (record, requestHash, res) => {
  if (!record) {
    res.status(409).json({ mensaje: 'La petición está siendo procesada' });
    return true;
  }
  if (record.requestHash !== requestHash) {
    res.status(422).json({ mensaje: 'La clave de idempotencia ya fue usada con otra petición' });
    return true;
  }
  if (record.state === 'completed') {
    res.set('Idempotency-Replayed', 'true');
    res.status(record.statusCode).json(record.responseBody);
    return true;
  }
  res.status(409).json({ mensaje: 'Ya existe una petición con esta clave en procesamiento' });
  return true;
};

const idempotency = ({ includeBody = true } = {}) => async (req, res, next) => {
  const key = req.get('Idempotency-Key');
  if (!key) return next();
  if (!KEY_PATTERN.test(key)) {
    return res.status(400).json({ mensaje: 'Idempotency-Key debe tener entre 8 y 128 caracteres seguros' });
  }

  const identity = {
    actorId: req.user._id,
    key,
    method: req.method,
    path: req.baseUrl + req.path,
  };
  const requestHash = hashRequest(req, includeBody);

  try {
    let existing = await IdempotencyRecord.findOne(identity);
    if (existing && existing.expiresAt <= new Date()) {
      await IdempotencyRecord.deleteOne({ _id: existing._id });
      existing = null;
    }
    if (existing && existing.state === 'pending'
      && Date.now() - existing.updatedAt.getTime() >= PENDING_TIMEOUT_MS) {
      await IdempotencyRecord.deleteOne({ _id: existing._id, state: 'pending' });
      existing = null;
    }
    if (existing) return replayOrConflict(existing, requestHash, res);

    let record;
    try {
      record = await IdempotencyRecord.create({ ...identity, requestHash });
    } catch (error) {
      if (error.code !== 11000) throw error;
      existing = await IdempotencyRecord.findOne(identity);
      return replayOrConflict(existing, requestHash, res);
    }

    let responseBody;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    res.once('finish', () => {
      const operation = res.statusCode >= 500
        ? IdempotencyRecord.deleteOne({ _id: record._id })
        : IdempotencyRecord.updateOne(
          { _id: record._id },
          { $set: { state: 'completed', statusCode: res.statusCode, responseBody } }
        );
      operation.catch((error) => logger.error('No se pudo finalizar la clave de idempotencia', {
        requestId: req.requestId,
        error: error.message,
      }));
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = idempotency;
