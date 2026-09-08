# Mock backend для локальной разработки police_ai (Fastify, :3000).
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
