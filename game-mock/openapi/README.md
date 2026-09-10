# OpenAPI vs реальный контракт фронта

Спеки в этой папке — исходная точка для мока (`auth.json`, `game.json`, `bank.json`, `reward.json`, `gateway.json`).

На практике исходный Swagger **не всегда достаточен** для точного мока: у `auth` / `reward` ответы были пустыми, имена полей и enum расходились с фронтом.

**JSON-спеки обновлены** под контракт, на котором уже работает мок и `frontend-game`. Ниже — что именно поправлено (история расхождений). Если снова найдётся отличие — дописать сюда и в `*.json`.

---

## Общая обёртка ответа

Успех: `{ status: 200, message: "Ok", data: ... }`, ошибка: `{ status, message, data: null }`.

В `auth.json` и `reward.json` добавлены `BaseResponse*` и заполнены `responses` (раньше был пустой `default: {}`).

---

## Authorization (`auth.json`)

### JWT

- `POST /jwt/login`, `/jwt/refresh` → `BaseResponseJwtTokensDTO`: `data: { type: "Bearer", accessToken, refreshToken }`
- `POST /jwt/token` → access token в той же обёртке
- `accessToken` — JWT (`sub`=userName, `userId`, `roles`, `exp`, …)

### Пользователи

- `UserGetDTO`: идентификатор **`userId`** (не `id`)
- `GET /user/all` → `PaginatedUserList`: `ListOfTheUsers` + `Pagination` (`pageNumber`, `amountOfRecordsInThePage`, `amountOfRecordsAtAll`, `amountOfPages`)
- `GET /user/mentors` → `UserGetDTO[]`
- `GET /user/authors` → `UserPreviewDTO[]` (`userId`, `userName`)

---

## Game-engine (`game.json`)

### `PUT /api/v2/question`

Ответ: `BaseResponseQuestionPutListDTO` → `ListOfTheQuestion` + `Pagination.amountOfRecordsAtAll` (вместо свободной map).

### Статус вопроса

- В enum фильтра/DTO **нет** `IN_GAME` / `INGAME`
- На бэке: `NEW` | `REVIEW` | `REJECT` | `APPROVED` | `DEPRECATED`
- `INGAME` — только фронт: `APPROVED` + непустой `idGroupsOfTheQuestions`

### Ноды

У каждой ноды (включая корень) ожидается `groupOfTheQuestion` с `questionsId` как массивом.

### Файлы вопроса

`GetFilesForQuestionDto`: обязательны `mediaForBodyQuestion` (`JPG`/`MP3` → base64) и `jpgsForAnswersQuestion`.

### Прогресс

В `CurrentProgress.questionStatus` добавлен `FROZEN`. Узел без записи в `currentProgress` недоступен; после `ANSWERED` родителя дети открываются как `NOT_ANSWERED` (мок).

---

## Reward (`reward.json`)

- Обёртка `BaseResponse*`
- `CoinDTO`: `{ id, currencyType, currencyName, createDate }` (`id`, не `currencyId`; `createDate` — ISO-строка)
- Используется в `GET|POST /currency`, `PUT|DELETE /currency/{id}`, `GET /experience-node/free-currencies`

---

## Bank / Gateway

Без существенных правок: уже были `BaseResponse*`.

---

## Как пользоваться этим файлом

1. При сомнении — типы во `frontend-game`, затем эти `*.json`, затем этот README.
2. Новые расхождения дописывать сюда и сразу в соответствующий JSON.
3. Сиды мока: `../models/`, дефолты: `../lib/defaults.js`.
