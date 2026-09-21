# mock-maps

Mock backend (Fastify / Node.js) для локальной разработки [maps.ai](https://github.com) / Excursion GPT API.
Порт по умолчанию **8080**.

Спека: [`openapi/swagger.json`](./openapi/swagger.json) (снята с `http://10.1.0.71:8080/swagger/v1/swagger.json`).
Живая копия: `GET /swagger/v1/swagger.json`.

## Запуск

```bash
# из корня itc-images
make maps.backend

# или из этой папки
docker compose up -d --build

# другой порт на хосте
MAPS_MOCK_PORT=9090 docker compose up -d --build
```

Без Docker:

```bash
npm ci
node server.js
node server.js --port 9090
PORT=9090 node server.js
```

## Логин

Пароль у всех сидов: `password`. JWT кладётся в `accessToken`, payload содержит `unique_name` и `role` (как ждёт фронт maps.ai).

| login    | роль     | role id |
|----------|----------|---------|
| **admin**    | Admin    | 2 |
| creator  | Creator  | 1 |
| uploader | Uploader | 3 |
| user     | User     | 0 |

```bash
curl -s -X POST http://localhost:8080/users/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin","password":"password"}'
# → { "success": true, "accessToken": "<JWT>" }
```

Остальные эндпоинты (кроме `/test`, `/test/health`, `/users/login`, swagger) требуют `Authorization: Bearer <token>`.

## Сиды

- Здания OSM: [`data/buildings.json`](./data/buildings.json) (копия `stages/import/buildings.json`).
- Стартовая точка `GET /buildings/start` — [`data/itc.json`](./data/itc.json) (центр ITC).
- Демо-модель `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` привязана к ближайшему к старту зданию.
- Экскурсия «Центр города» с двумя точками.
- Одно model-offer.

Файлы моделей — заглушка `data/placeholder.bin` (`application/octet-stream`).
