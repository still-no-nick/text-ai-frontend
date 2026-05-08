# text-ai

Frontend (Vite + React 19 + TypeScript + Tailwind) для заметок и голосовой диктовки с пост-обработкой текста на бэкенде (STT + LLM).

## Быстрый старт

Требования: **Node.js 18+** (рекомендуется 20+) и **npm**.

```bash
npm ci
cp .env.example .env
npm run dev
```

Откройте `http://localhost:5173`.

## Скрипты

```bash
npm run dev        # dev-сервер
npm run build      # prod-сборка (tsc + vite build)
npm run preview    # предпросмотр сборки
npm run lint       # eslint
npm run format     # prettier (write)
npm run format:check # prettier (check)
```

## Переменные окружения

См. `.env.example`.

- **`VITE_BACKEND_URL`**: base URL бэкенда (по умолчанию `http://127.0.0.1:3001`).

## Бэкенд контракт

Подробный контракт API: `docs/backend-contract.md`.

Используемые на фронте эндпоинты:

- `POST /api/stt/transcriptions` — загрузка аудио и распознавание (sync/async).
- `GET /api/stt/transcriptions/:id` — статус/результат для async.
- `POST /api/post-process` — LLM-постпроцесс текста.

## Структура проекта

- `src/app/` — провайдеры приложения и роутинг
- `src/pages/` — страницы
- `src/modules/` — бизнес-модули
  - `voice-dictation/` — запись аудио, UI диктовки, интеграция с STT
  - `notes/` — заметки (UI + store)
- `src/shared/` — переиспользуемые UI и утилиты

## Алиасы импортов

В Vite настроен алиас:

- `@` → `src`
