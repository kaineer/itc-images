'use strict';

const { ok, optionalUser } = require('../lib/http');

async function gatewayRoutes(fastify) {
  const { store } = fastify;

  fastify.get('/', async (request) => {
    const user = optionalUser(request, store);
    return store.userOut(user);
  });

  fastify.get('/credentials', async (request) => {
    const user = optionalUser(request, store);
    return {
      userId: user && user.id,
      userName: user && user.userName,
      roles: user ? user.roles : [],
      organizationsId: user ? user.organizationsId : []
    };
  });

  fastify.get('/api/v1/errors-code', async () => ok(store.errorCodes));

  fastify.get('/health', async () => ({
    status: 'ok',
    app: 'game-mock',
    env: 'mock'
  }));
}

module.exports = gatewayRoutes;
