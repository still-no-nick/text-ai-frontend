# Backend API Contract

## Цель

Обеспечить серверную транскрибацию аудио и LLM-постпроцесс текста для качества «как у Wispr Flow»:

- Запятые, точки, абзацы
- Списки (нумерованные и маркированные)
- Удаление филлеров («э», «мэ», «ну», паузы)
- Автоматическое форматирование по контексту

Фронтенд использует Web Speech API как MVP-заглушку; настоящая транскрибация и обработка — на бэкенде.

---

## Эндпоинты

### 0. `POST /api/stt/transcriptions`

Загрузить записанное приложением аудио и запустить распознавание в Yandex SpeechKit.

Текущая реализация поддерживает два режима:

- `mode=sync|auto` — распознавание выполняется синхронно и ответ сразу содержит текст
- `mode=async` — ответ возвращается сразу со статусом `processing`, а распознавание продолжается в фоне; результат доступен через `GET /api/stt/transcriptions/:id`

**Request (multipart/form-data):**

- `file` (required) — аудио-файл (MVP: рекомендуются `audio/wav` или `audio/ogg`)
- `language` (optional, default: `"ru-RU"`) — BCP-47 (`ru-RU`, `en-US`, ...)
- `mode` (optional, default: `"auto"`) — `"auto" | "sync" | "async"`
- `postProcess` (optional, default: `true`) — прогонять ли результат через `/api/post-process`
- `style` (optional, default: `"chat"`) — `"chat" | "doc"` (передаётся в `/api/post-process`)
- `kind` (optional, default: `"beautify"`) — `"beautify" | "expand" | "compress"` (передаётся в `/api/post-process`)

**Поддерживаемые форматы (MVP):**

- `audio/wav` / `audio/x-wav` — WAV контейнер с PCM внутри (на фронте уже пишем WAV 16kHz mono)
- `audio/ogg` — OGG/Opus

`audio/webm` (WebM/Opus) пока **не поддержан** без транскодинга и будет возвращать `415`.

**Response (sync, когда удалось распознать сразу):**

```json
{
  "id": "uuid-v4",
  "status": "done",
  "language": "ru-RU",
  "textRaw": "сырой текст",
  "text": "Сырой текст.",
  "provider": "yandex_speechkit",
  "providerMeta": {
    "format": "lpcm",
    "httpStatus": 200
  }
}
```

`text` — опционален и присутствует только если включён `postProcess=true`. Если постпроцесс выключен, используйте `textRaw` (или `text ?? textRaw`).

**Response (async, если распознавание запущено задачей):**

```json
{
  "id": "uuid-v4",
  "status": "processing",
  "language": "ru-RU",
  "provider": "yandex_speechkit"
}
```

Примечания:

- `provider` сейчас может быть `"yandex_speechkit"` (если настроены креды) или `"mock_stt"` (если не настроены).
- `providerMeta` — произвольный объект. Для `"yandex_speechkit"` сейчас возвращается минимум `{ "format": "lpcm" | "oggopus", "httpStatus": number }`.

**Status codes:**

- `201 Created` — запрос принят (sync или async)
- `400 Bad Request` — невалидные параметры / отсутствует `file`
- `401 Unauthorized` — нет токена пользователя (если у вас есть пользовательская авторизация)
- `413 Payload Too Large` — файл слишком большой для текущего sync-пути распознавания (лимит ~25MB у провайдера)
- `415 Unsupported Media Type` — неподдерживаемый `Content-Type` (например `audio/webm`) или невалидный WAV/не-PCM WAV
- `429 Too Many Requests` — лимиты превышены
- `502 Bad Gateway` — ошибка провайдера STT

---

### 0.1 `GET /api/stt/transcriptions/:id`

Получить статус и результат распознавания.

**Response (processing):**

```json
{
  "id": "uuid-v4",
  "status": "processing"
}
```

**Response (done):**

```json
{
  "id": "uuid-v4",
  "status": "done",
  "language": "ru-RU",
  "textRaw": "сырой текст",
  "text": "Сырой текст.",
  "provider": "yandex_speechkit",
  "providerMeta": {
    "requestId": "string"
  }
}
```

**Response (failed):**

```json
{
  "id": "uuid-v4",
  "status": "failed",
  "error": {
    "code": "PROVIDER_STT_FAILED",
    "message": "SpeechKit error: ...",
    "retryable": true
  }
}
```

**Status codes:**

- `200 OK`
- `404 Not Found` — неизвестный `id`

---

### 1. `POST /api/sessions`

Создать сессию записи (WebSocket-транскрибации).

**Request:**

```json
{
  "language": "ru-RU"
}
```

**Response:**

```json
{
  "sessionId": "string",
  "wsUrl": "ws://<host>:<port>/api/transcribe?sessionId=...&language=ru-RU"
}
```

`sessionId` — строка (сейчас генерируется как `nanoid`, не UUID).

**Status codes:**

