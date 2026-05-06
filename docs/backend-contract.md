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
  "sessionId": "uuid-v4",
  "wsUrl": "wss://api.example.com/api/transcribe?sessionId=..."
}
```

**Status codes:**
- `201 Created` — сессия создана
- `401 Unauthorized` — нет токена или истёк
- `429 Too Many Requests` — лимит сессий превышен

---

### 2. `WS /api/transcribe?sessionId=<uuid>`

Стрим транскрибации в реальном времени.

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
  "message": "Whisper timeout"
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
  "style": "chat"
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

**Status codes:**
- `200 OK` — текст обработан
- `400 Bad Request` — пустой `text` или невалидные параметры
- `401 Unauthorized`
- `500 Internal Server Error` — LLM timeout/failure

**Implementation notes:**
- Рекомендуемая модель: GPT-4 / Claude с промптом на удаление филлеров и добавление пунктуации
- Лимит длины: ~4000 токенов (~16К символов) для одного запроса
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

| UI Status      | Backend Event                      | Описание                                      |
|----------------|------------------------------------|-----------------------------------------------|
| `idle`         | —                                  | Ожидание действия пользователя               |
| `requesting`   | `POST /api/sessions` in progress   | Запрос доступа к микрофону / создание сессии  |
| `recording`    | WS open + audio chunks streaming   | Идёт запись и транскрибация                  |
| `error`        | HTTP 4xx/5xx, WS error, timeout    | Ошибка (показать `errorMessage`)             |

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
- **Размер одного WS-чанка:** 16–64 КБ (100–200 мс аудио)
- **Частота partial results:** не чаще 1 в секунду (чтобы не нагружать фронт)
- **Rate limit:**
  - `POST /api/sessions`: 10 запросов / минуту / пользователь
  - `POST /api/post-process`: 30 запросов / минуту / пользователь

---

## Примечания

- На фронте сейчас Web Speech API используется как MVP — он даёт сырой текст без пунктуации. Для качества «как у Wispr» нужен бэкенд с `/api/post-process` или streaming-транскрибация с Whisper + LLM в одном пайплайне.
- Будущее улучшение: real-time пунктуация прямо в WS-потоке (Deepgram поддерживает, Whisper нет).
- Для мультиязычности: определение языка по первым 3–5 секундам аудио (Whisper умеет автоопределение).
