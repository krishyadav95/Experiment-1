const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'fitnessify_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const DEV_FALLBACK_SECRET = 'fitnessify-dev-secret-change-me';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required when NODE_ENV=production.');
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  return secret || DEV_FALLBACK_SECRET;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function createPasswordHash(password) {
  return bcrypt.hashSync(password, 12);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function signSession(userId) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
}

function readSessionToken(req) {
  return req.cookies?.[COOKIE_NAME] || null;
}

function verifySession(token) {
  if (!token) return null;

  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  const secure =
    process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: SESSION_DURATION_MS,
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    path: '/'
  });
}

module.exports = {
  COOKIE_NAME,
  normalizeEmail,
  createPasswordHash,
  verifyPassword,
  signSession,
  readSessionToken,
  verifySession,
  setSessionCookie,
  clearSessionCookie
};