- `201 Created` — сессия создана
- `401 Unauthorized` — нет токена или истёк
- `429 Too Many Requests` — лимит сессий превышен

---

### 2. `WS /api/transcribe?sessionId=<string>&language=<bcp47>`

Стрим транскрибации в реальном времени.

**Статус реализации:** сейчас endpoint существует как заглушка и всегда отправляет
`{ "type": "error", "code": "NOT_IMPLEMENTED", ... }`, после чего закрывает соединение.

**Client → Server (audio chunk):**

```json
{
  "type": "audio",
  "chunk": "<base64-encoded PCM/Opus>",
  "format": "opus",
  "sampleRate": 48000
}
```

**Server → Client (partial result):**

```json
{
  "type": "partial",
  "text": "это промежуточный результат",
  "ts": 1234567890
}
```

**Server → Client (final result):**

```json
{
  "type": "final",
  "text": "Это финальный результат.",
  "ts": 1234567891
}
```

**Server → Client (error):**

```json
{
  "type": "error",
  "code": "TRANSCRIPTION_FAILED",
  "message": "Provider timeout"
}
```

**Notes:**

- Формат аудио: PCM 16 kHz / Opus 48 kHz, mono
- Чанки ~100–200 мс рекомендуется
- Partial results отдаются каждые ~0.5–1s для real-time ощущения
- Final results — после паузы или явной границы фразы
- WS закрывается клиентом, сервер удаляет буферы через 30s inactivity

---

### 3. `POST /api/post-process`

LLM-постпроцесс сырого текста (пунктуация, абзацы, списки, удаление филлеров).

**Request:**

```json
{
  "text": "сырой текст без пунктуации э ну типа",
  "language": "ru",
  "style": "chat",
  "kind": "beautify"
}
```

**Response:**

```json
{
  "text": "Сырой текст без пунктуации, типа."
}
```

**Parameters:**

- `text` (string, required) — сырой транскрибированный текст
- `language` (string, optional, default: `"ru"`) — ISO код языка
- `style` (`"chat" | "doc"`, optional, default: `"chat"`) — стиль оформления:
  - `"chat"` — короткие предложения, разговорный стиль
  - `"doc"` — абзацы, списки, заголовки при наличии структуры
- `kind` (`"beautify" | "expand" | "compress"`, optional, default: `"beautify"`) — режим преобразования:
  - `"beautify"` — орфография/пунктуация без изменения смысла
  - `"expand"` — расширение по смыслу с перефразированием (не добавлять факты)
  - `"compress"` — сжатие, чтобы оставить суть (не терять ключевые мысли)

**Status codes:**

- `200 OK` — текст обработан
- `400 Bad Request` — пустой `text` или невалидные параметры
- `401 Unauthorized`
- `500 Internal Server Error` — LLM timeout/failure

**Implementation notes:**

- Рекомендуемая модель: GPT-4 / Claude с промптом на удаление филлеров и добавление пунктуации
- Лимит длины: ~~4000 токенов (~~16К символов) для одного запроса
- Для длинных текстов фронтенд разбивает на чанки

---

### 4. `POST /api/chat/messages` (future)

Сохранить сообщение в истории (для синхронизации между устройствами).

**Request:**

```json
{
  "role": "user",
  "content": "текст сообщения",
  "createdAt": 1234567890
}
```

**Response:**

```json
{
  "id": "uuid",
  "role": "user",
  "content": "текст сообщения",
  "createdAt": 1234567890
}
```

**Status codes:**

- `201 Created`
- `401 Unauthorized`

---

### 5. `GET /api/chat/messages` (future)

Получить историю сообщений.

**Query params:**

- `limit` (number, default: 50)
- `before` (timestamp, optional) — пагинация

**Response:**

```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "...",
      "createdAt": 1234567890
    }
  ],
  "hasMore": true
}
```

---

## Состояния UI и ошибки


| UI Status    | Backend Event                     | Описание                                       |
| ------------ | --------------------------------- | ---------------------------------------------- |
| `idle`       | —                                 | Ожидание действия пользователя                 |
| `uploading`  | `POST /api/stt/transcriptions`    | Загрузка аудио и запуск распознавания          |
| `processing` | `GET /api/stt/transcriptions/:id` | Ожидание результата асинхронного распознавания |
| `requesting` | `POST /api/sessions` in progress  | Запрос доступа к микрофону / создание сессии   |
| `recording`  | WS open + audio chunks streaming  | Идёт запись и транскрибация                    |
| `error`      | HTTP 4xx/5xx, WS error, timeout   | Ошибка (показать `errorMessage`)               |


**Коды ошибок WS:**

- `AUTH_FAILED` — токен невалидный
- `SESSION_NOT_FOUND` — sessionId не существует
- `TRANSCRIPTION_FAILED` — движок распознавания упал
- `AUDIO_FORMAT_UNSUPPORTED` — неподдерживаемый формат

**HTTP коды:**

