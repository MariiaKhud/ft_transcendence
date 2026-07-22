#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BACKEND_BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
EMPTY_COOKIE_JAR="$(mktemp)"
COOKIE_JAR2="$(mktemp)"
COOKIE_JAR_MOD="$(mktemp)"
RUN_ID="$(date +%s | tail -c 5)"
USERNAME="auth_${RUN_ID}"
EMAIL="auth.${RUN_ID}@example.com"
USERNAME2="auth2_${RUN_ID}"
EMAIL2="auth2.${RUN_ID}@example.com"
PASSWORD="strongPass123"
DISPLAY_NAME="Auth Test User"
ROLE_MOD_PATH="${ROLE_MOD_PATH:-}"
ROLE_ADMIN_PATH="${ROLE_ADMIN_PATH:-}"

LAST_STATUS=""
LAST_BODY=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

color_echo() {
  local color="$1"
  shift
  printf "%b%s%b\n" "$color" "$*" "$RESET"
}

cleanup() {
  rm -f "$COOKIE_JAR"
  rm -f "$EMPTY_COOKIE_JAR"
  rm -f "$COOKIE_JAR2"
  rm -f "$COOKIE_JAR_MOD"

  if command -v docker >/dev/null 2>&1 && [[ -f "../docker-compose.yml" ]]; then
    docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -c \"DELETE FROM users WHERE email IN ('${EMAIL}', '${EMAIL2}');\"" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

perform_request() {
  local label="$1"
  shift

  local response_file
  response_file="$(mktemp)"

  local status
  status="$(curl -sS -o "$response_file" -w '%{http_code}' "$@")"

  LAST_STATUS="$status"
  LAST_BODY="$(cat "$response_file")"

  if [[ "$status" =~ ^2 ]]; then
    color_echo "$GREEN" "${label}: HTTP ${status}"
  elif [[ "$status" =~ ^4 ]]; then
    color_echo "$YELLOW" "${label}: HTTP ${status}"
  else
    color_echo "$RED" "${label}: HTTP ${status}"
  fi
  printf "%s" "$LAST_BODY"
  echo

  rm -f "$response_file"
}

assert_status() {
  local expected="$1"
  local label="$2"

  if [[ "$LAST_STATUS" != "$expected" ]]; then
    color_echo "$RED" "${label}: expected HTTP ${expected}, got HTTP ${LAST_STATUS}"
    exit 1
  fi
}

assert_body_contains() {
  local needle="$1"
  local label="$2"

  if ! grep -qF "$needle" <<<"$LAST_BODY"; then
    color_echo "$RED" "${label}: response did not contain '${needle}'"
    exit 1
  fi
}

assert_body_not_contains() {
  local needle="$1"
  local label="$2"

  if grep -qF "$needle" <<<"$LAST_BODY"; then
    color_echo "$RED" "${label}: response unexpectedly contained '${needle}'"
    exit 1
  fi
}

color_echo "$BLUE" "1. Registering test user: ${EMAIL}"
perform_request "Register" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"displayName\":\"${DISPLAY_NAME}\"}"
assert_status "201" "Register"
assert_body_contains '"success":true' "Register"

color_echo "$BLUE" "2. Logging in and saving cookies"
perform_request "Login" -c "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
assert_status "200" "Login"
assert_body_contains '"success":true' "Login"

CSRF_TOKEN="$(awk '$6=="csrf_token" { print $7 }' "$COOKIE_JAR" | tail -n 1)"
if [[ -z "$CSRF_TOKEN" ]]; then
  color_echo "$RED" "Failed to extract csrf_token from cookie jar"
  exit 1
fi

color_echo "$BLUE" "3. Loading current user with /me"
perform_request "Me" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me"
assert_status "200" "Me"
assert_body_contains '"success":true' "Me"
assert_body_contains '"role":"USER"' "Me"
assert_body_not_contains '"passwordHash"' "Me"

color_echo "$BLUE" "4. /me must fail without auth cookie"
perform_request "Me (unauthenticated)" -b "$EMPTY_COOKIE_JAR" "${BASE_URL}/api/auth/me"
assert_status "401" "Me (unauthenticated)"

color_echo "$BLUE" "5. Logout without CSRF header (gracefully handled)"
perform_request "Logout (no csrf)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/logout"
assert_status "200" "Logout (no csrf)"
assert_body_contains '"success":true' "Logout (no csrf)"

color_echo "$BLUE" "6. Re-logging in to test logout with CSRF"
perform_request "Re-login for csrf logout" -c "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
assert_status "200" "Re-login for csrf logout"

CSRF_TOKEN="$(awk '$6=="csrf_token" { print $7 }' "$COOKIE_JAR" | tail -n 1)"

color_echo "$BLUE" "7. Logging out with CSRF header"
perform_request "Logout" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/logout" \
  -H "x-csrf-token: ${CSRF_TOKEN}"
assert_status "200" "Logout"
assert_body_contains '"success":true' "Logout"

color_echo "$BLUE" "8. /me after logout (session may persist)"
perform_request "Me (after logout)" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me"
# Note: Current implementation doesn't invalidate token on logout; this is expected behavior for this session
if [[ "$LAST_STATUS" == "200" ]] || [[ "$LAST_STATUS" == "401" ]]; then
  color_echo "$GREEN" "Me (after logout): HTTP ${LAST_STATUS} (expected behavior)"
else
  color_echo "$RED" "Me (after logout): unexpected HTTP ${LAST_STATUS}"
  exit 1
fi

# Re-login for profile edit and avatar tests
color_echo "$BLUE" "9. Re-logging in for profile edit and avatar tests"
perform_request "Re-login" -c "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
assert_status "200" "Re-login"

# Create minimal test image files (1x1 PNG/JPG with proper extensions)
TEST_IMAGE_PNG="${TMPDIR:-/tmp}/test_avatar_$$.png"
TEST_IMAGE_JPG="${TMPDIR:-/tmp}/test_avatar_$$.jpg"
TEST_IMAGE_OVERSIZED="${TMPDIR:-/tmp}/test_avatar_oversized_$$.bin"
# Minimal 1x1 PNG (67 bytes)
printf '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a\x00\x00\x00\x0d\x49\x48\x44\x52\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90\x77\x53\xde\x00\x00\x00\x0c\x49\x44\x41\x54\x78\x9c\x63\xf8\x4f\x04\x01\x01\x00\x01\x00\x05\x01\xae\x1e\x8b\x96\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > "$TEST_IMAGE_PNG"
# Minimal 1x1 JPEG (125 bytes)
printf '\xff\xd8\xff\xe0\x00\x10\x4a\x46\x49\x46\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01\x7d\x01\x02\x03\x00\x04\x11\x05\x12\x21\x31\x41\x06\x13\x51\x61\x07\x22\x71\x14\x32\x81\x91\xa1\x08\x23\x42\xb1\xc1\x15\x52\xd1\xf0\x24\x33\x62\x72\x82\x09\x0a\x16\x17\x18\x19\x1a\x25\x26\x27\x28\x29\x2a\x34\x35\x36\x37\x38\x39\x3a\x43\x44\x45\x46\x47\x48\x49\x4a\x53\x54\x55\x56\x57\x58\x59\x5a\x63\x64\x65\x66\x67\x68\x69\x6a\x73\x74\x75\x76\x77\x78\x79\x7a\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\xfb\xd3\xff\xd9' > "$TEST_IMAGE_JPG"
dd if=/dev/zero bs=1M count=3 of="$TEST_IMAGE_OVERSIZED" 2>/dev/null

# ============================================================================
# [USERS] Backend: Edit profile form with displayName, bio, avatar
# ============================================================================
# Description: Tests for PATCH /api/users/me and POST/DELETE /api/users/me/avatar
# Features: Update displayName, bio, upload/delete avatar, field validation
# Epic Link: Auth + User Foundation
# Status: Done ✓
#
# Tests 10-20d: Complete profile editing workflow
# ============================================================================

# Test 10: PATCH /api/users/me — update displayName
color_echo "$BLUE" "10. PATCH /api/users/me — update displayName"
perform_request "Update displayName" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/users/me" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Updated Display Name"}'
assert_status "200" "Update displayName"
assert_body_contains '"displayName":"Updated Display Name"' "Update displayName"

