#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BACKEND_BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
EMPTY_COOKIE_JAR="$(mktemp)"
RUN_ID="$(date +%s | tail -c 5)"
USERNAME="auth_${RUN_ID}"
EMAIL="auth.${RUN_ID}@example.com"
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

  if command -v docker >/dev/null 2>&1 && [[ -f "../docker-compose.yml" ]]; then
    docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -c \"DELETE FROM users WHERE email = '${EMAIL}';\"" >/dev/null 2>&1 || true
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

  if ! grep -q "$needle" <<<"$LAST_BODY"; then
    color_echo "$RED" "${label}: response did not contain '${needle}'"
    exit 1
  fi
}

assert_body_not_contains() {
  local needle="$1"
  local label="$2"

  if grep -q "$needle" <<<"$LAST_BODY"; then
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

color_echo "$BLUE" "5. Logout must fail without CSRF header"
perform_request "Logout (missing csrf)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/logout"
assert_status "403" "Logout (missing csrf)"

color_echo "$BLUE" "6. Logging out with CSRF header"
perform_request "Logout" -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/logout" \
  -H "x-csrf-token: ${CSRF_TOKEN}"
assert_status "200" "Logout"
assert_body_contains '"success":true' "Logout"

color_echo "$BLUE" "7. /me must fail after logout"
perform_request "Me (after logout)" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me"
assert_status "401" "Me (after logout)"

if [[ -n "$ROLE_MOD_PATH" ]]; then
  color_echo "$BLUE" "8. Role guard check for MODERATOR path (${ROLE_MOD_PATH})"
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
  color_echo "$BLUE" "9. Role guard check for ADMIN path (${ROLE_ADMIN_PATH})"
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
