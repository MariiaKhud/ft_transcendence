# Backend API Notes

## Auth Endpoint

### POST /api/auth/register
Create a new account.

### Request Body
```json
{
  "email": "new.user@example.com",
  "username": "new_user",
  "password": "strongPass123",
  "displayName": "New User"
}
```

Required fields:
- `email`
- `username`
- `password`

Optional fields:
- `displayName`

Validation rules:
- `email` must be a valid email format.
- `username` must be 3-20 chars and contain only letters, numbers, or `_`.
- `password` must be 8-72 chars.

Implementation details:
- Password is hashed with `bcrypt` using 10 rounds.
- If email already exists, returns `409`.
- If username already exists, returns `409`.
- On validation failure, returns `400`.
- Returned user object never includes `passwordHash`.

### Success Response (201)
```json
{
  "success": true,
  "data": {
    "id": "4f0c0617-1570-4ac1-a0f8-a00635be3f3f",
    "email": "new.user@example.com",
    "username": "new_user",
    "displayName": "New User",
    "avatarUrl": null,
    "bio": null,
    "role": "USER",
    "xp": 0,
    "level": 1,
    "isOnline": false,
    "lastSeenAt": "2026-06-04T12:00:00.000Z",
    "createdAt": "2026-06-04T12:00:00.000Z",
    "updatedAt": "2026-06-04T12:00:00.000Z"
  }
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed: invalid email format"
}
```

### Conflict Error (409)
```json
{
  "success": false,
  "error": "Email already taken"
}
```

### Example cURL
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.user@example.com",
    "username": "new_user",
    "password": "strongPass123",
    "displayName": "New User"
  }'
```
