'use strict';

const { ok, fail } = require('../lib/http');

function costOut(item) {
  return {
    rewardId: item.rewardId,
    nodeId: item.nodeId,
    currencyId: item.currencyId,
    value: item.value
  };
}

async function rewardRoutes(fastify) {
  const { store } = fastify;

  fastify.get('/currency', async () => ok(store.currencies));

  fastify.post('/currency', async (request, reply) => {
    const body = request.body || {};
    if (!body.currencyName || !body.currencyType) {
      return fail(reply, 400, 'currencyName and currencyType are required');
    }
    const currency = store.defaults.hydrateCurrency(
      { ...body, currencyId: store.nextCurrencyId() },
      0
    );
    store.currencies.push(currency);
    return ok(currency);
  });

  fastify.put('/currency/:currencyId', async (request, reply) => {
    const currency = store.currencies.find(
      (c) => String(c.currencyId) === String(request.params.currencyId)
    );
    if (!currency) return fail(reply, 404, 'Currency not found');
    const body = request.body || {};
    if (body.currencyName != null) currency.currencyName = body.currencyName;
    if (body.currencyType != null) currency.currencyType = body.currencyType;
    return ok(currency);
  });

  fastify.delete('/currency/:currencyId', async (request, reply) => {
    const index = store.currencies.findIndex(
      (c) => String(c.currencyId) === String(request.params.currencyId)
    );
    if (index < 0) return fail(reply, 404, 'Currency not found');
    const [removed] = store.currencies.splice(index, 1);
    return ok(removed);
  });

  fastify.get('/cost/player.progress/:nodeId', async (request) => {
    return ok(store.costs.filter((c) => c.nodeId === request.params.nodeId).map(costOut));
  });

  fastify.get('/cost/:nodeId', async (request) => {
    return ok(store.costs.filter((c) => c.nodeId === request.params.nodeId).map(costOut));
  });

  fastify.post('/cost/:nodeId', async (request, reply) => {
    const body = request.body || {};
    if (body.currencyId == null || body.value == null) {
      return fail(reply, 400, 'currencyId and value are required');
    }
    const cost = store.defaults.hydrateCost({
      ...body,
      nodeId: request.params.nodeId,
      rewardId: store.newId()
    });
    store.costs.push(cost);
    return ok(costOut(cost));
  });

  fastify.put('/cost/:rewardId', async (request, reply) => {
    const cost = store.costs.find((c) => c.rewardId === request.params.rewardId);
    if (!cost) return fail(reply, 404, 'Cost not found');
    const body = request.body || {};
    if (body.currencyId != null) cost.currencyId = body.currencyId;
    if (body.value != null) cost.value = body.value;
    return ok(costOut(cost));
  });

  fastify.delete('/cost/:rewardId', async (request, reply) => {
    const { currencyId } = request.body || {};
    const index = store.costs.findIndex((c) => {
      if (c.rewardId !== request.params.rewardId) return false;
      if (currencyId != null) return Number(c.currencyId) === Number(currencyId);
      return true;
    });
    if (index < 0) return fail(reply, 404, 'Cost not found');
    const [removed] = store.costs.splice(index, 1);
    return ok(costOut(removed));
  });

  fastify.get('/experience-node/free-currencies', async () => {
    const used = new Set(store.experienceNodes.map((n) => Number(n.currencyId)));
    return ok(store.currencies.filter((c) => !used.has(Number(c.currencyId))));
  });

  fastify.get('/experience-node/roots', async () => {
    return ok(store.experienceNodes.filter((n) => !n.parentId));
  });

  fastify.post('/experience-node/root', async (request) => {
    const node = store.defaults.hydrateExperienceNode({
      ...(request.body || {}),
      parentId: null,
      experienceId: store.newId()
    });
    store.experienceNodes.push(node);
    return ok(node);
  });

  fastify.post('/experience-node/child', async (request, reply) => {
    const body = request.body || {};
    if (!body.parentId) return fail(reply, 400, 'parentId is required');
    const node = store.defaults.hydrateExperienceNode({
      ...body,
      experienceId: store.newId()
    });
    store.experienceNodes.push(node);
    return ok(node);
  });

  fastify.put('/experience-node/:nodeId', async (request, reply) => {
    const node = store.experienceNodes.find((n) => n.experienceId === request.params.nodeId);
    if (!node) return fail(reply, 404, 'Experience node not found');
    const body = request.body || {};
    if (body.currencyId != null) node.currencyId = body.currencyId;
    if (body.experienceName != null) node.experienceName = body.experienceName;
    if (body.experienceDescription != null) node.experienceDescription = body.experienceDescription;
    return ok(node);
  });

  function subtree(rootId) {
    const root = store.experienceNodes.find((n) => n.experienceId === rootId);
    if (!root) return null;
    function build(node) {
      return {
        ...node,
        children: store.experienceNodes.filter((c) => c.parentId === node.experienceId).map(build)
      };
    }
    return build(root);
  }

  function collectIds(rootId) {
    const ids = [];
    const queue = [rootId];
    while (queue.length) {
      const id = queue.shift();
      ids.push(id);
      for (const child of store.experienceNodes.filter((n) => n.parentId === id)) {
        queue.push(child.experienceId);
      }
    }
    return ids;
  }

  fastify.get('/experience-node/:rootId', async (request, reply) => {
    const tree = subtree(request.params.rootId);
    if (!tree) return fail(reply, 404, 'Experience node not found');
    return ok(tree);
  });

  fastify.delete('/experience-node/:rootId', async (request, reply) => {
    const ids = new Set(collectIds(request.params.rootId));
    if (!ids.size || !store.experienceNodes.some((n) => n.experienceId === request.params.rootId)) {
      return fail(reply, 404, 'Experience node not found');
    }
    store.experienceNodes = store.experienceNodes.filter((n) => !ids.has(n.experienceId));
    return ok({ deleted: [...ids] });
  });

  fastify.get('/reward/player.progress/:nodeId', async (request) => {
    return ok(store.rewards.filter((r) => r.nodeId === request.params.nodeId).map(costOut));
  });

  fastify.get('/reward/:nodeId', async (request) => {
    return ok(store.rewards.filter((r) => r.nodeId === request.params.nodeId).map(costOut));
  });

  fastify.post('/reward/:nodeId', async (request, reply) => {
    const body = request.body || {};
    if (body.currencyId == null || body.value == null) {
      return fail(reply, 400, 'currencyId and value are required');
    }
    const reward = store.defaults.hydrateReward({
      ...body,
      nodeId: request.params.nodeId,
      rewardId: store.newId()
    });
    store.rewards.push(reward);
    return ok(costOut(reward));
  });

  fastify.put('/reward/:rewardId', async (request, reply) => {
    const reward = store.rewards.find((r) => r.rewardId === request.params.rewardId);
    if (!reward) return fail(reply, 404, 'Reward not found');
    const body = request.body || {};
    if (body.currencyId != null) reward.currencyId = body.currencyId;
    if (body.value != null) reward.value = body.value;
    return ok(costOut(reward));
  });

  fastify.delete('/reward/:rewardId', async (request, reply) => {
    const { currencyId } = request.body || {};
    const index = store.rewards.findIndex((r) => {
      if (r.rewardId !== request.params.rewardId) return false;
      if (currencyId != null) return Number(r.currencyId) === Number(currencyId);
      return true;
    });
    if (index < 0) return fail(reply, 404, 'Reward not found');
    const [removed] = store.rewards.splice(index, 1);
    return ok(costOut(removed));
  });
}

module.exports = rewardRoutes;
