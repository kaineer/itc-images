'use strict';

const { dtoError, requireUser } = require('../lib/http');

async function sendModel(reply, store, modelId) {
  const model = store.getModel(modelId);
  if (!model) {
    return reply.code(404).send(dtoError(404, 'model', 'Model not found'));
  }
  return reply
    .header('Content-Disposition', `attachment; filename="${modelId}.bin"`)
    .type('application/octet-stream')
    .send(model.buffer);
}

async function modelsRoutes(fastify) {
  const { store } = fastify;

  fastify.put('/models/address', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const model = store.modelByAddress((request.body || {}).address);
    if (!model) {
      return reply.code(404).send(dtoError(404, 'metadata', 'Model metadata not found'));
    }
    return {
      modelId: model.id,
      address: model.address,
      position: model.position,
      rotation: model.rotationY || 0,
      scale: model.scale
    };
  });

  fastify.get('/model/:modelId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return sendModel(reply, store, request.params.modelId);
  });

  fastify.get('/models/model/:modelId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return sendModel(reply, store, request.params.modelId);
  });

  fastify.get('/models/:modelId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return sendModel(reply, store, request.params.modelId);
  });

  fastify.put('/models/:modelId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    return store.putModel(request.params.modelId, request.body || {});
  });

  fastify.patch('/models/:modelId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    const updated = store.patchModel(request.params.modelId, request.body || {});
    if (!updated) {
      return reply.code(404).send(dtoError(404, 'model', 'Model not found'));
    }
    return reply.code(200).send();
  });

  fastify.delete('/models/:modelId', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;
    if (!store.deleteModel(request.params.modelId)) {
      return reply.code(404).send(dtoError(404, 'model', 'Model not found'));
    }
    return true;
  });

  fastify.post('/upload', async (request, reply) => {
    if (!requireUser(request, reply, store)) return;

    let buffer = null;
    let polygons;
    let address;

    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        // OpenAPI: "File"; фронт maps.ai шлёт "file"
        if (part.fieldname === 'File' || part.fieldname === 'file') {
          buffer = await part.toBuffer();
        } else if (!buffer) {
          buffer = await part.toBuffer();
        }
        continue;
      }

      if (part.fieldname === 'address') {
        address = String(part.value || '').trim() || undefined;
      } else if (part.fieldname === 'polygons') {
        const raw = String(part.value || '').trim();
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          polygons = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          polygons = raw
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
        }
      }
    }

    if (!buffer || buffer.length === 0) {
      return reply.code(413).send(dtoError(413, 'upload', 'File is required'));
    }

    const modelId = store.uploadModel(buffer, { polygons, address });
    if (!modelId) {
      return reply.code(404).send(dtoError(404, 'upload', 'Building not found for address/polygons'));
    }
    return { model: modelId };
  });
}

module.exports = modelsRoutes;
