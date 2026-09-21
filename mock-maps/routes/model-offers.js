'use strict';

const { dtoError, requireUser } = require('../lib/http');

async function modelOffersRoutes(fastify) {
  const { store } = fastify;

  fastify.get('/model-offers', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return store.listOffers();
  });

  fastify.post('/model-offers', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const body = request.body || {};
    if (!body.address || !body.description) {
      return reply.code(400).send(dtoError(400, 'model-offer', 'address and description are required'));
    }
    if (body.modelId && !store.pendingUploads[body.modelId] && !store.getModel(body.modelId)) {
      return reply.code(400).send(dtoError(400, 'file', 'Uploaded file not found for modelId'));
    }
    store.addOffer({ ...body, author: body.author || request.user.login });
    return true;
  });

  fastify.post('/model-offers/approve', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const modelId = (request.body || {}).modelId;
    if (!modelId) {
      return reply.code(400).send(dtoError(400, 'model-offer', 'modelId is required'));
    }
    const offer = store.approveOffer(modelId);
    if (!offer) {
      return reply.code(400).send(dtoError(400, 'model-offer', 'Offer not found'));
    }
    return true;
  });

  fastify.post('/model-offers/upload', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const file = await request.file().catch(() => null);
    if (!file) {
      const body = request.body || {};
      if (body.address && body.description) {
        store.addOffer({ ...body, author: body.author || request.user.login });
        return true;
      }
      return reply.code(400).send(dtoError(400, 'format', 'File is required'));
    }
    const buffer = await file.toBuffer();
    return { modelId: store.uploadOffer(buffer) };
  });
}

module.exports = modelOffersRoutes;
