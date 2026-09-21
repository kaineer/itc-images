'use strict';

const { dtoError, requireUser } = require('../lib/http');

async function tracksRoutes(fastify) {
  const { store } = fastify;

  fastify.get('/tracks', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return store.listTracks();
  });

  fastify.post('/tracks', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return reply.code(201).send(store.createTrack((request.body || {}).name));
  });

  fastify.put('/tracks/around-point', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const body = request.body || {};
    if (!body.position) {
      return reply.code(400).send(dtoError(400, 'position', 'position is required'));
    }
    return store.pointsAround(body.position, body.distance);
  });

  fastify.get('/tracks/:trackId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const track = store.getTrack(request.params.trackId);
    if (!track) {
      return reply.code(404).send(dtoError(404, 'track', 'Track not found'));
    }
    return track;
  });

  fastify.delete('/tracks/:trackId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    if (!store.deleteTrack(request.params.trackId)) {
      return reply.code(404).send(dtoError(404, 'track', 'Track not found'));
    }
    return reply.code(204).send();
  });

  fastify.post('/tracks/:trackId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const created = store.addPoint(request.params.trackId, request.body || {});
    if (!created) {
      return reply.code(404).send(dtoError(404, 'track', 'Track not found'));
    }
    return reply.code(201).send(created);
  });

  fastify.put('/tracks/:trackId/:pointId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const result = store.updatePoint(
      request.params.trackId,
      request.params.pointId,
      request.body || {}
    );
    if (!result.track || !result.point) {
      return reply.code(404).send(dtoError(404, 'point', 'Point not found'));
    }
    return reply.code(200).send();
  });

  fastify.delete('/tracks/:trackId/:pointId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const result = store.deletePoint(request.params.trackId, request.params.pointId);
    if (!result.track || !result.point) {
      return reply.code(404).send(dtoError(404, 'point', 'Point not found'));
    }
    return reply.code(204).send();
  });
}

module.exports = tracksRoutes;
