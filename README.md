# CarMatch

AI-assisted car matching and dealership flow built with React, TypeScript, and Tailwind CSS.

## Current Scope

CarMatch is a client-side web app focused on:

- Guided buyer profiling (multi-step questionnaire)
- Ranked vehicle recommendations
- Vehicle detail pages and side-by-side comparison
- Quote and booking lead capture flows
- Showroom discovery with map interactions
- AI concierge chat (Qwen-compatible API)
- Bilingual UX (Vietnamese / English)
- Lightweight analytics event buffering in `localStorage`

## Routes Implemented

- `/` - onboarding questionnaire
- `/profile` - buyer profile overview
- `/recommendations` - ranked shortlist and refinement
- `/cars` - all vehicles listing
- `/vehicle/:modelSlug` - vehicle detail page
- `/compare` - vehicle comparison flow
- `/quote` - quote request form
- `/booking` - showroom booking form
- `/showrooms` - showroom list + map
- `/concierge` - full-page AI assistant
- `/admin` - prompt/config control surface

Redirects:

- `/showroom` -> `/showrooms`
- `/dashboard` -> `/profile`

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router
- Tailwind CSS
- Leaflet + React Leaflet
- Lucide icons

## Branding (Current)

Brand identity is centralized in `src/lib/brand.ts` and wired at runtime from `src/main.tsx`.

- Brand name: `CarMatch`
- Tagline: `Find Your Best-Fit Car, Faster`
- Metadata + Open Graph + JSON-LD Organization schema are injected client-side
- Theme tokens and semantic colors are defined in:
  - `src/index.css` (CSS variables/components)
  - `tailwind.config.js` (`brandHighlight`, `brandSecondary`)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
VITE_QWEN_API_KEY=your_qwen_api_key_here
VITE_QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
VITE_QWEN_MODEL=qwen-turbo
```

Notes:

- `VITE_QWEN_API_KEY` is required for live assistant replies.
- Base URL and model are optional overrides.

## Local Development

```bash
npm install
npm run dev
```

Open the Vite URL shown in terminal (usually `http://localhost:5173`).

## Scripts

- `npm run dev` - start local development server
- `npm run build` - type-check and produce production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint

## Project Structure (High Level)

```text
src/
  components/      # Shared UI pieces (shell, chat widget, media, etc.)
  context/         # Profile, compare, and language state providers
  data/            # Vehicles, wizard steps, showrooms
  layouts/         # Main route layout
  lib/             # AI, branding, analytics, scoring, lead helpers
  pages/           # Route-level pages
  types/           # Shared TypeScript types
```

## Current Limitations

- No backend persistence yet (most state is local/session storage)
- No automated test suite committed yet
- AI concierge depends on external Qwen API availability/key setup

## License

Private repository. All rights reserved.