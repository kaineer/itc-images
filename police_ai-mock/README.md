# police_ai-mock

Mock backend (Fastify / Node.js) для локальной разработки police_ai. Порт **3000**.

Исходник перенесён из `~/devel/itc/police_ai_backend`.

## Запуск

```bash
# из корня itc-images
make police.backend

# или из этой папки
docker compose up -d --build
```

Без Docker:

```bash
npm ci
node server.js
```

## Эндпоинты

- `POST /session/login`, `GET /session/me`, `POST /session/update`
- `GET /catalog/locations|evidence|wrappings|workplaces`
- `POST/GET /exam/attempts/...`
- `GET|PUT /instructor/...`
