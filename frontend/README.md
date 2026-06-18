# Frontend

React + TypeScript + Vite frontend for ft_transcendence.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Zustand (auth state)
- Axios (API client)

## Prerequisites

- Node.js 18+
- npm

## Local Development

From this folder:

```bash
npm install
npm run dev
```

Default local URL:

- http://localhost:5173

## Build and Preview

```bash
npm run build
npm run preview
```

## Scripts

```bash
npm run dev            # start Vite dev server
npm run build          # TypeScript project build + Vite production build
npm run preview        # preview production build
npm run test:frontend  # frontend smoke checks (routes + api proxy + build)
```

## Frontend Smoke Test

Script file:

- `scripts/test-frontend-flow.sh`

Default behavior:

- Uses `https://localhost:8443` (Docker + Nginx)
- Checks `/`, `/login`, `/register`, `/feed`, and unknown route fallback
- Checks API proxy via `/api/auth/me`
- Runs `npm run build`

Optional env overrides:

```bash
FRONTEND_BASE_URL=https://localhost:8443
FRONTEND_API_PROXY_PATH=/api/auth/me
FRONTEND_CURL_INSECURE=true
```

Run:

```bash
npm run test:frontend
```

## Environment Variables

- `VITE_API_BASE_URL`
  - Default: empty string
  - When empty, requests are same-origin (recommended with Nginx reverse proxy)
  - When set, Axios uses this as base URL

- `VITE_DEV_API_PROXY_TARGET`
  - Used by Vite dev server proxy in `vite.config.ts`
  - Default: `http://localhost:3000` (or `http://backend:3000` in Docker env)

## Routing

Routes are configured in `src/app/router.tsx`:

- `/` -> `Home`
- `/login` -> `Login`
- `/register` -> `Register`
- `/feed` -> `Feed`
- `*` -> `NotFound`

## Auth Flow

Auth state is managed by Zustand in:

- `src/store/store.ts`
- `src/store/slices/authSlice.ts`

Auth API calls live in:

- `src/api/authApi.ts`

Current auth actions via `useAuth` hook (`src/hooks/useAuth.ts`):

- `login(credentials)`
- `logout()`
- `restoreSession()`

## Project Structure

```text
frontend/
├── scripts/            # smoke test scripts
├── src/
│   ├── api/            # API wrappers
│   ├── app/            # router
│   ├── components/     # UI components
│   ├── hooks/          # app hooks
│   ├── pages/          # route pages
│   ├── store/          # Zustand store + slices
│   ├── lib/            # shared frontend utilities
│   ├── App.tsx         # app layout
│   └── main.tsx        # entry point
├── index.html
├── vite.config.ts
└── package.json
```

## Notes

- Path alias `@` points to `src` (configured in `vite.config.ts`).
- Tailwind is enabled through `@tailwindcss/vite` plugin.
