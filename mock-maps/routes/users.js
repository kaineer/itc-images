'use strict';

const { createAccessToken } = require('../lib/jwt');
const { problem, requireUser, requireAdmin, roleIndex } = require('../lib/http');

function isRoleChange(user, body) {
  return body.role != null && roleIndex(body.role) !== user.role;
}

async function usersRoutes(fastify) {
  const { store } = fastify;

  fastify.post('/users/login', async (request, reply) => {
    const { login, password } = request.body || {};
    const user = store.getUserByLogin(login);
    if (!user || user.password !== password) {
      return reply.code(401).send(problem(401, 'Unauthorized', 'Invalid login or password'));
    }
    return {
      success: true,
      accessToken: createAccessToken(user)
    };
  });

  fastify.post('/users/logout', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return { success: true };
  });

  fastify.get('/users/profile', async (request, reply) => {
    const user = requireUser(request, reply, store);
    if (!user) return;
    return store.userOut(user);
  });

  fastify.put('/users/profile', async (request, reply) => {
    const user = requireUser(request, reply, store);
    if (!user) return;
    const body = request.body || {};
    if (isRoleChange(user, body)) {
      return reply.code(403).send(problem(403, 'Forbidden', 'Cannot change your own role'));
    }
    store.updateUser(user, body);
    return store.userOut(user);
  });

  fastify.get('/users', async (request, reply) => {
    if (!requireAdmin(request, reply, store)) return;
    return store.users.map((u) => store.userOut(u));
  });

  fastify.post('/users', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const body = request.body || {};
    if (!body.login) {
      return reply.code(400).send(problem(400, 'Bad Request', 'login is required'));
    }
    if (store.getUserByLogin(body.login)) {
      return reply.code(400).send(problem(400, 'Bad Request', 'login already exists'));
    }
    const user = store.createUser(body);
    return reply.code(201).send(store.userOut(user));
  });

  fastify.get('/users/:userId', async (request, reply) => {
    if (!requireAdmin(request, reply, store)) return;
    const user = store.getUserById(request.params.userId);
    if (!user) return reply.code(404).send(problem(404, 'Not Found', 'User not found'));
    return store.userOut(user);
  });

  fastify.put('/users/:userId', async (request, reply) => {
    const current = requireAdmin(request, reply, store);
    if (!current) return;
    const user = store.getUserById(request.params.userId);
    if (!user) return reply.code(404).send(problem(404, 'Not Found', 'User not found'));
    const body = request.body || {};
    if (user.id === current.id && isRoleChange(user, body)) {
      return reply.code(403).send(problem(403, 'Forbidden', 'Cannot change your own role'));
    }
    store.updateUser(user, body);
    return store.userOut(user);
  });

  fastify.delete('/users/:userId', async (request, reply) => {
    const current = requireAdmin(request, reply, store);
    if (!current) return;
    if (request.params.userId === current.id) {
      return reply.code(403).send(problem(403, 'Forbidden', 'Cannot delete your own account'));
    }
    if (!store.deleteUser(request.params.userId)) {
      return reply.code(404).send(problem(404, 'Not Found', 'User not found'));
    }
    return reply.code(204).send();
  });
}

module.exports = usersRoutes;
