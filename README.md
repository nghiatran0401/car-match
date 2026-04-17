# CarMatch Voice Assistant

Full-stack car recommendation app with realtime voice mode:

- Vite + React frontend in `src/`
- FastAPI backend in `backend/`
- Browser microphone capture with Web Audio
- Qwen3.5 Omni Realtime websocket voice conversation
- Vercel hosting for web app
- Fly.io hosting for websocket-capable realtime backend

## Voice Mode Entry Points

The Vite app now includes a Perplexity-style voice mode entry point inside all AI chatbot UIs:

- `src/components/GlobalChatWidget.tsx`
- `src/pages/ConciergePage.tsx`
- `src/pages/RecommendationsPage.tsx`

When users tap the mic icon, a full voice overlay opens and they can talk to the AI hands-free with continuous realtime turn detection and streamed voice responses.

Voice mode connects to backend realtime websocket at `/realtime` (or explicit `VITE_REALTIME_WS_URL` when configured).

## Project Layout

```text
src/                 # Vite web app
backend/             # FastAPI service
vercel.json          # Vercel deployment routing
fly.toml             # Fly.io realtime backend deployment config
frontend/            # Legacy Next.js app (not primary deployment)
```

## Environment

Copy `.env.example` to `.env` for local development, or use `.env.prod` for production values.

Minimum required backend variables:

```bash
DASHSCOPE_API_KEY=...
DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com
QWEN_OMNI_REALTIME_MODEL=qwen3.5-omni-plus-realtime
QWEN_OMNI_REALTIME_DEFAULT_VOICE=Tina
QWEN_OMNI_REALTIME_VI_VOICE=Hana
```

Frontend (`src/`) variables:

```bash
VITE_QWEN_API_KEY=...
VITE_QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
VITE_QWEN_MODEL=qwen-flash
# local only
VITE_REALTIME_WS_URL=ws://127.0.0.1:8000/realtime
```

Production note:

- Do **not** set localhost values in Vercel env vars.
- Use `VITE_API_BASE_URL=/api`.
- Set `VITE_REALTIME_WS_URL` to a public websocket backend (for example Fly.io), such as:

```bash
VITE_REALTIME_WS_URL=wss://car-match-realtime-api.fly.dev/realtime
```

## Local Run

Install web dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
python3 -m pip install -e backend
```

Run the API:

```bash
npm run voice:dev:api
```

Run the Vite frontend in another terminal:

```bash
npm run dev -- --host 0.0.0.0 --port 5173
```

Frontend runs at `http://localhost:5173`.

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

## Deploy Web To Vercel

1. Install dependencies locally.
2. Link the repo to a Vercel project.
3. Add production env vars in Vercel (recommend starting from `.env.prod`).
4. Ensure websocket is configured to an external host:

```bash
VITE_REALTIME_WS_URL=wss://car-match-realtime-api.fly.dev/realtime
```
5. Deploy with:

```bash
npm run voice:deploy
```

## Deploy Realtime Backend To Fly.io

This project includes `fly.toml` for backend deployment:

```bash
flyctl auth login
flyctl apps create car-match-realtime-api
flyctl secrets import -a car-match-realtime-api < .env.prod
flyctl deploy --remote-only --config fly.toml
```

Then set `VITE_REALTIME_WS_URL` in Vercel to your Fly endpoint:

```bash
wss://car-match-realtime-api.fly.dev/realtime
```

## Notes

- Realtime uses `qwen3.5-omni-plus-realtime` over WebSocket.
- Browser streams 16 kHz mono PCM up and plays 24 kHz PCM chunks from model responses.
- HTTP endpoints `/api/text-turn` and `/api/voice-turn` remain available as fallback.
