# Frontend

React + TypeScript + Vite frontend for ft_transcendence.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Zustand (auth state)
- Fetch API via shared wrapper (`src/api/client.ts`)

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
- Checks `/`, `/login`, `/register`, `/feed`, `/profile/:username`, `/privacy-policy`, and unknown route fallback
- Checks API proxy via `/api/auth/me`
- Checks users proxy path via `/api/users/smoke_user`
- Checks OAuth proxy flow (`/api/auth/oauth/providers`, start redirect, denied consent, tampered state, reused state)
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
  - When set, `src/api/client.ts` uses this as base URL

OAuth frontend behavior depends on backend variables in root or backend env:

- `OAUTH_*_CLIENT_ID`
- `OAUTH_*_CLIENT_SECRET`
- `OAUTH_*_CALLBACK_URL`
- `OAUTH_SUCCESS_REDIRECT`
- `OAUTH_ERROR_REDIRECT`

Frontend discovers enabled providers from backend at `GET /api/auth/oauth/providers`.

## API Client

Frontend API wrappers in `src/api/*.ts` use the shared client in `src/api/client.ts`.

Current behavior:

- Always sends `credentials: include`
- Parses backend `ApiResponse<T>` envelope
- Throws typed `ApiClientError` with HTTP status and payload metadata
- Supports JSON bodies, `FormData`, and query params

- `VITE_DEV_API_PROXY_TARGET`
  - Used by Vite dev server proxy in `vite.config.ts`
  - Default: `https://localhost:8443` for host development; Docker uses the internal `http://backend:3000` service address
  - The HTTPS default accepts the local development certificate in Vite

## Routing

Routes are configured in `src/app/router.tsx`:

- `/` -> `Home` (includes the global articles feed)
- `/search` -> `Search` (advanced article search)
- `/login` -> `Login`
- `/register` -> `Register`
- `/feed` -> redirects to `/` (kept for old links/bookmarks)
- `/profile/:username` -> `Profile` (read-only public profile)
- `/articles/new` -> `CreateArticle` (auth required)
- `/articles/:id` -> `Article` (detail, likes, comments, author actions)
- `/settings/profile` -> `EditProfile` ✓ (edit displayName, bio, avatar, and CV)
- `/privacy-policy` -> `PrivacyPolicy` ✓ (static policy page, guest accessible)
- `/terms-of-service` -> `TermsOfService` ✓ (static terms page, guest accessible)
- `*` -> `NotFound`

Routes are lazy-loaded with `React.lazy`, so each page is split into its own JS chunk instead of inflating the initial bundle.

## Edit Profile Form ✓

**Route:** `/settings/profile`

**Description:** Form for authenticated users to edit their profile information, avatar, and CV.

**Features:**
- Update `displayName` (optional, max 20 chars)
- Update `bio` (optional, max 500 chars)
- Save preferred language for the account
- Upload avatar (PNG/JPG, max 2MB)
- Preview avatar before upload
- Delete existing avatar
- Upload, replace, or delete a CV (`.txt`, `.pdf`, `.doc`, `.docx`; max 5MB)
- Download an uploaded CV from the public profile page
- Permanently delete own account from the Danger Zone after confirmation
- Field validation and error handling

**API Integration:**
- `PATCH /api/users/me` — update displayName and bio
- `POST /api/users/me/avatar` — upload new avatar
- `DELETE /api/users/me/avatar` — remove avatar
- `POST /api/users/me/cv` — upload or replace CV
- `DELETE /api/users/me/cv` — remove CV
- `DELETE /api/users/me` — permanently delete account and clear session

**Implementation files:**
- `src/pages/EditProfile.tsx` — main edit profile page component
- `src/api/users.ts` — API wrapper functions
- `src/api/auth.ts` — account deletion and authentication API functions
- `src/components/` — reusable form components

After successful account deletion, the user is redirected to Login and sees a localized one-time confirmation message.

## Global Articles Feed 🔄

**Route:** `/` (Home)

**Description:** Global articles feed with pagination, search, filtering, and sorting. Accessible to guests; logged-in users see a personalized greeting but the same feed.

**Features:**
- Display paginated articles
- Search articles by title and content
- Filter articles by category (PROGRAMMING, CAREER, STUDY_NOTES, PROJECTS, LIFE, OPINION)
- Sort articles (Newest, Oldest, Most Liked)
- Show author info, article stats (likes, comments)
- Responsive card-based layout

**API Integration:**
- `GET /api/articles` — fetch paginated articles with filtering/sorting

**Query Parameters (via Home component):**
- `page` — pagination
- `limit` — articles per page (max 100)
- `search` — search in title and content
- `category` — filter by category
- `sort` — sort order (newest, oldest, most_liked)

**Implementation files:**
- `src/pages/Home.tsx` — feed page component with filtering UI

## Social, Gamification, and Admin UI

The frontend includes dedicated pages and components for these backend features:

- `GET/POST /api/messages/:userId` — private conversation UI with real-time delivery
- `GET/PATCH /api/notifications` — notification bell, read state, and paginated notification page
- `GET /api/users/leaderboard` — leaderboard page with levels and badges
- `/api/admin/*` — admin dashboard for users and article/comment moderation

## Article Detail and Publishing ✓

**Routes:** `/articles/new`, `/articles/:id`

**Description:** Authenticated users can publish articles, and authors can edit/delete their own articles. Article detail pages include likes and comments.

**Features:**
- Publish article
- View full article details
- Edit/delete own article
- Toggle likes (except own article)
- Create, edit, and delete comments

