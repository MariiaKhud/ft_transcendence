# Backend

Express + TypeScript API for ft_transcendence.

## What This Service Does

- User authentication (`register`, `login`, `logout`, `me`)
- Cookie-based auth session with JWT and CSRF token checks
- Prisma integration for PostgreSQL
- Centralized error handling with typed API responses

## Run Modes

### A) Recommended: via root Docker setup

From repository root:

```bash
make up
```

Backend is available through Nginx at:

- https://localhost:8443/api

### B) Local backend-only development

From `backend/`:

```bash
npm install
npm run dev
```

Default local URL:

- http://localhost:3000

## Environment Variables

| Name           | Description                           | Example                                                                |
|----------------|---------------------------------------|------------------------------------------------------------------------|
| `NODE_ENV`     | runtime mode                          | `development`                                                          |
| `PORT`         | backend port inside container/process | `3000`                                                                 |
| `DATABASE_URL` | prisma postgres connection string     | `postgresql://transcendence:transcendence@postgres:5432/transcendence` |
| `JWT_SECRET`   | secret for signing auth tokens        | `long-random-value`                                                    |
| `UPLOAD_PATH`  | file upload path                      | `./uploads`                                                            |

## NPM Scripts

```bash
npm run dev         # tsx watch server
npm run build       # compile TypeScript
npm run start       # run compiled build
npm run db:migrate  # prisma migrate dev
npm run db:seed     # prisma db seed
npm run db:reset    # reset prisma database
npm run type-check  # TypeScript type check
npm run test:backend # backend flow bash test script
```

## Auth API

Base path: `/api/auth`

### POST /api/auth/register

Creates a user account.

Request body:

```json
{
  "email": "new.user@example.com",
  "username": "new_user",
  "password": "strongPass123",
  "displayName": "New User"
}
```

Validation:

- `email`: valid format
- `username`: 3-20 chars, letters/numbers/underscore
- `password`: 8-72 chars

Success: `201`

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "new.user@example.com",
    "username": "new_user",
    "displayName": "New User",
    "avatarUrl": null,
    "bio": null,
    "role": "USER",
    "xp": 0,
    "level": 1,
    "isOnline": false,
    "lastSeenAt": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### POST /api/auth/login

Authenticates user and sets cookies:

- `auth_token` (httpOnly)
- `csrf_token` (readable by client, validated on protected state-changing requests)

Request body:

```json
{
  "email": "new.user@example.com",
  "password": "strongPass123"
}
```

Success: `200` with `data` user payload.

### POST /api/auth/logout

Clears auth cookies. Requires valid auth session and CSRF header.

### GET /api/auth/me

Returns currently authenticated user from session cookie.

## Error Response Shape

```json
{
  "success": false,
  "error": "Error message"
}
```

## Quick cURL Examples

Register:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@example.com","username":"new_user","password":"strongPass123"}'
```

Login (save cookies):

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"new.user@example.com","password":"strongPass123"}' \
  -c cookies.txt
```

Me (send cookies):

```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```
