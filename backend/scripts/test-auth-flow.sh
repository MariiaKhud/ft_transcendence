#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BACKEND_BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
RUN_ID="$(date +%s | tail -c 5)"
USERNAME="auth_${RUN_ID}"
EMAIL="auth.${RUN_ID}@example.com"
PASSWORD="strongPass123"
DISPLAY_NAME="Auth Test User"

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

  if [[ "$status" =~ ^2 ]]; then
    color_echo "$GREEN" "${label}: HTTP ${status}"
  elif [[ "$status" =~ ^4 ]]; then
    color_echo "$YELLOW" "${label}: HTTP ${status}"
  else
    color_echo "$RED" "${label}: HTTP ${status}"
  fi
  cat "$response_file"
  echo

  rm -f "$response_file"
}

color_echo "$BLUE" "1. Registering test user: ${EMAIL}"
perform_request "Register" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"displayName\":\"${DISPLAY_NAME}\"}"

color_echo "$BLUE" "2. Logging in and saving cookies"
perform_request "Login" -c "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"

CSRF_TOKEN="$(awk '$6=="csrf_token" { print $7 }' "$COOKIE_JAR" | tail -n 1)"
if [[ -z "$CSRF_TOKEN" ]]; then
  color_echo "$RED" "Failed to extract csrf_token from cookie jar"
  exit 1
fi

color_echo "$BLUE" "3. Loading current user with /me"
perform_request "Me" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me"

color_echo "$BLUE" "4. Logging out with CSRF header"
perform_request "Logout" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/logout" \
  -H "x-csrf-token: ${CSRF_TOKEN}"

color_echo "$GREEN" "Done."
