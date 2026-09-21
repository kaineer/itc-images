'use strict';

const crypto = require('crypto');

const SECRET = process.env.MAPS_MOCK_JWT_SECRET || 'maps-mock-dev-secret';
const ACCESS_TTL_SEC = Number(process.env.MAPS_MOCK_ACCESS_TTL_SEC) || 24 * 60 * 60;

function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64url');
}

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

function encodeJwt(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned)}`;
}

function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return encodeJwt({
    sub: user.id,
    unique_name: user.login,
    role: user.roleName,
    iat: now,
    exp: now + ACCESS_TTL_SEC
  });
}

function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const unsigned = `${header}.${body}`;
  const expected = sign(unsigned);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null;
  return payload;
}

module.exports = {
  ACCESS_TTL_SEC,
  createAccessToken,
  decodeJwt,
  verifyJwt
};
