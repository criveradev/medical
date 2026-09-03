const crypto = require('crypto');
const AuditEvent = require('../models/AuditEvent');
const logger = require('../config/logger');

const AUDITED_RESOURCES = new Set([
  'auditoria', 'auth', 'citas', 'departamentos', 'doctores', 'especialidades',
  'historial', 'pacientes', 'pagos', 'reportes', 'resultados',
]);

const actionFor = (method, resource, path) => {
  if (resource === 'auth' && path.endsWith('/login')) return 'login';
  if (resource === 'auth' && path.endsWith('/logout')) return 'logout';
  return ({ GET: 'read', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' })[method]
    || 'execute';
};

const hashIp = (ip) => {
  if (!ip || !process.env.AUDIT_LOG_SECRET) return null;
  return crypto.createHmac('sha256', process.env.AUDIT_LOG_SECRET).update(ip).digest('hex');
};

const audit = (req, res, next) => {
  const segments = req.path.split('/').filter(Boolean);
  const resource = segments[0] || 'api';
  if (!AUDITED_RESOURCES.has(resource)) return next();

  res.once('finish', () => {
    const statusCode = res.statusCode;
    const actorId = req.user?._id || req.auditActorId || null;
    const actorRole = req.role?.nombre || req.auditActorRole || null;
    const resourceId = segments.find((segment) => /^[a-f\d]{24}$/i.test(segment)) || null;

    AuditEvent.create({
      actorId,
      actorRole,
      action: actionFor(req.method, resource, req.path),
      resource,
      resourceId,
      method: req.method,
      path: req.path,
      statusCode,
      outcome: statusCode < 400 ? 'success' : statusCode < 500 ? 'denied' : 'failure',
      requestId: req.requestId,
      ipHash: hashIp(req.ip),
    }).catch((error) => logger.error('No se pudo registrar el evento de auditoría', {
      requestId: req.requestId,
      error: error.message,
    }));
  });

  next();
};

module.exports = audit;
