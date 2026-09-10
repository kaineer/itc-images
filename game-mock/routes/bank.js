'use strict';

const { ok, fail, optionalUser } = require('../lib/http');

async function bankRoutes(fastify) {
  const { store } = fastify;

  fastify.post('/api/v1/service/service', async (request, reply) => {
    const { playerId, rewards } = request.body || {};
    if (!playerId) return fail(reply, 400, 'playerId is required');
    const upd = {};
    for (const reward of rewards || []) {
      upd[String(reward.currencyId)] = Number(reward.value || 0);
    }
    const balance = store.addBalance(playerId, upd, 'service');
    const xp = store.ensurePlayerExperience(playerId);
    for (const reward of rewards || []) {
      const exp = store.experienceNodes.find((n) => n.currencyId === Number(reward.currencyId));
      if (exp) xp[exp.experienceId] = Number(xp[exp.experienceId] || 0) + Number(reward.value || 0);
    }
    return ok({ balanceList: balance });
  });

  fastify.post('/api/v1/experience/tree', async (request, reply) => {
    const { userId, experienceNodeId } = request.body || {};
    const tree = store.experienceTree(userId, experienceNodeId);
    if (!tree) return fail(reply, 404, 'Experience node not found');
    return ok(tree);
  });

  fastify.post('/api/v1/experience/tree/total', async (request, reply) => {
    const { userId, experienceNodeId } = request.body || {};
    const tree = store.experienceTree(userId, experienceNodeId);
    if (!tree) return fail(reply, 404, 'Experience node not found');
    const node = store.experienceNodes.find((n) => n.experienceId === experienceNodeId);
    return ok({
      experienceId: node.experienceId,
      experienceName: node.experienceName,
      experienceDescription: node.experienceDescription,
      value: store.sumTree(tree)
    });
  });

  fastify.get('/api/v1/balance', async (request) => {
    const user = optionalUser(request, store);
    return ok({ balanceList: store.ensurePlayerBalance(user.id) });
  });

  fastify.get('/api/v1/balance/:playerId', async (request) => {
    return ok({ balanceList: store.ensurePlayerBalance(request.params.playerId) });
  });

  fastify.post('/api/v1/balance/:playerId', async (request) => {
    const { source, updBalance } = request.body || {};
    const balance = store.addBalance(request.params.playerId, updBalance, source);
    return ok({ balanceList: balance });
  });

  fastify.post('/api/v1/balance/transaction', async (request) => {
    const user = optionalUser(request, store);
    const { begin, end } = request.body || {};
    const items = store.transactions.filter((tx) => {
      if (tx.playerId !== user.id) return false;
      if (begin != null && tx.seq < Number(begin)) return false;
      if (end != null && tx.seq > Number(end)) return false;
      return true;
    });
    return ok(
      items.map(({ seq, timestamp, currencyId, value, source }) => ({
        seq,
        timestamp,
        currencyId,
        value,
        source
      }))
    );
  });

  fastify.get('/api/v1/experience/unallocated', async (request) => {
    const user = optionalUser(request, store);
    const xp = store.ensurePlayerExperience(user.id);
    const allocated = Object.values(xp).reduce((acc, value) => acc + Number(value || 0), 0);
    const total = Number(store.ensurePlayerBalance(user.id)['2'] || 0);
    return ok(Math.max(0, total - allocated));
  });

  fastify.get('/api/v1/experience/unallocated/:playerId', async (request) => {
    const xp = store.ensurePlayerExperience(request.params.playerId);
    const allocated = Object.values(xp).reduce((acc, value) => acc + Number(value || 0), 0);
    const total = Number(store.ensurePlayerBalance(request.params.playerId)['2'] || 0);
    return ok(Math.max(0, total - allocated));
  });

  fastify.get('/api/v1/experience/tree/total/:experienceNodeId', async (request, reply) => {
    const user = optionalUser(request, store);
    const tree = store.experienceTree(user.id, request.params.experienceNodeId);
    if (!tree) return fail(reply, 404, 'Experience node not found');
    const node = store.experienceNodes.find(
      (n) => n.experienceId === request.params.experienceNodeId
    );
    return ok({
      experienceId: node.experienceId,
      experienceName: node.experienceName,
      experienceDescription: node.experienceDescription,
      value: store.sumTree(tree)
    });
  });

  fastify.get('/api/v1/experience/tree/:rootExperienceNodeId', async (request, reply) => {
    const user = optionalUser(request, store);
    const tree = store.experienceTree(user.id, request.params.rootExperienceNodeId);
    if (!tree) return fail(reply, 404, 'Experience node not found');
    return ok(tree);
  });
}

module.exports = bankRoutes;
