'use strict';

const { dtoError } = require('../lib/http');

async function streetsRoutes(fastify) {
  const { store } = fastify;

  fastify.put('/streets', async (request, reply) => {
    const body = request.body || {};
    if (!body.position || body.position.x == null || body.position.z == null) {
      return reply.code(406).send(dtoError(406, 'position', 'position.x and position.z are required'));
    }
    return store.streetsAround(body.position, body.distance);
  });
}

module.exports = streetsRoutes;
