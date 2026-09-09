# OpenAPI vs реальный контракт фронта

Спеки в этой папке — исходная точка для мока (`auth.json`, `game.json`, `bank.json`, `reward.json`, `gateway.json`).

На практике Swagger **не всегда достаточен** для точного мока:

- у части сервисов (`auth`, `reward`) ответы в спеке — пустой `default: {}`, без схем;
- имена полей и обёртки на живом бэке / во фронте расходятся со спекой;
- enum и «очевидные» формы данных уточняются только по типам фронта (`frontend-game`).

Ниже — отличия, которые **уже учтены в моке** (по проверкам с фронтом). Спеки JSON пока **не правили**: эта таблица — источник правды для поведения мока, пока OpenAPI не догонит.

---

## Общая обёртка ответа

| В OpenAPI | В моке / на фронте |
|-----------|-------------------|
| `auth.json`, `reward.json`: схемы ответов почти не описаны | Успех: `{ status: 200, message: "Ok", data: ... }`, ошибка: `{ status, message, data: null }` |
| `game.json`, `bank.json`, `gateway.json`: `BaseResponse*` со `status` / `message` / `data` | То же; мок следует этой форме |

Особенно критично для auth: без обёртки фронт не разбирает login и `GET /user`.

---

## Authorization (`auth.json`)

### `POST /jwt/login` (и соседние jwt)

| OpenAPI | Мок |
|---------|-----|
| Тело ответа не описано | `data: { type: "Bearer", accessToken, refreshToken }` |
| — | `accessToken` / `refreshToken` — **JWT** (не opaque-строка) |
| — | В access JWT: `sub` = userName, `userId`, `roles`, `exp`, `iat`, `type: "access"` |
| — | `exp` с запасом (~24h), иначе `jwtDecode` + логика refresh на фронте ломается |

### Пользователь в ответах

| OpenAPI | Мок / фронт (`User`) |
|---------|----------------------|
| Поля ответа не описаны | Идентификатор: **`userId`**, не `id` |
| — | Также: `userName`, `email`, `password`, `roles`, … |

### `GET /user/all`

| OpenAPI | Мок / фронт (`PaginatedUserList`) |
|---------|-----------------------------------|
| Не описано | `data: { ListOfTheUsers: User[], Pagination: { pageNumber, amountOfRecordsInThePage, amountOfRecordsAtAll, amountOfPages } }` |
| — | Не Spring-style `{ content, totalElements, … }` |

### `GET /user/mentors`

Полные `User[]` (с `userId`, ролями и т.д.) из сидов с ролью `MENTOR`.

### `GET /user/authors`

| OpenAPI | Мок / фронт (`UserPreview`) |
|---------|------------------------------|
| Не описано | Массив `{ userId, userName }` (METHODIST / GAME_DIZ) |

---

## Game-engine (`game.json`)

### Ноды и группы вопросов

| OpenAPI / наивное чтение | Мок |
|--------------------------|-----|
| Корневая нода может быть без группы | У **каждой** ноды, включая корень, есть `groupOfTheQuestion` |
| — | У группы `questionsId` — **массив** (не `null`); пустой массив допустим только если вопросов реально нет |

Иначе фронт падает при разборе дерева / карточки узла.

### `PUT /api/v2/question` (список с фильтром)

| OpenAPI (`BaseResponseMapStringObject` / свободная map) | Мок / фронт (`QuestionPutResponse`) |
|---------------------------------------------------------|--------------------------------------|
| Неформальный `data` | `data: { ListOfTheQuestion: Question[], Pagination: { amountOfRecordsAtAll } }` |
| Ранее в моке было `items` / `total` / `offset` / `limit` | Заменено на имена выше |

Query `offset` / `limit` как в спеке; в `Pagination` фронту достаточно `amountOfRecordsAtAll`.

### Статус вопроса

| OpenAPI | Мок / фронт |
|---------|-------------|
| В фильтре встречается `IN_GAME` | **Бэкенд не возвращает `INGAME` / `IN_GAME`** |
| В `QuestionGetDTO`: `NEW`, `REVIEW`, `REJECT`, `APPROVED`, `DEPRECATED` | В сидах «игровые» вопросы — **`APPROVED`** + непустой `idGroupsOfTheQuestions` |

`INGAME` — **только фронтовое** представление: `status === 'APPROVED'` **и** у вопроса есть прикреплённая группа (`idGroupsOfTheQuestions.length > 0`). См. `getQuestionStatus` во фронте.

### `GET /api/v2/file/files/{questionId}`

В OpenAPI схема `GetFilesForQuestionDto` в целом верная, но легко недочитать:

| Поле | Форма |
|------|--------|
| `mediaForBodyQuestion` | Объект **всегда** присутствует. Ключи: `JPG` \| `MP3` (опционально), значения — **base64 без** `data:`-префикса |
| `jpgsForAnswersQuestion` | Объект **всегда** присутствует. Ключ — номер ответа (строка), значение — base64 JPG |

На фронте тип шире (`{[id: string]: string}`), фактически для тела вопроса — `{ MP3?: string; JPG?: string }`. Без `mediaForBodyQuestion` UI падает.

---

## Reward (`reward.json`)

Ответы в спеке не описаны; мок оборачивает в `{ status, message, data }`.

### `GET /currency` (и мутации currency)

| OpenAPI (`CurrencyCreateOrUpdateDTO` без ответа) | Мок / фронт (`Coin`) |
|--------------------------------------------------|----------------------|
| — | `{ id, currencyType, currencyName, createDate }` |
| Внутри мока id валюты хранится как `currencyId` | Наружу отдаётся как **`id`** |
| — | **`createDate`** — ISO-строка (`new Date(createDate)` валиден); без поля фронт ломается |

То же представление используется в `GET /experience-node/free-currencies`.

---

## Bank / Gateway

Существенных расхождений с фронтом сегодня не ловили: bank/gateway уже описаны через `BaseResponse*`. Мок следует обёртке `status` / `message` / `data`.

---

## Как пользоваться этим файлом

1. При сомнении «что отдавать» — сначала смотреть **этот README** и типы во `frontend-game`, потом OpenAPI.
2. Новые расхождения, найденные при прогоне UI, дописывать сюда же (дата / эндпоинт / было → стало).
3. Когда контракт стабилизируется — имеет смысл перенести правки обратно в `*.json`, чтобы спека снова была источником правды.

Сиды и дефолты, которые закрывают эти кейсы: `../models/`, `../lib/defaults.js`, роуты в `../routes/`.
