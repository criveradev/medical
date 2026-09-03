const crypto = require('crypto');
const { generateSecret, generateURI, verify } = require('otplib');

const encryptionKey = () => {
  const configured = process.env.MFA_ENCRYPTION_KEY;
  if (!configured || configured.length < 32) {
    const error = new Error('MFA_ENCRYPTION_KEY no está configurada de forma segura');
    error.status = 500;
    throw error;
  }
  return crypto.createHash('sha256').update(configured).digest();
};

const encryptSecret = (secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
};

const decryptSecret = (payload) => {
  const [version, iv, tag, encrypted] = (payload || '').split(':');
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Secreto MFA inválido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};

const createEnrollment = (email) => {
  const secret = generateSecret();
  return {
    secret,
    uri: generateURI({ issuer: 'Medical', label: email, secret }),
    encryptedSecret: encryptSecret(secret),
  };
};

const verifyTotp = async (encryptedSecret, token) => {
  if (!/^\d{6}$/.test(token || '')) return false;
  const result = await verify({ secret: decryptSecret(encryptedSecret), token });
  return result.valid;
};

const hashRecoveryCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

const createRecoveryCodes = (count = 10) => Array.from({ length: count }, () => {
  const raw = crypto.randomBytes(10).toString('hex').toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
});

module.exports = {
  createEnrollment,
  createRecoveryCodes,
  hashRecoveryCode,
  verifyTotp,
};
