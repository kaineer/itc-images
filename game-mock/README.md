# game-mock

Mock backend (Fastify / Node.js) для локальной разработки фронтенда
[frontend-game](../../frontend-game) (Talent ID admin / game UI).
Порт по умолчанию **8080**.

Интерфейс собран по OpenAPI из [`openapi/`](./openapi/) (gateway, auth, game-engine, bank, reward).
Расхождения спеки с контрактом фронта — в [`openapi/README.md`](./openapi/README.md).

## Связка с frontend-game

Фронт: `/home/kaineer/devel/itc/frontend-game`.

В `.env.internal` (подхватывается `yarn dev`) укажите хост мока:

```bash
VITE_INTERNAL_IP=127.0.0.1
VITE_INTERNAL_PORT=8080
```

Фронт ходит на сервисы по префиксам на одном порту (см. `src/app/core/utils/baseQuery.ts`):

| Сервис фронта | URL-префикс |
|---------------|-------------|
| `auth` | `/authorization-server-service/...` |
| `origin` (game) | `/game-engine/...` |
| `bank` | `/bank-service/...` |
| `reward` | `/reward-service/...` |

Типичный цикл:

```bash
# терминал 1 — мок
cd /home/kaineer/devel/itc/itc-images && make game.backend
# или: cd game-mock && npm ci && npm start

# терминал 2 — фронт
cd /home/kaineer/devel/itc/frontend-game && yarn && yarn dev
```

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
npm start
node server.js --port 9090
PORT=9090 node server.js
```

Остановка контейнера: `docker compose down` или `make clean` из корня `itc-images`.

## Логин

Любая **существующая** учётка из `models/users/` (пароль в файле, у сидов `password`):

| login    | роль                         |
|----------|------------------------------|
| **su**   | все роли                     |
| admin    | ADMINISTRATOR                |
| anna     | PLAYER                       |
| ivan     | MENTOR                       |
| marina   | METHODIST                    |
| dmitry   | GAME_DIZ                     |

`su` удобен для полного контент-цикла (вопрос → группа → approved → узел → перенос во вселенную/игру) без смены пользователей. Также входит в группу менторов English.

Неизвестный `login` при логине создаёт нового игрока (`PLAYER`).

```bash
curl -s -X POST http://localhost:8080/authorization-server-service/api/v1/jwt/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"anna","password":"password"}'
# → { "status": 200, "message": "Ok", "data": { "type": "Bearer", "accessToken": "<JWT>", "refreshToken": "<JWT>" } }
```

`accessToken` — JWT (HS256) с `exp` ≈ **+24 часа** (`GAME_MOCK_ACCESS_TTL_SEC`).
Секрет: `GAME_MOCK_JWT_SECRET` (по умолчанию `game-mock-dev-secret`).

## Префиксы

| Сервис  | Префикс |
|---------|---------|
| Gateway | `/`, `/credentials`, `/api/v1/errors-code` |
| Auth    | `/authorization-server-service/api/v1` |
| Game    | `/game-engine` |
| Bank    | `/bank-service` |
| Reward  | `/reward-service/api/v1` |

Ответы в обёртке `{ status, message, data }` — как ждёт фронт.

## Модели (сиды)

Сиды лежат в `models/<тип>/*.js`. Чтобы добавить сущность — положите новый `.js` в нужную папку и перезапустите сервер. Чтобы убрать — удалите файл.

В файле достаточно **существенных** полей (имя, связи, текст вопроса, координаты ноды). Служебное (`id` если не нужен для связей, даты, статусы, пустые списки) подставляется из `lib/defaults.js`.

Общие UUID для связей — [`models/ids.js`](./models/ids.js).

Демо-контент: организация ITC, вселенная English (ноды articles / tenses / writing / test), вопросы нескольких типов, прогресс игрока `anna`, валюты и награды.

## Структура

```
game-mock/
  server.js          # Fastify + CORS + регистрация роутов
  config.js          # PORT / HOST (и --port)
  routes/            # auth, game, bank, reward, gateway
  lib/               # store, jwt, defaults, http
  models/            # сиды по типам сущностей
  openapi/           # спеки и заметки по контракту с фронтом
  compose.yaml       # контейнер :8080
```

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|------------|--------------|------------|
| `PORT` / `GAME_MOCK_PORT` | `8080` | Порт listen / publish |
| `HOST` | `0.0.0.0` | Bind address |
| `GAME_MOCK_JWT_SECRET` | `game-mock-dev-secret` | HMAC для JWT |
| `GAME_MOCK_ACCESS_TTL_SEC` | `86400` (24h) | TTL access token |
| `GAME_MOCK_REFRESH_TTL_SEC` | `604800` (7d) | TTL refresh token |
