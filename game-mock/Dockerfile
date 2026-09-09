# Mock backend для локальной разработки talent-id game (Fastify, :8080).
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js config.js ./
COPY lib ./lib
COPY models ./models
COPY routes ./routes

EXPOSE 8080

CMD ["node", "server.js"]
