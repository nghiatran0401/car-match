# Qwen Voice Studio

Full-stack voice chat app with:

- Next.js App Router frontend in `frontend/`
- FastAPI backend in `backend/`
- Browser microphone capture with Web Audio / WebRTC media devices
- Qwen3 ASR for transcription
- Qwen chat completions for replies
- Qwen TTS for spoken playback
- Vercel Services deployment config for one shared live URL

The original Vite car-match app is still in the repo under `src/`. This new voice app is isolated so the migration is non-destructive.

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
QWEN_CHAT_MODEL=qwen3.6-plus
QWEN_ASR_MODEL=qwen3-asr-flash
QWEN_TTS_MODEL=qwen3-tts-flash
```

The backend also accepts the legacy `VITE_QWEN_*` variables already present in this repo.

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

For a single-process Vercel-style local run after dependencies are installed:

```bash
npm run voice:dev:services
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

## Notes

- The browser records microphone audio as WAV before upload because the Qwen ASR docs explicitly show `audio/wav` and `audio/mpeg` Data URLs for the OpenAI-compatible endpoint.
- The backend uses `qwen3-asr-flash` over the OpenAI-compatible `/chat/completions` endpoint.
- The backend uses `qwen3-tts-flash` over the DashScope multimodal generation endpoint and repackages streamed PCM into a WAV reply for the browser.