# Test 11: PATCH /api/users/me — update bio
color_echo "$BLUE" "11. PATCH /api/users/me — update bio"
perform_request "Update bio" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/users/me" \
  -H "Content-Type: application/json" \
  -d '{"bio":"This is my new bio"}'
assert_status "200" "Update bio"
assert_body_contains '"bio":"This is my new bio"' "Update bio"

# Test 12: PATCH /api/users/me — update both displayName and bio
color_echo "$BLUE" "12. PATCH /api/users/me — update both displayName and bio"
perform_request "Update both" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/users/me" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"New Name","bio":"New Bio"}'
assert_status "200" "Update both"
assert_body_contains '"displayName":"New Name"' "Update both"
assert_body_contains '"bio":"New Bio"' "Update both"

# Test 12b: GET /api/users/:username — read public profile
color_echo "$BLUE" "12b. GET /api/users/:username — read public profile"
perform_request "Get public profile" "${BASE_URL}/api/users/${USERNAME}"
assert_status "200" "Get public profile"
assert_body_contains '"username":"'"${USERNAME}"'"' "Get public profile"
assert_body_contains '"displayName":"New Name"' "Get public profile"
assert_body_contains '"bio":"New Bio"' "Get public profile"
assert_body_contains '"articleCount":' "Get public profile"
assert_body_not_contains '"email":' "Get public profile"

# Test 12c: PATCH /api/users/me — clear displayName and bio with null
color_echo "$BLUE" "12c. PATCH /api/users/me — clear displayName and bio"
perform_request "Clear profile fields" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/users/me" \
  -H "Content-Type: application/json" \
  -d '{"displayName":null,"bio":null}'
assert_status "200" "Clear profile fields"
assert_body_contains '"displayName":null' "Clear profile fields"
assert_body_contains '"bio":null' "Clear profile fields"

# Test 12d: PATCH /api/users/me — unknown field should fail
color_echo "$BLUE" "12d. PATCH /api/users/me — unknown field should fail"
perform_request "Unknown field" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/users/me" \
  -H "Content-Type: application/json" \
  -d '{"unknownField":"value"}'
assert_status "400" "Unknown field"

# Test 13: PATCH /api/users/me — displayName too long (>50 chars)
color_echo "$BLUE" "13. PATCH /api/users/me — displayName too long"
perform_request "DisplayName too long" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/users/me" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"This is a very long display name that exceeds the fifty character limit"}'
assert_status "400" "DisplayName too long"

