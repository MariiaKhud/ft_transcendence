# Frontend

React + TypeScript + Vite frontend for ft_transcendence.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Zustand (auth state)

## Prerequisites

- Node.js 18+
- npm

## Local Development

From this folder:

```bash
npm install
npm run dev
```

App will run on Vite default port unless overridden.

## Build and Preview

```bash
npm run build
npm run preview
```

## Scripts

```bash
npm run dev      # start Vite dev server
npm run build    # type-check + production build
npm run preview  # preview production build
```

## Environment

Optional env variable used by login page:

```env
VITE_API_BASE_URL=
```

Behavior:
- If `VITE_API_BASE_URL` is empty, frontend uses same-origin requests (recommended with Nginx reverse proxy).
- If set, requests go to `${VITE_API_BASE_URL}/api/...`.

## Routing

Routes are configured in `src/app/router.tsx`:

- `/` -> `Home`
- `/login` -> `Login`
- `/feed` -> `Feed`
- `*` -> `NotFound`

## Auth Flow

Auth state is managed by Zustand in `src/store/authStore.ts`.

- `user`: authenticated user or `null`
- `isAuthenticated`: boolean flag
- `setUser(user)`: set login state
- `clearUser()`: clear login state

Login page (`src/pages/Login.tsx`):
- validates email/password fields
- sends `POST /api/auth/login`
- uses `credentials: include` for cookie-based auth
- stores returned user in Zustand
- redirects to `/feed` on success

## Project Structure

```text
frontend/
├── src/
│   ├── app/              # router
│   ├── components/       # UI components
│   ├── pages/            # route pages
│   ├── store/            # Zustand stores
│   ├── App.tsx           # app layout
│   └── main.tsx          # entry point
├── index.html
├── vite.config.ts
└── package.json
```

## Notes

- Path alias `@` points to `src` (configured in `vite.config.ts`).
- Tailwind is enabled through `@tailwindcss/vite` plugin.
