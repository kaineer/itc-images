'use strict';

const { dtoError, requireUser } = require('../lib/http');

async function buildingsRoutes(fastify) {
  const { store } = fastify;

  fastify.get('/buildings/start', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return store.start;
  });

  fastify.put('/buildings', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const body = request.body || {};
    if (!body.position || body.position.x == null || body.position.z == null) {
      return reply.code(406).send(dtoError(406, 'position', 'position.x and position.z are required'));
    }
    return store.buildingsAround(body.position, body.distance);
  });

  fastify.put('/buildings/address', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const address = (request.body || {}).address;
    const building = store.buildingByAddress(address);
    if (!building) {
      return reply.code(404).send(dtoError(404, 'building', 'Building not found'));
    }
    return store.buildingAddressResponse(building);
  });

  fastify.patch('/buildings/:buildingId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const building = store.buildingById(request.params.buildingId);
    if (!building) {
      return reply.code(404).send(dtoError(404, 'building', 'Building not found'));
    }
    return store.updateBuilding(building, request.body || {});
  });
}

module.exports = buildingsRoutes;
