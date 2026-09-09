# game-mock

Mock backend (Fastify / Node.js) для локальной разработки фронтенда talent-id game.
Порт по умолчанию **8080**.

Интерфейс собран по OpenAPI из `openapi/` (gateway, auth, game-engine, bank, reward).
Расхождения спеки с реальным контрактом фронта — в [`openapi/README.md`](./openapi/README.md).

## Запуск

```bash
# из корня itc-images
make game.backend

# или из этой папки
docker compose up -d --build

# другой порт на хосте
GAME_MOCK_PORT=9090 docker compose up -d --build
```

Без Docker:

```bash
npm ci
node server.js
node server.js --port 9090
PORT=9090 node server.js
```

## Логин

Любая **существующая** учётка из `models/users/` (пароль в файле, у сидов `password`):

| login   | роль            |
|---------|-----------------|
| admin   | ADMINISTRATOR   |
| anna    | PLAYER          |
| ivan    | MENTOR          |
| marina  | METHODIST       |
| dmitry  | GAME_DIZ        |

Неизвестный login создаёт нового игрока (`PLAYER`).

```bash
curl -s -X POST http://localhost:8080/authorization-server-service/api/v1/jwt/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"anna","password":"password"}'
# → { "status": 200, "message": "Ok", "data": { "type": "Bearer", "accessToken": "<JWT>", "refreshToken": "<JWT>" } }
```

`accessToken` — JWT (HS256) с `exp` ≈ **+24 часа** (переопределяется `GAME_MOCK_ACCESS_TTL_SEC`).

## Префиксы

| Сервис | Префикс |
|--------|---------|
| Gateway | `/`, `/credentials`, `/api/v1/errors-code` |
| Auth | `/authorization-server-service/api/v1` |
| Game | `/game-engine` |
| Bank | `/bank-service` |
| Reward | `/reward-service/api/v1` |

## Модели

Сиды лежат в `models/<тип>/*.js`. Чтобы добавить сущность — положите новый `.js` в нужную папку и перезапустите сервер. Чтобы убрать — удалите файл.

В файле достаточно **существенных** полей (имя, связи, текст вопроса, координаты ноды). Служебное (`id` если не нужен для связей, даты, статусы, пустые списки) подставляется из `lib/defaults.js`.

Общие UUID для связей — `models/ids.js`.