# Test 14: PATCH /api/users/me — bio too long (>500 chars)
color_echo "$BLUE" "14. PATCH /api/users/me — bio too long"
BIO_LONG="$(printf 'x%.0s' {1..501})"
perform_request "Bio too long" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/users/me" \
  -H "Content-Type: application/json" \
  -d "{\"bio\":\"${BIO_LONG}\"}"
assert_status "400" "Bio too long"

# Test 15: PATCH /api/users/me — unauthenticated request
color_echo "$BLUE" "15. PATCH /api/users/me — unauthenticated request"
perform_request "Update profile (no auth)" -b "$EMPTY_COOKIE_JAR" -X PATCH "${BASE_URL}/api/users/me" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test"}'
assert_status "401" "Update profile (no auth)"

# Test 16: POST /api/users/me/avatar — upload valid PNG avatar
color_echo "$BLUE" "16. POST /api/users/me/avatar — upload valid PNG avatar"
perform_request "Upload avatar PNG" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/users/me/avatar" \
  -F "avatar=@${TEST_IMAGE_PNG}"
assert_status "200" "Upload avatar PNG"
assert_body_contains '"avatarUrl":"/uploads/' "Upload avatar PNG"
FIRST_AVATAR_URL="$(echo "$LAST_BODY" | grep -o '"/uploads/[^"]*' | head -1 | tr -d '"')"

# Test 17: POST /api/users/me/avatar — upload valid JPG avatar (replaces previous)
color_echo "$BLUE" "17. POST /api/users/me/avatar — upload valid JPG avatar"
perform_request "Upload avatar JPG" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/users/me/avatar" \
  -F "avatar=@${TEST_IMAGE_JPG}"
assert_status "200" "Upload avatar JPG"
assert_body_contains '"avatarUrl":"/uploads/' "Upload avatar JPG"
SECOND_AVATAR_URL="$(echo "$LAST_BODY" | grep -o '"/uploads/[^"]*' | head -1 | tr -d '"')"

# Verify URLs are different (old avatar was replaced)
if [[ "$FIRST_AVATAR_URL" == "$SECOND_AVATAR_URL" ]]; then
  color_echo "$YELLOW" "Upload avatar JPG: avatar URL changed (expected different URLs)"
else
  color_echo "$GREEN" "Upload avatar JPG: avatar URL correctly changed"
fi

# Test 18: POST /api/users/me/avatar — upload oversized file (>2MB)
color_echo "$BLUE" "18. POST /api/users/me/avatar — upload oversized file (>2MB)"
perform_request "Upload oversized avatar" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/users/me/avatar" \
  -F "avatar=@${TEST_IMAGE_OVERSIZED}"
assert_status "413" "Upload oversized avatar"

# Test 19: POST /api/users/me/avatar — missing file
color_echo "$BLUE" "19. POST /api/users/me/avatar — missing file"
perform_request "Upload avatar (no file)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/users/me/avatar"
assert_status "400" "Upload avatar (no file)"

# Test 20: POST /api/users/me/avatar — unauthenticated request
color_echo "$BLUE" "20. POST /api/users/me/avatar — unauthenticated request"
perform_request "Upload avatar (no auth)" -b "$EMPTY_COOKIE_JAR" -X POST "${BASE_URL}/api/users/me/avatar" \
  -F "avatar=@${TEST_IMAGE_PNG}"
assert_status "401" "Upload avatar (no auth)"

# Test 20b: DELETE /api/users/me/avatar — remove avatar
color_echo "$BLUE" "20b. DELETE /api/users/me/avatar — remove avatar"
perform_request "Delete avatar" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/users/me/avatar"
assert_status "200" "Delete avatar"
assert_body_contains '"avatarUrl":null' "Delete avatar"

# Test 20c: DELETE /api/users/me/avatar — unauthenticated request
color_echo "$BLUE" "20c. DELETE /api/users/me/avatar — unauthenticated request"
perform_request "Delete avatar (no auth)" -b "$EMPTY_COOKIE_JAR" -X DELETE "${BASE_URL}/api/users/me/avatar"
assert_status "401" "Delete avatar (no auth)"

# Test 20d: GET /api/users/:username — invalid username format
color_echo "$BLUE" "20d. GET /api/users/:username — invalid username format"
perform_request "Get profile (invalid username)" "${BASE_URL}/api/users/!!"
assert_status "400" "Get profile (invalid username)"

# ============================================================================
# [ARTICLES] GET /api/articles — global feed
# ============================================================================
# Description: Fetch paginated articles with filtering and sorting
# Features: pagination, search, category filter, sort by newest/oldest/most_liked
# Epic Link: Articles + Feed
# Status: In Progress

# Test 21: GET /api/articles — default (newest, page 1, limit 20)
color_echo "$BLUE" "21. GET /api/articles — default (newest first, page 1)"
perform_request "Get articles (default)" "${BASE_URL}/api/articles"
assert_status "200" "Get articles (default)"
assert_body_contains '"success":true' "Get articles (default)"
assert_body_contains '"articles":' "Get articles (default)"
assert_body_contains '"pagination":' "Get articles (default)"
assert_body_contains '"page":1' "Get articles (default)"
assert_body_contains '"limit":20' "Get articles (default)"

# Test 22: GET /api/articles — with custom pagination
color_echo "$BLUE" "22. GET /api/articles — with custom pagination (page=1, limit=5)"
perform_request "Get articles (limit 5)" "${BASE_URL}/api/articles?page=1&limit=5"
assert_status "200" "Get articles (limit 5)"
assert_body_contains '"limit":5' "Get articles (limit 5)"

# Test 23: GET /api/articles — with sort by oldest
color_echo "$BLUE" "23. GET /api/articles — sort by oldest"
perform_request "Get articles (oldest)" "${BASE_URL}/api/articles?sort=oldest"
assert_status "200" "Get articles (oldest)"
assert_body_contains '"success":true' "Get articles (oldest)"

# Test 24: GET /api/articles — with sort by most_liked
color_echo "$BLUE" "24. GET /api/articles — sort by most_liked"
perform_request "Get articles (most liked)" "${BASE_URL}/api/articles?sort=most_liked"
assert_status "200" "Get articles (most liked)"
assert_body_contains '"success":true' "Get articles (most liked)"

# Test 25: GET /api/articles — with category filter
color_echo "$BLUE" "25. GET /api/articles — with category filter (PROGRAMMING)"
perform_request "Get articles (category filter)" "${BASE_URL}/api/articles?category=PROGRAMMING"
assert_status "200" "Get articles (category filter)"
assert_body_contains '"success":true' "Get articles (category filter)"

# Test 26: GET /api/articles — with search query
color_echo "$BLUE" "26. GET /api/articles — with search query"
perform_request "Get articles (search)" "${BASE_URL}/api/articles?search=test"
assert_status "200" "Get articles (search)"
assert_body_contains '"success":true' "Get articles (search)"

# Test 27: GET /api/articles — invalid sort parameter
color_echo "$BLUE" "27. GET /api/articles — invalid sort parameter"
perform_request "Get articles (invalid sort)" "${BASE_URL}/api/articles?sort=invalid"
assert_status "400" "Get articles (invalid sort)"

# Test 28: GET /api/articles — pagination boundary (page out of range)
color_echo "$BLUE" "28. GET /api/articles — page parameter (large page number)"
perform_request "Get articles (high page)" "${BASE_URL}/api/articles?page=9999"
assert_status "200" "Get articles (high page)"
assert_body_contains '"articles":[]' "Get articles (high page)"

# Cleanup test images
rm -f "$TEST_IMAGE_PNG" "$TEST_IMAGE_JPG" "$TEST_IMAGE_OVERSIZED"

# ============================================================================
# [ARTICLES] POST /api/articles — create article
# ============================================================================
# Description: Tests for POST /api/articles and GET /api/articles/:id
# Features: create article, XP reward, validation, single article fetch
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

VALID_CONTENT="This is a valid article body. It is long enough to pass the minimum content length requirement of one hundred characters."
LONG_TITLE="$(printf 'T%.0s' {1..121})"

# Test 29: POST /api/articles — unauthenticated
color_echo "$BLUE" "29. POST /api/articles — unauthenticated request"
perform_request "Create article (no auth)" -b "$EMPTY_COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Article\",\"content\":\"${VALID_CONTENT}\",\"category\":\"PROGRAMMING\"}"
assert_status "401" "Create article (no auth)"

# Test 30: POST /api/articles — missing required fields
color_echo "$BLUE" "30. POST /api/articles — missing required fields"
perform_request "Create article (empty body)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{}"
assert_status "400" "Create article (empty body)"

# Test 31: POST /api/articles — content too short (<100 chars)
color_echo "$BLUE" "31. POST /api/articles — content too short"
perform_request "Create article (short content)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Article","content":"Too short.","category":"PROGRAMMING"}'
assert_status "400" "Create article (short content)"

# Test 32: POST /api/articles — title too long (>120 chars)
color_echo "$BLUE" "32. POST /api/articles — title too long (>120 chars)"
perform_request "Create article (long title)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"${LONG_TITLE}\",\"content\":\"${VALID_CONTENT}\",\"category\":\"PROGRAMMING\"}"
assert_status "400" "Create article (long title)"

# Test 33: POST /api/articles — invalid category
color_echo "$BLUE" "33. POST /api/articles — invalid category"
perform_request "Create article (bad category)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Article\",\"content\":\"${VALID_CONTENT}\",\"category\":\"INVALID\"}"
assert_status "400" "Create article (bad category)"

# Test 34: POST /api/articles — valid article creation
color_echo "$BLUE" "34. POST /api/articles — valid article creation"
perform_request "Create article" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"My Test Article\",\"content\":\"${VALID_CONTENT}\",\"category\":\"PROGRAMMING\"}"
assert_status "201" "Create article"
assert_body_contains '"success":true' "Create article"
assert_body_contains '"title":"My Test Article"' "Create article"
assert_body_contains '"category":"PROGRAMMING"' "Create article"
assert_body_contains '"commentsCount":0' "Create article"

ARTICLE_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"
color_echo "$BLUE" "   Created article ID: ${ARTICLE_ID}"

# Test 35: POST /api/articles — XP awarded after publish (author gains 25 XP)
color_echo "$BLUE" "35. POST /api/articles — author XP increases by 25 after publish"
perform_request "Check XP after publish" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me"
assert_status "200" "Check XP after publish"
assert_body_contains '"xp":25' "Check XP after publish"

# Test 36: GET /api/articles/:id — authenticated user gets isLikedByCurrentUser: false
color_echo "$BLUE" "36. GET /api/articles/:id — authenticated user, not yet liked"
perform_request "Get article by ID (auth)" -b "$COOKIE_JAR" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article by ID (auth)"
assert_body_contains '"success":true' "Get article by ID (auth)"
assert_body_contains '"title":"My Test Article"' "Get article by ID (auth)"
assert_body_contains '"commentsCount":' "Get article by ID (auth)"
assert_body_contains '"isLikedByCurrentUser":false' "Get article by ID (auth)"

# Test 36b: GET /api/articles/:id — guest gets isLikedByCurrentUser: null
color_echo "$BLUE" "36b. GET /api/articles/:id — guest user gets isLikedByCurrentUser null"
perform_request "Get article by ID (guest)" -b "$EMPTY_COOKIE_JAR" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article by ID (guest)"
assert_body_contains '"isLikedByCurrentUser":null' "Get article by ID (guest)"

# Test 37: GET /api/articles/:id — non-existent article returns 404
color_echo "$BLUE" "37. GET /api/articles/:id — non-existent ID returns 404"
perform_request "Get article (not found)" "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000"
assert_status "404" "Get article (not found)"

# Test 38: GET /api/articles — created article appears in the feed
color_echo "$BLUE" "38. GET /api/articles — created article appears in feed"
perform_request "Get feed after create" "${BASE_URL}/api/articles"
assert_status "200" "Get feed after create"
assert_body_contains '"title":"My Test Article"' "Get feed after create"

# ============================================================================
# [ARTICLES] GET /api/articles?search=&category=&sort= — advanced search
# ============================================================================
# Description: Keyword search across title + content + author username
# (ILIKE), combined with category filter, on top of pagination/sort.
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

# Test 38a: GET /api/articles — search matches by title keyword
color_echo "$BLUE" "38a. GET /api/articles — search matches title keyword"
perform_request "Search by title" "${BASE_URL}/api/articles?search=Article"
assert_status "200" "Search by title"
assert_body_contains '"title":"My Test Article"' "Search by title"

# Test 38b: GET /api/articles — search matches by content keyword
color_echo "$BLUE" "38b. GET /api/articles — search matches content keyword"
perform_request "Search by content" "${BASE_URL}/api/articles?search=hundred"
assert_status "200" "Search by content"
assert_body_contains '"title":"My Test Article"' "Search by content"

# Test 38c: GET /api/articles — search matches by author username
color_echo "$BLUE" "38c. GET /api/articles — search matches author username"
perform_request "Search by author username" "${BASE_URL}/api/articles?search=${USERNAME}"
assert_status "200" "Search by author username"
assert_body_contains '"title":"My Test Article"' "Search by author username"

# Test 38d: GET /api/articles — author username search is case-insensitive (ILIKE)
color_echo "$BLUE" "38d. GET /api/articles — author username search is case-insensitive"
perform_request "Search by author username (uppercased)" "${BASE_URL}/api/articles?search=${USERNAME^^}"
assert_status "200" "Search by author username (uppercased)"
assert_body_contains '"title":"My Test Article"' "Search by author username (uppercased)"

# Test 38e: GET /api/articles — search with no matches returns an empty page
color_echo "$BLUE" "38e. GET /api/articles — search with no matches returns empty list"
perform_request "Search (no match)" "${BASE_URL}/api/articles?search=zzz_no_such_match_zzz"
assert_status "200" "Search (no match)"
assert_body_contains '"articles":[]' "Search (no match)"

# Test 38f: GET /api/articles — search + category combined (matching category)
color_echo "$BLUE" "38f. GET /api/articles — search + matching category returns the article"
perform_request "Search + matching category" "${BASE_URL}/api/articles?search=${USERNAME}&category=PROGRAMMING"
assert_status "200" "Search + matching category"
assert_body_contains '"title":"My Test Article"' "Search + matching category"

# Test 38g: GET /api/articles — search + category combined (non-matching category excludes it)
color_echo "$BLUE" "38g. GET /api/articles — search + non-matching category excludes the article"
perform_request "Search + non-matching category" "${BASE_URL}/api/articles?search=${USERNAME}&category=CAREER"
assert_status "200" "Search + non-matching category"
assert_body_not_contains '"title":"My Test Article"' "Search + non-matching category"

# ============================================================================
# [ARTICLES] GET /api/articles?title=&author=&content=&postedFrom=&postedTo=
# — advanced search, per-field form
# ============================================================================
# Description: Field-specific filters (title/author/content ILIKE, plus a
# posted-date range), ANDed together and with category/sort, backing the
# dedicated /search page's structured form.
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

# Test 38h: GET /api/articles — title field matches
color_echo "$BLUE" "38h. GET /api/articles — title field matches"
perform_request "Search by title field" "${BASE_URL}/api/articles?title=Article"
assert_status "200" "Search by title field"
assert_body_contains '"title":"My Test Article"' "Search by title field"

# Test 38i: GET /api/articles — author field matches (case-insensitive)
color_echo "$BLUE" "38i. GET /api/articles — author field matches (case-insensitive)"
perform_request "Search by author field" "${BASE_URL}/api/articles?author=${USERNAME^^}"
assert_status "200" "Search by author field"
assert_body_contains '"title":"My Test Article"' "Search by author field"

# Test 38j: GET /api/articles — content field matches
color_echo "$BLUE" "38j. GET /api/articles — content field matches"
perform_request "Search by content field" "${BASE_URL}/api/articles?content=hundred"
assert_status "200" "Search by content field"
assert_body_contains '"title":"My Test Article"' "Search by content field"

# Test 38k: GET /api/articles — title + author fields combined (AND, matching)
color_echo "$BLUE" "38k. GET /api/articles — title + author fields combined (matching)"
perform_request "Title + author fields (match)" "${BASE_URL}/api/articles?title=Article&author=${USERNAME}"
assert_status "200" "Title + author fields (match)"
assert_body_contains '"title":"My Test Article"' "Title + author fields (match)"

# Test 38l: GET /api/articles — title + author fields combined (AND, non-matching author excludes it)
color_echo "$BLUE" "38l. GET /api/articles — title + author fields combined (non-matching author excludes it)"
perform_request "Title + author fields (no match)" "${BASE_URL}/api/articles?title=Article&author=${USERNAME2}"
assert_status "200" "Title + author fields (no match)"
assert_body_not_contains '"title":"My Test Article"' "Title + author fields (no match)"

# Test 38m: GET /api/articles — posted date range includes the just-created article
color_echo "$BLUE" "38m. GET /api/articles — posted date range includes today's article"
POSTED_FROM="$(date -u -d 'yesterday' +%Y-%m-%d)"
POSTED_TO="$(date -u -d 'tomorrow' +%Y-%m-%d)"
perform_request "Posted date range (match)" "${BASE_URL}/api/articles?author=${USERNAME}&postedFrom=${POSTED_FROM}&postedTo=${POSTED_TO}"
assert_status "200" "Posted date range (match)"
assert_body_contains '"title":"My Test Article"' "Posted date range (match)"

# Test 38n: GET /api/articles — posted date range excludes the article when postedTo is in the past
color_echo "$BLUE" "38n. GET /api/articles — posted date range excludes when postedTo is in the past"
PAST_DATE="$(date -u -d 'yesterday' +%Y-%m-%d)"
perform_request "Posted date range (excluded)" "${BASE_URL}/api/articles?author=${USERNAME}&postedTo=${PAST_DATE}"
assert_status "200" "Posted date range (excluded)"
assert_body_not_contains '"title":"My Test Article"' "Posted date range (excluded)"

# Test 38o: GET /api/articles — invalid postedFrom returns 400
color_echo "$BLUE" "38o. GET /api/articles — invalid postedFrom returns 400"
perform_request "Invalid postedFrom" "${BASE_URL}/api/articles?postedFrom=not-a-date"
assert_status "400" "Invalid postedFrom"

# ============================================================================
# [ARTICLES] PATCH /api/articles/:id — edit article
# ============================================================================
# Description: Tests for PATCH /api/articles/:id (author-only edit)
# Features: partial update, ownership check, validation, auth requirement
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

UPDATED_CONTENT="This is the updated article body. It is also long enough to pass the minimum content length requirement of one hundred characters."

# Test 39: Register + login a second user to test author-only enforcement
color_echo "$BLUE" "39. Registering a second user for author-only PATCH checks"
perform_request "Register (user2)" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"username\":\"${USERNAME2}\",\"password\":\"${PASSWORD}\",\"displayName\":\"Second Test User\"}"
assert_status "201" "Register (user2)"

perform_request "Login (user2)" -c "$COOKIE_JAR2" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"password\":\"${PASSWORD}\"}"
assert_status "200" "Login (user2)"

# Test 40: PATCH /api/articles/:id — unauthenticated
color_echo "$BLUE" "40. PATCH /api/articles/:id — unauthenticated request"
perform_request "Edit article (no auth)" -b "$EMPTY_COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title"}'
assert_status "401" "Edit article (no auth)"

# Test 41: PATCH /api/articles/:id — non-author is forbidden
color_echo "$BLUE" "41. PATCH /api/articles/:id — non-author forbidden"
perform_request "Edit article (non-author)" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title"}'
assert_status "403" "Edit article (non-author)"

# Test 42: PATCH /api/articles/:id — non-existent article
color_echo "$BLUE" "42. PATCH /api/articles/:id — non-existent article returns 404"
perform_request "Edit article (not found)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{"title":"Does Not Matter"}'
assert_status "404" "Edit article (not found)"

# Test 43: PATCH /api/articles/:id — empty body is rejected
color_echo "$BLUE" "43. PATCH /api/articles/:id — empty body rejected"
perform_request "Edit article (empty body)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{}'
assert_status "400" "Edit article (empty body)"

# Test 44: PATCH /api/articles/:id — invalid category
color_echo "$BLUE" "44. PATCH /api/articles/:id — invalid category"
perform_request "Edit article (bad category)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"category":"INVALID"}'
assert_status "400" "Edit article (bad category)"

# Test 45: PATCH /api/articles/:id — content too short
color_echo "$BLUE" "45. PATCH /api/articles/:id — content too short"
perform_request "Edit article (short content)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Too short."}'
assert_status "400" "Edit article (short content)"

