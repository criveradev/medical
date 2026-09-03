const crypto = require('crypto');

const ACCESS_COOKIE = 'medical_access';
const REFRESH_COOKIE = 'medical_refresh';
const CSRF_COOKIE = 'medical_csrf';

const parseCookies = (header = '') => header.split(';').reduce((cookies, item) => {
  const separator = item.indexOf('=');
  if (separator === -1) return cookies;
  const name = item.slice(0, separator).trim();
  const value = item.slice(separator + 1).trim();
  if (!name) return cookies;
  try {
    cookies[name] = decodeURIComponent(value);
  } catch {
    cookies[name] = value;
  }
  return cookies;
}, {});

const cookieBaseOptions = () => ({
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
});

const accessCookieMaxAge = () => {
  const match = /^(\d+)(s|m|h|d)$/.exec(process.env.JWT_EXPIRES || '8h');
  if (!match) return 8 * 60 * 60 * 1000;
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2]];
};

const issueCsrfToken = (res) => {
  const token = crypto.randomBytes(32).toString('base64url');
  res.cookie(CSRF_COOKIE, token, {
    ...cookieBaseOptions(),
    httpOnly: false,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...cookieBaseOptions(),
    httpOnly: true,
    path: '/',
    maxAge: accessCookieMaxAge(),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieBaseOptions(),
    httpOnly: true,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  const base = cookieBaseOptions();
  res.clearCookie(ACCESS_COOKIE, { ...base, httpOnly: true, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...base, httpOnly: true, path: '/api/v1/auth' });
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false, path: '/' });
};

const safeEqual = (left, right) => {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path === '/auth/login') return next();

  const cookies = parseCookies(req.headers.cookie);
  const usesCookieSession = Boolean(cookies[ACCESS_COOKIE] || cookies[REFRESH_COOKIE]);
  const usesBearer = req.headers.authorization?.startsWith('Bearer ');
  if (!usesCookieSession || usesBearer) return next();

  if (!safeEqual(cookies[CSRF_COOKIE], req.get('X-CSRF-Token'))) {
    return res.status(403).json({ mensaje: 'Token CSRF inválido o ausente' });
  }
  return next();
};

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  csrfProtection,
  issueCsrfToken,
  parseCookies,
  setAuthCookies,
};
