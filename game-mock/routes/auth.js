'use strict';

const { ok, fail, requireUser } = require('../lib/http');

async function authRoutes(fastify) {
  const { store } = fastify;

  fastify.get('/universal/manual', async () => ok({ updated: true }, 'Ok'));

  fastify.put('/universal/update', async (request) => {
    const body = request.body || {};
    return ok(
      {
        rootNodeId: body.rootNodeId,
        name: body.name,
        operation: body.operation || 'update'
      },
      'Ok'
    );
  });

  fastify.get('/user', async (request, reply) => {
    const user = requireUser(request, reply, store);
    if (!user) return;
    return ok(store.userOut(user), 'Ok');
  });

  fastify.post('/user', async (request, reply) => {
    const body = request.body || {};
    if (!body.userName || !body.email || !body.password) {
      return fail(reply, 400, 'userName, email and password are required');
    }
    const user = store.defaults.hydrateUser(body, {
      defaultOrgId: store.organizations[0] && store.organizations[0].id
    });
    store.users.push(user);
    return ok(store.userOut(user), 'Ok');
  });

  fastify.get('/user/all', async (request) => {
    const { page = 0, size = 20, prefix } = request.query || {};
    let items = store.users.map((u) => store.userOut(u));
    if (prefix) {
      const p = String(prefix).toLowerCase();
      items = items.filter(
        (u) =>
          u.userName.toLowerCase().includes(p) || u.email.toLowerCase().includes(p)
      );
    }
    return ok(store.usersPage(items, page, size), 'Ok');
  });

  fastify.get('/user/authors', async () => {
    const authors = store.users
      .filter((u) => u.roles.includes('METHODIST') || u.roles.includes('GAME_DIZ'))
      .map((u) => store.userPreview(u));
    return ok(authors, 'Ok');
  });

  fastify.get('/user/mentors', async () => {
    const mentors = store.users
      .filter((u) => u.roles.includes('MENTOR'))
      .map((u) => store.userOut(u));
    return ok(mentors, 'Ok');
  });

  fastify.get('/user/roles', async () =>
    ok(['PLAYER', 'METHODIST', 'GAME_DIZ', 'MENTOR', 'ADMINISTRATOR'], 'Ok')
  );

  fastify.put('/user/pwd', async (request, reply) => {
    const user = requireUser(request, reply, store);
    if (!user) return;
    const { oldPwd, newPwd, confirmPwd } = request.body || {};
    if (oldPwd !== user.password) return fail(reply, 400, 'Invalid old password');
    if (!newPwd || newPwd !== confirmPwd) return fail(reply, 400, 'Password confirmation mismatch');
    user.password = newPwd;
    return ok({ updated: true }, 'Ok');
  });

  fastify.put('/user/username', async (request, reply) => {
    const user = requireUser(request, reply, store);
    if (!user) return;
    const { userName } = request.body || {};
    if (!userName) return fail(reply, 400, 'userName is required');
    user.userName = userName;
    return ok(store.userOut(user), 'Ok');
  });

  fastify.get('/user/username/:userId', async (request, reply) => {
    const user = store.findUser(request.params.userId);
    if (!user) return fail(reply, 404, 'User not found');
    return ok({ userName: user.userName }, 'Ok');
  });

  fastify.put('/user/username/:userId', async (request, reply) => {
    const user = store.findUser(request.params.userId);
    if (!user) return fail(reply, 404, 'User not found');
    const { userName } = request.body || {};
    if (!userName) return fail(reply, 400, 'userName is required');
    user.userName = userName;
    return ok(store.userOut(user), 'Ok');
  });

  fastify.put('/user/organization/:userId', async (request, reply) => {
    const user = store.findUser(request.params.userId);
    if (!user) return fail(reply, 404, 'User not found');
    const { organizationId } = request.body || {};
    if (!organizationId) return fail(reply, 400, 'organizationId is required');
    if (!user.organizationsId.includes(organizationId)) {
      user.organizationsId.push(organizationId);
    }
    return ok(store.userOut(user), 'Ok');
  });

  fastify.delete('/user/organization/:userId', async (request, reply) => {
    const user = store.findUser(request.params.userId);
    if (!user) return fail(reply, 404, 'User not found');
    const { organizationId } = request.body || {};
    user.organizationsId = user.organizationsId.filter((id) => id !== organizationId);
    return ok(store.userOut(user), 'Ok');
  });

  fastify.put('/user/role/:userId', async (request, reply) => {
    const user = store.findUser(request.params.userId);
    if (!user) return fail(reply, 404, 'User not found');
    const { role } = request.body || {};
    if (role && !user.roles.includes(role)) user.roles.push(role);
    return ok(store.userOut(user), 'Ok');
  });

  fastify.delete('/user/role/:userId', async (request, reply) => {
    const user = store.findUser(request.params.userId);
    if (!user) return fail(reply, 404, 'User not found');
    const { role } = request.body || {};
    user.roles = user.roles.filter((r) => r !== role);
    return ok(store.userOut(user), 'Ok');
  });

  fastify.get('/user/:userId', async (request, reply) => {
    const user = store.findUser(request.params.userId);
    if (!user) return fail(reply, 404, 'User not found');
    return ok(store.userOut(user), 'Ok');
  });

  fastify.delete('/user/:userId', async (request, reply) => {
    const index = store.users.findIndex((u) => u.id === request.params.userId);
    if (index < 0) return fail(reply, 404, 'User not found');
    const [removed] = store.users.splice(index, 1);
    return ok(store.userOut(removed), 'Ok');
  });

  fastify.post('/client', async (request) => {
    const client = store.defaults.hydrateClient(request.body || {});
    store.clients.push(client);
    return ok(client, 'Ok');
  });

  fastify.get('/client/:clientId', async (request, reply) => {
    const client = store.clients.find((c) => c.clientId === request.params.clientId);
    if (!client) return fail(reply, 404, 'Client not found');
    return ok(client, 'Ok');
  });

  fastify.put('/client/:clientId', async (request, reply) => {
    const client = store.clients.find((c) => c.clientId === request.params.clientId);
    if (!client) return fail(reply, 404, 'Client not found');
    Object.assign(client, request.body || {}, { clientId: client.clientId });
    return ok(client, 'Ok');
  });

  fastify.delete('/client/:clientId', async (request, reply) => {
    const index = store.clients.findIndex((c) => c.clientId === request.params.clientId);
    if (index < 0) return fail(reply, 404, 'Client not found');
    const [removed] = store.clients.splice(index, 1);
    return ok(removed, 'Ok');
  });

  fastify.post('/organization', async (request, reply) => {
    const body = request.body || {};
    if (!body.name || !body.contact) return fail(reply, 400, 'name and contact are required');
    const org = store.defaults.hydrateOrganization(body);
    store.organizations.push(org);
    return ok(org, 'Ok');
  });

  fastify.get('/organization/all', async (request) => {
    const { prefix } = request.query || {};
    let items = store.organizations;
    if (prefix) {
      const p = String(prefix).toLowerCase();
      items = items.filter((o) => o.name.toLowerCase().startsWith(p));
    }
    return ok(items, 'Ok');
  });

  fastify.get('/organization/:id', async (request, reply) => {
    const org = store.findOrg(request.params.id);
    if (!org) return fail(reply, 404, 'Organization not found');
    return ok(org, 'Ok');
  });

  fastify.put('/organization/:id', async (request, reply) => {
    const org = store.findOrg(request.params.id);
    if (!org) return fail(reply, 404, 'Organization not found');
    const { name, contact } = request.body || {};
    if (name != null) org.name = name;
    if (contact != null) org.contact = contact;
    return ok(org, 'Ok');
  });

  fastify.delete('/organization/:id', async (request, reply) => {
    const index = store.organizations.findIndex((o) => o.id === request.params.id);
    if (index < 0) return fail(reply, 404, 'Organization not found');
    const [removed] = store.organizations.splice(index, 1);
    return ok(removed, 'Ok');
  });

  fastify.post('/jwt/login', async (request, reply) => {
    const { login, password } = request.body || {};
    if (!login || !password) return fail(reply, 400, 'login and password are required');
    let user = store.findUserByLogin(login);
    if (!user) {
      user = store.defaults.hydrateUser(
        {
          userName: login,
          email: `${String(login).toLowerCase()}@mock.local`,
          password,
          roles: ['PLAYER']
        },
        { defaultOrgId: store.organizations[0] && store.organizations[0].id }
      );
      store.users.push(user);
    } else if (user.password !== password) {
      return fail(reply, 401, 'Invalid login or password');
    }
    return ok(store.issueTokens(user), 'Ok');
  });

  fastify.post('/jwt/auth', async (request, reply) => {
    const { accessToken } = request.body || {};
    const user = accessToken ? store.getUserByToken(accessToken) : null;
    if (!user) return fail(reply, 401, 'Invalid access token');
    return ok({ valid: true, user: store.userOut(user) }, 'Ok');
  });

  fastify.post('/jwt/refresh', async (request, reply) => {
    const { refreshToken } = request.body || {};
    const tokens = store.refreshAccess(refreshToken);
    if (!tokens) return fail(reply, 401, 'Invalid refresh token');
    return ok(tokens, 'Ok');
  });

  fastify.post('/jwt/token', async (request, reply) => {
    const { refreshToken } = request.body || {};
    const tokens = store.refreshAccess(refreshToken);
    if (!tokens) return fail(reply, 401, 'Invalid refresh token');
    return ok({ type: tokens.type, accessToken: tokens.accessToken }, 'Ok');
  });

  fastify.get('/membership/all', async () => {
    return ok(
      store.memberships.map((m) => ({
        organizationId: m.organizationId,
        nodeIds: m.nodeIds
      })),
      'Ok'
    );
  });

  fastify.get('/membership/organization/:id', async (request) => {
    const row = store.memberships.find((m) => m.organizationId === request.params.id);
    return ok(row ? row.nodeIds : [], 'Ok');
  });

  fastify.put('/membership/organization/:id', async (request, reply) => {
    const { nodeId } = request.body || {};
    if (!nodeId) return fail(reply, 400, 'nodeId is required');
    let row = store.memberships.find((m) => m.organizationId === request.params.id);
    if (!row) {
      row = { organizationId: request.params.id, nodeIds: [] };
      store.memberships.push(row);
    }
    if (!row.nodeIds.includes(nodeId)) row.nodeIds.push(nodeId);
    return ok(row.nodeIds, 'Ok');
  });

  fastify.delete('/membership/organization/:id', async (request, reply) => {
    const { nodeId } = request.body || {};
    const row = store.memberships.find((m) => m.organizationId === request.params.id);
    if (!row) return ok([], 'Ok');
    row.nodeIds = row.nodeIds.filter((id) => id !== nodeId);
    return ok(row.nodeIds, 'Ok');
  });

  fastify.get('/membership/universal/:id', async (request) => {
    return ok(
      store.memberships
        .filter((m) => m.nodeIds.includes(request.params.id))
        .map((m) => m.organizationId),
      'Ok'
    );
  });
}

module.exports = authRoutes;