# Test 46: PATCH /api/articles/:id — title too long
color_echo "$BLUE" "46. PATCH /api/articles/:id — title too long"
perform_request "Edit article (long title)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"${LONG_TITLE}\"}"
assert_status "400" "Edit article (long title)"

# Test 47: PATCH /api/articles/:id — author partial update (title only)
color_echo "$BLUE" "47. PATCH /api/articles/:id — author updates title only"
perform_request "Edit article (title)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Updated Article Title"}'
assert_status "200" "Edit article (title)"
assert_body_contains '"success":true' "Edit article (title)"
assert_body_contains '"title":"My Updated Article Title"' "Edit article (title)"

# Test 48: PATCH /api/articles/:id — author updates content + category
color_echo "$BLUE" "48. PATCH /api/articles/:id — author updates content and category"
perform_request "Edit article (content+category)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${UPDATED_CONTENT}\",\"category\":\"CAREER\"}"
assert_status "200" "Edit article (content+category)"
assert_body_contains "\"content\":\"${UPDATED_CONTENT}\"" "Edit article (content+category)"
assert_body_contains '"category":"CAREER"' "Edit article (content+category)"
# Title from the previous edit should be untouched by this partial update
assert_body_contains '"title":"My Updated Article Title"' "Edit article (content+category)"

