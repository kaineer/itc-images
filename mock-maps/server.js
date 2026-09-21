'use strict';

const fs = require('fs');
const path = require('path');
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
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
  await server.register(multipart, {
    limits: { fileSize: 80 * 1024 * 1024 }
  });

  server.get('/swagger/v1/swagger.json', async (request, reply) => {
    const spec = fs.readFileSync(path.join(__dirname, 'openapi', 'swagger.json'));
    return reply.type('application/json').send(spec);
  });

  await server.register(require('./routes/test'));
  await server.register(require('./routes/users'));
  await server.register(require('./routes/buildings'));
  await server.register(require('./routes/models'));
  await server.register(require('./routes/model-offers'));
  await server.register(require('./routes/tracks'));

  return server;
}

async function start() {
  const server = await build();
  try {
    await server.listen({ port: config.port, host: config.host });
    server.log.info(`mock-maps listening on http://${config.host}:${config.port}`);
    server.log.info(`buildings: ${server.store.buildings.length} from data/buildings.json`);
    server.log.info('OpenAPI: GET /swagger/v1/swagger.json');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { build, start };
