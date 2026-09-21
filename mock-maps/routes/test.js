'use strict';

async function testRoutes(fastify) {
  fastify.get('/test', async () => ({ status: 'ok', service: 'mock-maps' }));
  fastify.get('/test/health', async () => ({ status: 'healthy' }));
}

module.exports = testRoutes;