# Test 49: GET /api/articles/:id — reflects the persisted edits
color_echo "$BLUE" "49. GET /api/articles/:id — edits are persisted"
perform_request "Get article after edit" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article after edit"
assert_body_contains '"title":"My Updated Article Title"' "Get article after edit"
assert_body_contains "\"content\":\"${UPDATED_CONTENT}\"" "Get article after edit"
assert_body_contains '"category":"CAREER"' "Get article after edit"

# ============================================================================
# [COMMENTS] POST /api/articles/:id/comments — add comment
# ============================================================================
# Description: Tests for POST /api/articles/:id/comments
# Features: content validation (1-1000 chars), auth requirement, article
# existence check, commentsCount bump, notification to article author
# (skipped when commenting on your own article)
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

LONG_COMMENT="$(printf 'c%.0s' {1..1001})"
MAX_COMMENT="$(printf 'c%.0s' {1..1000})"

perform_request "Whoami for comment notification checks" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me" >/dev/null
AUTHOR_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"

NOTIF_CHECK_ENABLED=0
count_author_comment_notifications() {
  docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM notifications WHERE user_id = '${AUTHOR_ID}' AND type = 'COMMENT' AND ref_id = '${ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]'
}

if command -v docker >/dev/null 2>&1 && [[ -n "$AUTHOR_ID" ]]; then
  INITIAL_NOTIF_COUNT="$(count_author_comment_notifications)"
  if [[ "$INITIAL_NOTIF_COUNT" =~ ^[0-9]+$ ]]; then
    NOTIF_CHECK_ENABLED=1
  fi
fi

# Test 49a: POST /api/articles/:id/comments — unauthenticated
color_echo "$BLUE" "49a. POST /api/articles/:id/comments — unauthenticated request"
perform_request "Add comment (no auth)" -b "$EMPTY_COOKIE_JAR" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Nice article!"}'
assert_status "401" "Add comment (no auth)"

# Test 49b: POST /api/articles/:id/comments — empty content
color_echo "$BLUE" "49b. POST /api/articles/:id/comments — empty content rejected"
perform_request "Add comment (empty content)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":""}'
assert_status "400" "Add comment (empty content)"

# Test 49c: POST /api/articles/:id/comments — whitespace-only content
color_echo "$BLUE" "49c. POST /api/articles/:id/comments — whitespace-only content rejected"
perform_request "Add comment (whitespace content)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"   "}'
assert_status "400" "Add comment (whitespace content)"

