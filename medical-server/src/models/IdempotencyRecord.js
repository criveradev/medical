const mongoose = require('mongoose');

const idempotencyRecordSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  requestHash: { type: String, required: true },
  state: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  statusCode: { type: Number },
  responseBody: { type: mongoose.Schema.Types.Mixed },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, { timestamps: true, collection: 'idempotency_records' });

idempotencyRecordSchema.index(
  { actorId: 1, key: 1, method: 1, path: 1 },
  { unique: true, name: 'idempotency_request_unique' }
);
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
