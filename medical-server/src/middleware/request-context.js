const crypto = require('crypto');

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

module.exports = (req, res, next) => {
  const supplied = req.get('X-Request-ID');
  req.requestId = supplied && REQUEST_ID_PATTERN.test(supplied)
    ? supplied
    : crypto.randomUUID();
  res.set('X-Request-ID', req.requestId);
  next();
};