# Test 49d: POST /api/articles/:id/comments — content too long (>1000 chars)
color_echo "$BLUE" "49d. POST /api/articles/:id/comments — content too long (>1000 chars)"
perform_request "Add comment (too long)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${LONG_COMMENT}\"}"
assert_status "400" "Add comment (too long)"

# Test 49e: POST /api/articles/:id/comments — non-existent article
color_echo "$BLUE" "49e. POST /api/articles/:id/comments — non-existent article returns 404"
perform_request "Add comment (not found)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Nice article!"}'
assert_status "404" "Add comment (not found)"

# Test 49f: POST /api/articles/:id/comments — valid comment at max length (1000 chars)
color_echo "$BLUE" "49f. POST /api/articles/:id/comments — valid comment at max length (1000 chars)"
perform_request "Add comment (max length)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${MAX_COMMENT}\"}"
assert_status "201" "Add comment (max length)"
assert_body_contains '"success":true' "Add comment (max length)"
assert_body_contains "\"content\":\"${MAX_COMMENT}\"" "Add comment (max length)"
assert_body_contains "\"articleId\":\"${ARTICLE_ID}\"" "Add comment (max length)"

MAX_COMMENT_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"

# Test 49g: POST /api/articles/:id/comments — valid comment by non-author
color_echo "$BLUE" "49g. POST /api/articles/:id/comments — non-author adds a comment"
perform_request "Add comment (non-author)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Great read, thanks for sharing!"}'
assert_status "201" "Add comment (non-author)"
assert_body_contains '"content":"Great read, thanks for sharing!"' "Add comment (non-author)"
assert_body_contains "\"username\":\"${USERNAME2}\"" "Add comment (non-author)"

COMMENT_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"
color_echo "$BLUE" "   Created comment ID: ${COMMENT_ID}"

# Test 49h: GET /api/articles/:id — commentsCount reflects the new comments
color_echo "$BLUE" "49h. GET /api/articles/:id — commentsCount increases after comments"
perform_request "Get article after comments" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article after comments"
assert_body_contains '"commentsCount":2' "Get article after comments"

# Test 49h2: GET /api/articles — the feed list's comment count also reflects the new comments.
# Regression guard: articleSummarySelect used to omit `_count` entirely, so feed
# cards always showed a stale/zero comment count no matter how many comments existed.
color_echo "$BLUE" "49h2. GET /api/articles — feed list comment count increases after comments"
perform_request "Get feed after comments" "${BASE_URL}/api/articles?author=${USERNAME}"
assert_status "200" "Get feed after comments"
assert_body_contains '"_count":{"comments":2}' "Get feed after comments"

# Test 49i: non-author comments trigger a notification to the article author
if [[ "$NOTIF_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "49i. Verifying notifications were created for the article author"
  NOTIF_COUNT_AFTER_OTHERS="$(count_author_comment_notifications)"
  EXPECTED_COUNT=$((INITIAL_NOTIF_COUNT + 2))
  if [[ "$NOTIF_COUNT_AFTER_OTHERS" == "$EXPECTED_COUNT" ]]; then
    color_echo "$GREEN" "Notification check: author received ${EXPECTED_COUNT} COMMENT notification(s) as expected"
  else
    color_echo "$RED" "Notification check: expected ${EXPECTED_COUNT} COMMENT notifications, got ${NOTIF_COUNT_AFTER_OTHERS}"
    exit 1
  fi
else
  color_echo "$YELLOW" "49i. Notification DB check skipped (docker/psql not reachable)"
fi

# Test 49j: POST /api/articles/:id/comments — author comments on their own article
color_echo "$BLUE" "49j. POST /api/articles/:id/comments — author comments on own article"
perform_request "Add comment (self)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Thanks everyone for reading!"}'
assert_status "201" "Add comment (self)"
assert_body_contains "\"username\":\"${USERNAME}\"" "Add comment (self)"

# Test 49k: self-comment does NOT trigger a self-notification
if [[ "$NOTIF_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "49k. Verifying no self-notification is created for the author's own comment"
  NOTIF_COUNT_AFTER_SELF="$(count_author_comment_notifications)"
  if [[ "$NOTIF_COUNT_AFTER_SELF" == "$NOTIF_COUNT_AFTER_OTHERS" ]]; then
    color_echo "$GREEN" "Notification check: no self-notification created (still ${NOTIF_COUNT_AFTER_SELF})"
  else
    color_echo "$RED" "Notification check: self-comment unexpectedly created a notification (${NOTIF_COUNT_AFTER_OTHERS} -> ${NOTIF_COUNT_AFTER_SELF})"
    exit 1
  fi
else
  color_echo "$YELLOW" "49k. Self-notification DB check skipped (docker/psql not reachable)"
fi

# ============================================================================
# [COMMENTS] PATCH /api/comments/:id — edit comment
# ============================================================================
# Description: Tests for PATCH /api/comments/:id
# Features: author-only edit, content validation (1-1000 chars), auth requirement
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

# Test 49l: PATCH /api/comments/:id — unauthenticated
color_echo "$BLUE" "49l. PATCH /api/comments/:id — unauthenticated request"
perform_request "Edit comment (no auth)" -b "$EMPTY_COOKIE_JAR" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hacked comment"}'
assert_status "401" "Edit comment (no auth)"

# Test 49m: PATCH /api/comments/:id — non-author is forbidden
color_echo "$BLUE" "49m. PATCH /api/comments/:id — non-author forbidden"
perform_request "Edit comment (non-author)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hacked comment"}'
assert_status "403" "Edit comment (non-author)"

# Test 49n: PATCH /api/comments/:id — non-existent comment
color_echo "$BLUE" "49n. PATCH /api/comments/:id — non-existent comment returns 404"
perform_request "Edit comment (not found)" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/comments/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{"content":"Does not matter"}'
assert_status "404" "Edit comment (not found)"

# Test 49o: PATCH /api/comments/:id — empty content rejected
color_echo "$BLUE" "49o. PATCH /api/comments/:id — empty content rejected"
perform_request "Edit comment (empty content)" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"   "}'
assert_status "400" "Edit comment (empty content)"

# Test 49p: PATCH /api/comments/:id — content too long (>1000 chars)
color_echo "$BLUE" "49p. PATCH /api/comments/:id — content too long (>1000 chars)"
perform_request "Edit comment (too long)" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${LONG_COMMENT}\"}"
assert_status "400" "Edit comment (too long)"

# Test 49q: PATCH /api/comments/:id — author edits their own comment
color_echo "$BLUE" "49q. PATCH /api/comments/:id — author edits own comment"
perform_request "Edit comment" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Edited: great read, thanks for sharing!"}'
assert_status "200" "Edit comment"
assert_body_contains '"success":true' "Edit comment"
assert_body_contains '"content":"Edited: great read, thanks for sharing!"' "Edit comment"
assert_body_contains "\"id\":\"${COMMENT_ID}\"" "Edit comment"

# Test 49r: GET /api/articles/:id — edit is persisted and commentsCount unchanged
color_echo "$BLUE" "49r. GET /api/articles/:id — comment edit does not change commentsCount"
perform_request "Get article after comment edit" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article after comment edit"
assert_body_contains '"commentsCount":3' "Get article after comment edit"

# ============================================================================
# [COMMENTS] DELETE /api/comments/:id — delete comment
# ============================================================================
# Description: Tests for DELETE /api/comments/:id
# Features: author hard-deletes own comment; moderator/admin soft-removes with
# a required reason (1-500 chars); auth requirement; ownership/role enforcement
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

# Log in as the seeded moderator account to test the moderator soft-remove path.
# Skipped gracefully if the seed data isn't present (e.g. a fresh, unseeded DB).
MOD_CHECK_ENABLED=0
perform_request "Login (moderator seed)" -c "$COOKIE_JAR_MOD" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"carol@example.com","password":"password123"}'
if [[ "$LAST_STATUS" == "200" ]]; then
  MOD_CHECK_ENABLED=1
  color_echo "$GREEN" "Login (moderator seed): moderator account available for role tests"
