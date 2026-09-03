const mongoose = require('mongoose');

const retentionDays = Math.max(30, Number.parseInt(process.env.AUDIT_RETENTION_DAYS, 10) || 365);

const auditEventSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorRole: { type: String, default: null },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: String, default: null },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  outcome: { type: String, enum: ['success', 'denied', 'failure'], required: true },
  requestId: { type: String, required: true, index: true },
  ipHash: { type: String, default: null },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'audit_events',
});

auditEventSchema.index({ createdAt: -1 });
auditEventSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
auditEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