- `401 Unauthorized` → показать «Требуется авторизация»
- `403 Forbidden` → «Доступ запрещён»
- `429 Too Many Requests` → «Превышен лимит запросов, попробуйте позже»
- `500 Internal Server Error` → «Ошибка сервера, попробуйте позже»

---

## Рекомендуемые технологии

**Транскрибация:**

- Yandex SpeechKit STT — через сервер (рекомендуется для RU и локальной интеграции в РФ)
- Whisper (OpenAI) — через API или self-hosted
- Deepgram — готовое streaming API с real-time
- Google Cloud Speech-to-Text — streaming mode

**LLM-постпроцесс:**

- GPT-4 / GPT-4 Turbo (OpenAI)
- Claude 3.5 Sonnet (Anthropic)
- Llama 3 (70B+) self-hosted

**Форматы аудио:**

- Client → Server: Opus в WebM container (лучшее сжатие для голоса)
- Альтернатива: PCM 16-bit 16 kHz mono (без сжатия, больше трафика)

**Хранилище:**

- Redis — для буферов WS-сессий (TTL 5 мин)
- PostgreSQL — для истории сообщений (если `/api/chat/messages`)

**Auth:**

- Bearer token в заголовке `Authorization: Bearer <jwt>`
- Опционально: refresh token flow

---

## Ограничения и лимиты

- **Длительность одной сессии:** до 5 минут непрерывной записи
- **Размер одного файла** (batch): ограничить сервером (например, 25–100 МБ) и отдавать `413`
- **Размер одного WS-чанка:** 16–64 КБ (100–200 мс аудио)
- **Частота partial results:** не чаще 1 в секунду (чтобы не нагружать фронт)
- **Rate limit:**
  - `POST /api/stt/transcriptions`: 10 запросов / минуту / пользователь
  - `POST /api/sessions`: 10 запросов / минуту / пользователь
  - `POST /api/post-process`: 30 запросов / минуту / пользователь

---

## Примечания

- На фронте сейчас Web Speech API используется как MVP — он даёт сырой текст без пунктуации. Для качества «как у Wispr» нужен бэкенд с `/api/post-process` или streaming-транскрибация с Whisper + LLM в одном пайплайне.
- Будущее улучшение: real-time пунктуация прямо в WS-потоке (Deepgram поддерживает, Whisper нет).
- Для мультиязычности: определение языка по первым 3–5 секундам аудио (Whisper умеет автоопределение).

---

## Интеграция с Yandex SpeechKit STT (логика бэкенда)

### Рекомендованный стек бэкенда

Лучший прагматичный выбор под этот проект (быстро, типобезопасно, удобно рядом с TS-фронтом):

- **Node.js + TypeScript**
  - **Fastify** (или NestJS, если хочется более «enterprise» структуру)
  - `undici`/`fetch` для HTTP в SpeechKit
  - BullMQ/Redis (опционально) для асинхронных задач распознавания
  - S3-совместимое хранилище (опционально) для временного аудио (MinIO в dev)

Альтернатива, если комфортнее Python/ML-экосистема:

- **Python + FastAPI** + Celery/Redis (очереди) + httpx

Ключевой момент: **аудио и токены SpeechKit должны жить на сервере**, чтобы не светить креды в браузере.

### Режимы распознавания

- **Sync (`mode=sync|auto`)**: бэкенд принимает файл, отправляет в SpeechKit и возвращает готовый текст сразу в ответе `POST /api/stt/transcriptions`.
- **Async (`mode=async`)**: бэкенд сразу отвечает `status=processing` и выполняет распознавание в фоне; фронт опрашивает `GET /api/stt/transcriptions/:id`.

Ограничение MVP: в текущей реализации и sync, и async используют **синхронный** вызов провайдера и буферизацию тела запроса; лимит входного файла ~25MB.

### Маппинг параметров (frontend → backend → SpeechKit)

- `language` → параметр языка распознавания SpeechKit
- `Content-Type` файла → выбор `format` в SpeechKit (сейчас поддержаны `audio/wav` и `audio/ogg`)
- `postProcess/style` → после STT вызвать `/api/post-process` тем же `language` и `style`

### Ошибки и ретраи

- Ошибки SpeechKit маппятся в:
  - `502` на этапе создания (`POST /api/stt/transcriptions`), если провайдер недоступен/вернул 5xx
  - `status=failed` в `GET /api/stt/transcriptions/:id`, если провайдерная задача упала
- `retryable=true` для сетевых ошибок/таймаутов/лимитов провайдера, `false` для «формат не поддерживается», «невалидный токен провайдера» и т.п.

### Аутентификация SpeechKit (на сервере)

SpeechKit требует серверного доступа (токен/ключ). На практике держим в env:

- `YANDEX_FOLDER_ID`
- `YANDEX_IAM_TOKEN` (короткоживущий) **или** механизм получения IAM-токена с сервисного аккаунта

Бэкенд добавляет нужный заголовок авторизации к запросам в SpeechKit и никогда не отдаёт эти значения на клиент.