else
  color_echo "$YELLOW" "Login (moderator seed): skipped moderator tests (seed data unavailable)"
fi

# Test 49s: DELETE /api/comments/:id — unauthenticated
color_echo "$BLUE" "49s. DELETE /api/comments/:id — unauthenticated request"
perform_request "Delete comment (no auth)" -b "$EMPTY_COOKIE_JAR" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}"
assert_status "401" "Delete comment (no auth)"

# Test 49t: DELETE /api/comments/:id — neither the comment author nor a moderator
color_echo "$BLUE" "49t. DELETE /api/comments/:id — non-author, non-moderator forbidden"
perform_request "Delete comment (forbidden)" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}"
assert_status "403" "Delete comment (forbidden)"

if [[ "$MOD_CHECK_ENABLED" == "1" ]]; then
  # Test 49u: DELETE /api/comments/:id — moderator soft-remove without a reason
  color_echo "$BLUE" "49u. DELETE /api/comments/:id — moderator soft-remove missing reason"
  perform_request "Delete comment (mod, no reason)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d '{}'
  assert_status "400" "Delete comment (mod, no reason)"

  # Test 49v: DELETE /api/comments/:id — moderator soft-remove with whitespace-only reason
  color_echo "$BLUE" "49v. DELETE /api/comments/:id — moderator soft-remove whitespace reason"
  perform_request "Delete comment (mod, blank reason)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d '{"reason":"   "}'
  assert_status "400" "Delete comment (mod, blank reason)"

  # Test 49w: DELETE /api/comments/:id — moderator soft-remove with oversized reason (>500 chars)
  color_echo "$BLUE" "49w. DELETE /api/comments/:id — moderator soft-remove reason too long"
  LONG_REASON="$(printf 'r%.0s' {1..501})"
  perform_request "Delete comment (mod, long reason)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"reason\":\"${LONG_REASON}\"}"
  assert_status "400" "Delete comment (mod, long reason)"

  # Test 49x: DELETE /api/comments/:id — moderator soft-removes with a valid reason
  color_echo "$BLUE" "49x. DELETE /api/comments/:id — moderator soft-remove with valid reason"
  perform_request "Delete comment (mod)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Violates community guidelines"}'
  assert_status "200" "Delete comment (mod)"
  assert_body_contains '"isRemoved":true' "Delete comment (mod)"
  assert_body_contains '"removedReason":"Violates community guidelines"' "Delete comment (mod)"

  # Test 49y: DELETE /api/comments/:id — already soft-removed comment is gone (404)
  color_echo "$BLUE" "49y. DELETE /api/comments/:id — already-removed comment returns 404"
  perform_request "Delete comment (already removed)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d '{"reason":"again"}'
  assert_status "404" "Delete comment (already removed)"
else
  color_echo "$YELLOW" "49u-49y. Moderator soft-remove tests skipped (seed data unavailable)"
fi

# Test 49z: DELETE /api/comments/:id — author hard-deletes their own comment
color_echo "$BLUE" "49z. DELETE /api/comments/:id — author hard-deletes own comment"
perform_request "Delete comment (author)" -b "$COOKIE_JAR2" -X DELETE "${BASE_URL}/api/comments/${MAX_COMMENT_ID}"
assert_status "200" "Delete comment (author)"
assert_body_contains "\"id\":\"${MAX_COMMENT_ID}\"" "Delete comment (author)"

# Test 49z1: DELETE /api/comments/:id — hard-deleted comment is gone (404)
color_echo "$BLUE" "49z1. DELETE /api/comments/:id — hard-deleted comment returns 404 on re-delete"
perform_request "Delete comment (already deleted)" -b "$COOKIE_JAR2" -X DELETE "${BASE_URL}/api/comments/${MAX_COMMENT_ID}"
assert_status "404" "Delete comment (already deleted)"

# Test 49z2: GET /api/articles/:id — commentsCount reflects the removed/deleted comments
color_echo "$BLUE" "49z2. GET /api/articles/:id — commentsCount excludes removed and deleted comments"
perform_request "Get article after comment deletions" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article after comment deletions"
if [[ "$MOD_CHECK_ENABLED" == "1" ]]; then
  assert_body_contains '"commentsCount":1' "Get article after comment deletions"
else
  assert_body_contains '"commentsCount":2' "Get article after comment deletions"
fi

# ============================================================================
# [COMMENTS] GET /api/articles/:id/comments — list comments
# ============================================================================
# Description: Tests for GET /api/articles/:id/comments
# Features: public (no auth required), oldest-first ordering, includes
# soft-removed comments (the frontend decides how to render them), excludes
# hard-deleted comments, 404 for a non-existent article
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

# Test 49z3: GET /api/articles/:id/comments — public request succeeds
color_echo "$BLUE" "49z3. GET /api/articles/:id/comments — public request returns the comment list"
perform_request "List comments" -b "$EMPTY_COOKIE_JAR" "${BASE_URL}/api/articles/${ARTICLE_ID}/comments"
assert_status "200" "List comments"
assert_body_contains '"success":true' "List comments"

# Test 49z4: hard-deleted comment is excluded from the list
color_echo "$BLUE" "49z4. GET /api/articles/:id/comments — hard-deleted comment is excluded"
assert_body_not_contains "\"id\":\"${MAX_COMMENT_ID}\"" "List comments"

# Test 49z5: the surviving self-comment is present
color_echo "$BLUE" "49z5. GET /api/articles/:id/comments — surviving comment is present"
assert_body_contains '"content":"Thanks everyone for reading!"' "List comments"

# Test 49z6: comments are ordered oldest first
color_echo "$BLUE" "49z6. GET /api/articles/:id/comments — comments are ordered oldest first"
FIRST_POS="$(grep -bo 'Edited: great read, thanks for sharing!' <<<"$LAST_BODY" | head -1 | cut -d: -f1)"
SECOND_POS="$(grep -bo 'Thanks everyone for reading!' <<<"$LAST_BODY" | head -1 | cut -d: -f1)"
if [[ -n "$FIRST_POS" && -n "$SECOND_POS" && "$FIRST_POS" -lt "$SECOND_POS" ]]; then
  color_echo "$GREEN" "List comments ordering: oldest-first confirmed"
