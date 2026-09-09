'use strict';

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const config = require('./config');
const { createStore } = require('./lib/store');

async function build() {
  const server = Fastify({ logger: true });
  const store = createStore();

  server.decorate('store', store);
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

  await server.register(require('./routes/gateway'));
  await server.register(require('./routes/auth'), {
    prefix: '/authorization-server-service/api/v1'
  });
  await server.register(require('./routes/game'), { prefix: '/game-engine' });
  await server.register(require('./routes/bank'), { prefix: '/bank-service' });
  await server.register(require('./routes/reward'), {
    prefix: '/reward-service/api/v1'
  });

  return server;
}

async function start() {
  const server = await build();
  try {
    await server.listen({ port: config.port, host: config.host });
    server.log.info(`game-mock listening on http://${config.host}:${config.port}`);
    server.log.info('Prefixes: /authorization-server-service/api/v1 /game-engine /bank-service /reward-service/api/v1');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { build, start };
