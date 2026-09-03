const AuditEvent = require('../models/AuditEvent');

exports.listar = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const filter = {};

    if (req.query.actorId) filter.actorId = req.query.actorId;
    if (req.query.resource) filter.resource = req.query.resource;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.outcome) filter.outcome = req.query.outcome;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [total, events] = await Promise.all([
      AuditEvent.countDocuments(filter),
      AuditEvent.find(filter)
        .select('actorId actorRole action resource resourceId method path statusCode outcome requestId createdAt')
        .populate('actorId', 'nombre apellido email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({ total, pagina: page, totalPaginas: Math.ceil(total / limit), eventos: events });
  } catch (error) {
    next(error);
  }
};