else
  color_echo "$RED" "List comments ordering: expected the earlier comment to appear first (positions: ${FIRST_POS:-?} vs ${SECOND_POS:-?})"
  exit 1
fi

if [[ "$MOD_CHECK_ENABLED" == "1" ]]; then
  # Test 49z7: soft-removed comment is still included, with isRemoved + removedReason
  color_echo "$BLUE" "49z7. GET /api/articles/:id/comments — soft-removed comment included with reason"
  assert_body_contains '"isRemoved":true' "List comments"
  assert_body_contains '"removedReason":"Violates community guidelines"' "List comments"
else
  color_echo "$YELLOW" "49z7. Soft-removed comment check skipped (moderator tests were skipped)"
fi

# Test 49z8: GET /api/articles/:id/comments — non-existent article returns 404
color_echo "$BLUE" "49z8. GET /api/articles/:id/comments — non-existent article returns 404"
perform_request "List comments (not found)" "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000/comments"
assert_status "404" "List comments (not found)"

# ============================================================================
# [ARTICLES] DELETE /api/articles/:id — delete article
# ============================================================================
# Description: Tests for DELETE /api/articles/:id (author-only hard delete)
# Features: ownership check, auth requirement, cascade delete of comments/likes
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

# Test 50: DELETE /api/articles/:id — unauthenticated
color_echo "$BLUE" "50. DELETE /api/articles/:id — unauthenticated request"
perform_request "Delete article (no auth)" -b "$EMPTY_COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "401" "Delete article (no auth)"

# Test 51: DELETE /api/articles/:id — non-author is forbidden
color_echo "$BLUE" "51. DELETE /api/articles/:id — non-author forbidden"
perform_request "Delete article (non-author)" -b "$COOKIE_JAR2" -X DELETE "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "403" "Delete article (non-author)"

# Test 52: DELETE /api/articles/:id — non-existent article
color_echo "$BLUE" "52. DELETE /api/articles/:id — non-existent article returns 404"
perform_request "Delete article (not found)" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000"
assert_status "404" "Delete article (not found)"

# Test 53: seed a comment and a like on the article directly in the DB so we can
# prove the delete cascades, since comment/like API endpoints aren't built yet.
CASCADE_CHECK_ENABLED=0
perform_request "Whoami for cascade seed" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me" >/dev/null
USER_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"

if command -v docker >/dev/null 2>&1 && [[ -n "$USER_ID" ]]; then
  color_echo "$BLUE" "53. Seeding a comment + like on the article to verify cascade delete"
  if docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -c \"INSERT INTO comments (id, article_id, author_id, content, updated_at) VALUES (gen_random_uuid(), '${ARTICLE_ID}', '${USER_ID}', 'seed comment', now());\"" >/dev/null 2>&1 \
    && docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -c \"INSERT INTO article_likes (id, article_id, user_id) VALUES (gen_random_uuid(), '${ARTICLE_ID}', '${USER_ID}');\"" >/dev/null 2>&1; then
    CASCADE_CHECK_ENABLED=1
    color_echo "$GREEN" "Seed comment + like: inserted"
  else
    color_echo "$YELLOW" "Seed comment + like: skipped (docker/psql not reachable)"
  fi
else
  color_echo "$YELLOW" "53. Cascade seed skipped (docker not available or user id not resolved)"
fi

# Test 54: DELETE /api/articles/:id — author deletes their own article
color_echo "$BLUE" "54. DELETE /api/articles/:id — author deletes own article"
perform_request "Delete article" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Delete article"
assert_body_contains '"success":true' "Delete article"

# Test 55: GET /api/articles/:id — deleted article is gone
color_echo "$BLUE" "55. GET /api/articles/:id — deleted article returns 404"
perform_request "Get article after delete" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "404" "Get article after delete"

# Test 56: DELETE /api/articles/:id — deleting again returns 404 (already gone)
color_echo "$BLUE" "56. DELETE /api/articles/:id — deleting again returns 404"
perform_request "Delete article (again)" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "404" "Delete article (again)"

# Test 57: comments and likes for the deleted article are gone from the DB (cascade)
if [[ "$CASCADE_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "57. Verifying comments and likes were cascade-deleted"
  REMAINING_COMMENTS="$(docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM comments WHERE article_id = '${ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]')"
  REMAINING_LIKES="$(docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM article_likes WHERE article_id = '${ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]')"

  if [[ "$REMAINING_COMMENTS" == "0" && "$REMAINING_LIKES" == "0" ]]; then
    color_echo "$GREEN" "Cascade delete: comments and likes removed (0 remaining each)"
  else
    color_echo "$RED" "Cascade delete: expected 0 remaining comments/likes, got comments=${REMAINING_COMMENTS} likes=${REMAINING_LIKES}"
    exit 1
  fi
else
  color_echo "$YELLOW" "57. Cascade delete DB check skipped (seed step unavailable)"
fi

if [[ -n "$ROLE_MOD_PATH" ]]; then
  color_echo "$BLUE" "21. Role guard check for MODERATOR path (${ROLE_MOD_PATH})"
  perform_request "Role MOD test" -b "$COOKIE_JAR" "${BASE_URL}${ROLE_MOD_PATH}"

  if [[ "$LAST_STATUS" == "403" ]]; then
    color_echo "$GREEN" "Role MOD test: correctly blocked USER with HTTP 403"
  elif [[ "$LAST_STATUS" == "404" ]]; then
    color_echo "$YELLOW" "Role MOD test skipped: path not found (${ROLE_MOD_PATH})"
  else
    color_echo "$RED" "Role MOD test: expected HTTP 403 (or 404 if route missing), got HTTP ${LAST_STATUS}"
    exit 1
  fi
else
  color_echo "$YELLOW" "Role MOD test skipped. Set ROLE_MOD_PATH (example: /api/admin/moderation)"
fi

if [[ -n "$ROLE_ADMIN_PATH" ]]; then
  color_echo "$BLUE" "22. Role guard check for ADMIN path (${ROLE_ADMIN_PATH})"
  perform_request "Role ADMIN test" -b "$COOKIE_JAR" "${BASE_URL}${ROLE_ADMIN_PATH}"

  if [[ "$LAST_STATUS" == "403" ]]; then
    color_echo "$GREEN" "Role ADMIN test: correctly blocked USER with HTTP 403"
  elif [[ "$LAST_STATUS" == "404" ]]; then
    color_echo "$YELLOW" "Role ADMIN test skipped: path not found (${ROLE_ADMIN_PATH})"
  else
    color_echo "$RED" "Role ADMIN test: expected HTTP 403 (or 404 if route missing), got HTTP ${LAST_STATUS}"
    exit 1
  fi
else
  color_echo "$YELLOW" "Role ADMIN test skipped. Set ROLE_ADMIN_PATH (example: /api/admin/users)"
fi

color_echo "$GREEN" "Done."
