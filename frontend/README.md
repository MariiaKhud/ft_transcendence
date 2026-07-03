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
- Checks `/`, `/login`, `/register`, `/feed`, `/profile/:username`, and unknown route fallback
- Checks API proxy via `/api/auth/me`
- Checks users proxy path via `/api/users/smoke_user`
- Runs `npm run build`

Optional env overrides:

```bash
FRONTEND_BASE_URL=https://localhost:8443
FRONTEND_API_PROXY_PATH=/api/auth/me
FRONTEND_USERS_PROXY_PATH=/api/users/smoke_user
FRONTEND_CURL_INSECURE=true
```

Run:

```bash
npm run test:frontend
```

## Environment Variables

- `VITE_API_BASE_URL`
  - Default: `/api`
  - Recommended: keep this as `/api` so the browser stays same-origin and auth cookies work consistently on refresh
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
- `/profile/:username` -> `Profile` (read-only public profile)
- `/settings/profile` -> `EditProfile` ✓ (edit displayName, bio, avatar)
- `*` -> `NotFound`

## Edit Profile Form ✓

**Route:** `/settings/profile`

**Description:** Form for authenticated users to edit their profile information and avatar.

**Features:**
- Update `displayName` (optional, max 50 chars)
- Update `bio` (optional, max 500 chars)
- Upload avatar (PNG/JPG, max 2MB)
- Preview avatar before upload
- Delete existing avatar
- Field validation and error handling

**API Integration:**
- `PATCH /api/users/me` — update displayName and bio
- `POST /api/users/me/avatar` — upload new avatar
- `DELETE /api/users/me/avatar` — remove avatar

**Implementation files:**
- `src/pages/EditProfile.tsx` — main edit profile page component
- `src/api/users.ts` — API wrapper functions
- `src/components/` — reusable form components

## Articles Feed 🔄

**Route:** `/feed`

**Description:** Global articles feed with pagination, search, filtering, and sorting.

**Features:**
- Display paginated articles (20 per page by default)
- Search articles by title and content
- Filter articles by category (PROGRAMMING, CAREER, STUDY_NOTES, PROJECTS, LIFE, OPINION)
- Sort articles (Newest, Oldest, Most Liked)
- Show author info, article stats (likes, comments)
- Responsive card-based layout

**API Integration:**
- `GET /api/articles` — fetch paginated articles with filtering/sorting

**Query Parameters (via Feed component):**
- `page` — pagination
- `limit` — articles per page (max 100)
- `search` — search in title and content
- `category` — filter by category
- `sort` — sort order (newest, oldest, most_liked)

**Implementation files:**
- `src/pages/Feed.tsx` — main feed page component with filtering UI
- `src/api/articles.ts` — API wrapper functions for articles

## Auth Flow

Auth state is managed by Zustand in:

- `src/store/store.ts`
- `src/store/slices/authSlice.ts`

Auth API calls live in:

- `src/api/auth.ts`
- `src/api/users.ts` (profile and profile-articles API wrappers)

Current auth actions via `useAuth` hook (`src/hooks/useAuth.ts`):

- `login(credentials)`
- `logout()`
- `restoreSession()`

Current auth UX behavior:

- Session is restored on app load via `/api/auth/me` before protected UI is resolved.
- Logout redirects users to `/login` from profile/edit flows.
- `EditProfile` redirects unauthenticated access to `/login`.
- Login/Register forms show a short password hint: `8-72 chars, use lowercase, uppercase, and digits.`

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
