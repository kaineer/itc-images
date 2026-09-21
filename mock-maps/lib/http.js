'use strict';

const { verifyJwt } = require('./jwt');

const ROLE_NAMES = ['User', 'Creator', 'Admin', 'Uploader'];

function roleName(role) {
  if (typeof role === 'string' && ROLE_NAMES.includes(role)) return role;
  if (typeof role === 'number' && ROLE_NAMES[role]) return ROLE_NAMES[role];
  return ROLE_NAMES[0];
}

function roleIndex(role) {
  if (typeof role === 'number') return role;
  const idx = ROLE_NAMES.indexOf(role);
  return idx >= 0 ? idx : 0;
}

function dtoError(code, object, message) {
  return { code, object, message };
}

function problem(status, title, detail) {
  return {
    type: 'about:blank',
    title,
    status,
    detail
  };
}

function bearerToken(request) {
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function requireUser(request, reply, store) {
  const token = bearerToken(request);
  if (!token) {
    reply.code(401).send(dtoError(401, 'auth', 'Missing or invalid authorization header'));
    return null;
  }
  const payload = verifyJwt(token);
  if (!payload) {
    reply.code(401).send(dtoError(401, 'auth', 'Invalid or expired token'));
    return null;
  }
  const user = store.getUserByLogin(payload.unique_name) || store.getUserById(payload.sub);
  if (!user) {
    reply.code(401).send(dtoError(401, 'auth', 'Unknown user'));
    return null;
  }
  request.user = user;
  return user;
}

function requireAdmin(request, reply, store) {
  const user = requireUser(request, reply, store);
  if (!user) return null;
  if (user.roleName !== 'Admin') {
    reply.code(403).send(dtoError(403, 'role', 'Admin role required'));
    return null;
  }
  return user;
}

module.exports = {
  ROLE_NAMES,
  roleName,
  roleIndex,
  dtoError,
  problem,
  bearerToken,
  requireUser,
  requireAdmin
};
