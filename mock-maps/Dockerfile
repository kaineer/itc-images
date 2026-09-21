# Mock backend для локальной разработки maps.ai / Excursion GPT (Fastify, :8080).
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js config.js ./
COPY lib ./lib
COPY routes ./routes
COPY data ./data
COPY openapi ./openapi

EXPOSE 8080

CMD ["node", "server.js"]
