#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${FRONTEND_BASE_URL:-https://localhost:8443}"
API_PROXY_PATH="${FRONTEND_API_PROXY_PATH:-/api/auth/me}"
USERS_PROXY_PATH="${FRONTEND_USERS_PROXY_PATH:-/api/users/smoke_user}"
CURL_INSECURE="${FRONTEND_CURL_INSECURE:-true}"
FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

LAST_STATUS=""
LAST_BODY=""
LAST_HEADERS=""

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

perform_request() {
  local label="$1"
  shift

  local response_file
  local headers_file
  response_file="$(mktemp)"
  headers_file="$(mktemp)"

  local status
  local curl_args
  curl_args=(-sS -D "$headers_file" -o "$response_file" -w '%{http_code}')

  if [[ "$CURL_INSECURE" == "true" ]]; then
    curl_args+=(-k)
  fi

  status="$(curl "${curl_args[@]}" "$@")"

  LAST_STATUS="$status"
  LAST_BODY="$(cat "$response_file")"
  LAST_HEADERS="$(cat "$headers_file")"

  if [[ "$status" =~ ^2 ]]; then
    color_echo "$GREEN" "${label}: HTTP ${status}"
  elif [[ "$status" =~ ^4 ]]; then
    color_echo "$YELLOW" "${label}: HTTP ${status}"
  else
    color_echo "$RED" "${label}: HTTP ${status}"
  fi

  rm -f "$response_file" "$headers_file"
}

assert_status() {
  local expected="$1"
  local label="$2"

  if [[ "$LAST_STATUS" != "$expected" ]]; then
    color_echo "$RED" "${label}: expected HTTP ${expected}, got HTTP ${LAST_STATUS}"
    exit 1
  fi
}

assert_status_one_of() {
  local label="$1"
  shift
  local allowed=("$@")

  for code in "${allowed[@]}"; do
    if [[ "$LAST_STATUS" == "$code" ]]; then
      return
    fi
  done

  color_echo "$RED" "${label}: expected one of [${allowed[*]}], got HTTP ${LAST_STATUS}"
  exit 1
}

assert_body_contains() {
  local needle="$1"
  local label="$2"

  if ! grep -q "$needle" <<<"$LAST_BODY"; then
    color_echo "$RED" "${label}: response did not contain '${needle}'"
    exit 1
  fi
}

assert_header_contains() {
  local needle="$1"
  local label="$2"

  if ! grep -iq "$needle" <<<"$LAST_HEADERS"; then
    color_echo "$RED" "${label}: headers did not contain '${needle}'"
    exit 1
  fi
}

color_echo "$BLUE" "1. Checking home route (${BASE_URL}/)"
perform_request "Home" "${BASE_URL}/"
assert_status "200" "Home"
assert_header_contains 'content-type: text/html' "Home"
assert_body_contains '<div id="root"></div>' "Home"

color_echo "$BLUE" "2. Checking /login route"
perform_request "Login route" "${BASE_URL}/login"
assert_status "200" "Login route"
assert_header_contains 'content-type: text/html' "Login route"
assert_body_contains '<div id="root"></div>' "Login route"

color_echo "$BLUE" "3. Checking /register route"
perform_request "Register route" "${BASE_URL}/register"
assert_status "200" "Register route"
assert_header_contains 'content-type: text/html' "Register route"
assert_body_contains '<div id="root"></div>' "Register route"

color_echo "$BLUE" "4. Checking /feed route"
perform_request "Feed route" "${BASE_URL}/feed"
assert_status "200" "Feed route"
assert_header_contains 'content-type: text/html' "Feed route"
assert_body_contains '<div id="root"></div>' "Feed route"

color_echo "$BLUE" "5. Checking /profile/:username route"
perform_request "Profile route" "${BASE_URL}/profile/smoke_user"
assert_status "200" "Profile route"
assert_header_contains 'content-type: text/html' "Profile route"
assert_body_contains '<div id="root"></div>' "Profile route"

color_echo "$BLUE" "6. Checking unknown route fallback"
perform_request "Unknown route" "${BASE_URL}/route-that-does-not-exist"
assert_status "200" "Unknown route"
assert_header_contains 'content-type: text/html' "Unknown route"
assert_body_contains '<div id="root"></div>' "Unknown route"

color_echo "$BLUE" "7. Checking auth API proxy through frontend (${API_PROXY_PATH})"
perform_request "API proxy" "${BASE_URL}${API_PROXY_PATH}"
assert_status_one_of "API proxy" "200" "401"
assert_header_contains 'content-type: application/json' "API proxy"

color_echo "$BLUE" "8. Checking users API proxy through frontend (${USERS_PROXY_PATH})"
perform_request "Users API proxy" "${BASE_URL}${USERS_PROXY_PATH}"
assert_status_one_of "Users API proxy" "200" "400" "404"
assert_header_contains 'content-type: application/json' "Users API proxy"

color_echo "$BLUE" "9. Running frontend production build"
(
  cd "$FRONTEND_DIR"
  npm run build
)

color_echo "$GREEN" "Done. Frontend smoke checks passed."
