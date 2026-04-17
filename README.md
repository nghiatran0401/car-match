# Qwen Voice Studio

Full-stack voice chat app with:

- Next.js App Router frontend in `frontend/`
- FastAPI backend in `backend/`
- Browser microphone capture with Web Audio / WebRTC media devices
- Qwen3.5 Omni Realtime for continuous duplex voice conversation
- Automatic server-side VAD, interruption handling, and streaming audio playback
- Vercel Services deployment config for one shared live URL

The original Vite car-match app is still in the repo under `src/`.

## Vite AI Chat + Voice Mode

The Vite app now includes a Perplexity-style voice mode entry point inside all AI chatbot UIs:

- `src/components/GlobalChatWidget.tsx`
- `src/pages/ConciergePage.tsx`
- `src/pages/RecommendationsPage.tsx`

When users tap the mic icon, a full voice overlay opens and they can talk to the AI hands-free with continuous realtime turn detection and streamed voice responses.

The Vite voice mode now uses the same realtime websocket pipeline as `frontend/components/voice-studio.tsx` with backend relay at `backend/main.py` (`/realtime`).

## Project Layout

```text
frontend/            # Next.js web app
backend/             # FastAPI service
vercel.json          # Vercel Services routing
src/                 # Legacy Vite app kept intact
```

## Environment

Copy `.env.example` to `.env` and set at least:

```bash
DASHSCOPE_API_KEY=...
DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com
QWEN_OMNI_REALTIME_MODEL=qwen3.5-omni-plus-realtime
QWEN_OMNI_REALTIME_DEFAULT_VOICE=Tina
QWEN_OMNI_REALTIME_VI_VOICE=Hana
```

The backend also accepts the legacy `VITE_QWEN_*` variables already present in this repo.

For the Vite app (`src/`) AI chat and voice mode, set:

```bash
VITE_QWEN_API_KEY=...
VITE_QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
VITE_QWEN_MODEL=qwen-flash
VITE_REALTIME_WS_URL=ws://127.0.0.1:8000/realtime
```

## Local Run

Install frontend dependencies:

```bash
npm run voice:install:web
```

Install backend dependencies:

```bash
python3 -m pip install -e backend
```

Run the API:

```bash
npm run voice:dev:api
```

Run the Next.js frontend in another terminal:

```bash
npm run voice:dev:web
```

The frontend defaults to `http://localhost:3000` and expects the API at `NEXT_PUBLIC_API_BASE_URL` or `/api`.

For separate frontend/backend local runs, place this in `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

For a single-process Vercel-style local run after dependencies are installed:

```bash
npm run voice:dev:services
```

## Docker (one command)

You can run the Vite app + FastAPI voice backend with one command:

```bash
docker compose up --build -d
```

Services:

- `web`: Vite app at `http://localhost:5173`
- `api`: FastAPI backend at `http://localhost:8000` (`/health`, `/realtime`, `/text-turn`, `/voice-turn`)

Useful commands:

```bash
# Watch logs
docker compose logs -f

# Stop services
docker compose down
```

## Deploy To Vercel

1. Install dependencies locally.
2. Link the repo to a Vercel project.
3. In the Vercel dashboard set the Framework Preset to `Services`.
4. Add the same Qwen / DashScope environment variables to the project.
5. Deploy with:

```bash
npm run voice:deploy
```

When deployed through Services:

- `frontend/` serves `/`
- `backend/main.py` serves `/api/*`
- the frontend automatically talks to the backend on the same domain

Important:

- The new realtime voice path uses a backend WebSocket relay at `/api/realtime`.
- Vercel Functions do not support acting as a WebSocket server, so the full realtime voice mode needs a websocket-capable backend host outside Vercel.
- The existing HTTP endpoints (`/api/text-turn` and `/api/voice-turn`) remain available as fallback paths.

## Notes

- The realtime mode uses `qwen3.5-omni-plus-realtime` over WebSocket and streams 16 kHz mono PCM up, then plays 24 kHz PCM chunks from the model in the browser.
- The backend still keeps the older `/api/text-turn` and `/api/voice-turn` HTTP endpoints for fallback and non-realtime deployments.
