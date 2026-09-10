'use strict';

function ok(data = null, message = 'OK') {
  return { status: 200, message, data };
}

function fail(reply, code, message) {
  return reply.code(code).send({ status: code, message, data: null });
}

function bearerToken(request) {
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function requireUser(request, reply, store) {
  const token = bearerToken(request);
  if (!token) {
    fail(reply, 401, 'Missing or invalid authorization header');
    return null;
  }
  const user = store.getUserByToken(token);
  if (!user) {
    fail(reply, 401, 'Invalid or expired token');
    return null;
  }
  return user;
}

function optionalUser(request, store) {
  const token = bearerToken(request);
  if (!token) return store.defaultUser();
  return store.getUserByToken(token) || store.defaultUser();
}

module.exports = { ok, fail, bearerToken, requireUser, optionalUser };