**API Integration:**
- `POST /api/articles` — create article
- `GET /api/articles/:id` — article detail
- `PATCH /api/articles/:id` — update own article
- `DELETE /api/articles/:id` — delete own article
- `POST /api/articles/:id/like` — toggle like
- `GET /api/articles/:id/comments` — list comments
- `POST /api/articles/:id/comments` — create comment
- `PATCH /api/comments/:id` — update own comment
- `DELETE /api/comments/:id` — delete own comment or moderator removal

**Implementation files:**
- `src/pages/CreateArticle.tsx`
- `src/pages/Article.tsx`
- `src/components/ArticleForm.tsx`
- `src/api/articles.ts`

## Privacy Policy Page ✓

**Route:** `/privacy-policy`

**Description:** Static page with comprehensive privacy policy covering data collection, cookies (JWT), usage, and contact information. Accessible to all users (guests and authenticated).

**Features:**
- Data collection practices
- JWT and cookie usage
- Information usage and sharing
- Data security measures
- User rights and data retention
- Contact information for privacy inquiries

**Implementation files:**
- `src/pages/PrivacyPolicy.tsx` — privacy policy content page
- `src/components/Footer.tsx` — footer component with links (including Privacy Policy)

## Terms of Service Page ✓

**Route:** `/terms-of-service`

**Description:** Static page covering acceptable use, content ownership, and moderation policy. Accessible to all users (guests and authenticated).

**Features:**
- Acceptable use policy (prohibited activities)
- Content ownership (user content vs platform content)
- Moderation policy (review, reporting, suspension)
- User account responsibilities
- Disclaimers and limitation of liability
- Contact information

**Implementation files:**
- `src/pages/TermsOfService.tsx` — terms of service content page

## Footer Component ✓

**Description:** Minimal footer displayed on all pages with static policy and repository links.

**Links:**
- Privacy Policy
- Terms of Service
- GitHub repo (`https://github.com/MariiaKhud/ft_transcendence/tree/main`)

**Implementation files:**
- `src/components/Footer.tsx` — footer component

## Auth Flow

Auth state is managed by Zustand in:

- `src/store/store.ts`
- `src/store/slices/authSlice.ts`

Auth API calls live in:

- `src/api/auth.ts`
- `src/api/users.ts` (profile and profile-articles API wrappers)
- `src/api/articles.ts` (feed/detail/publish/comment/like wrappers)
- `src/api/follows.ts` and `src/api/friends.ts` (social actions on profile)
- `src/api/client.ts` (shared authenticated fetch wrapper)

Current auth actions via `useAuth` hook (`src/hooks/useAuth.ts`):

- `login(credentials)`
- `logout()`
- `restoreSession()`

Current auth UX behavior:

- Session is restored on app load via `/api/auth/me` before protected UI is resolved.
- Logout redirects users to `/login` from profile/edit flows.
- `EditProfile` redirects unauthenticated access to `/login`.
- Login/Register forms show a short password hint: `8-72 chars, use lowercase, uppercase, and digits.`
- Account deletion uses a confirmation dialog and a one-time localized success notice on Login.

## OAuth Login UX

OAuth providers currently supported in the login page:

- Google
- GitHub
- 42

Frontend OAuth behavior:

1. `Login` page calls `GET /api/auth/oauth/providers` and enables only configured providers.
2. Clicking provider button sends browser to `GET /api/auth/oauth/:provider`.
3. Callback results are returned to `/login?code=...` on failure or `/` on success.
4. Login page maps known error codes to user-friendly messages.

Handled OAuth error codes in UI:

- `oauth_provider_denied`
- `oauth_state_missing`
- `oauth_state_invalid`
- `oauth_email_missing`
- `oauth_profile_invalid`
- `oauth_account_conflict`
- `oauth_callback_invalid`
- `oauth_access_token_failed`
- `oauth_redirect_uri_mismatch`
- `oauth_user_not_found`
- `oauth_provider_unavailable`

Resilience behavior:

- OAuth loading state is reset when users return from provider pages (back/forward cache or visibility events), so buttons do not stay stuck.

## OAuth Evaluator Evidence (Frontend)

Use these checks through the HTTPS frontend origin:

1. Providers list available via proxy:

```bash
curl -k -i https://localhost:8443/api/auth/oauth/providers
```

2. OAuth start returns redirect:

```bash
curl -k -i -c /tmp/oauth.cookies https://localhost:8443/api/auth/oauth/github
```

3. Denied consent should result in `code=oauth_provider_denied`.
4. Tampered state should result in `code=oauth_state_invalid`.
5. Reused callback state should result in `code=oauth_state_missing`.

Automated coverage lives in:

- `scripts/test-frontend-flow.sh`

Run:

```bash
npm run test:frontend
```

## Progressive Web App

The frontend is installable through `public/manifest.json` and registers `public/sw.js`
after load. The service worker provides an offline page for navigation requests and
does not cache API responses or user data.

## Design System

The frontend uses a custom Tailwind CSS design system with a shared purple/fuchsia/
emerald palette, consistent typography, spacing, borders, and reusable button variants.

Reusable components include `Button`, `ArticleCard`, `ArticleForm`, `UserAvatar`,
`UserMenu`, `UserSearchBar`, `FriendButton`, `FollowButton`, `NotificationBell`,
`MessageButtonLink`, `XPBar`, `BadgeList`, admin dashboard components, and shared
icons from `src/components/ui/icons.tsx`.

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
