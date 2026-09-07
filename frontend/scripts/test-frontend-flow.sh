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

color_echo "$BLUE" "8a. Checking protected CV upload proxy"
perform_request "CV upload proxy" -X POST "${BASE_URL}/api/users/me/cv"
assert_status "401" "CV upload proxy"
assert_header_contains 'content-type: application/json' "CV upload proxy"

# ============================================================================
# [OAUTH] Frontend proxy: provider start + failure/cancellation edge cases
# ============================================================================

OAUTH_COOKIE_JAR="$(mktemp)"
trap 'rm -f "$OAUTH_COOKIE_JAR"' EXIT
OAUTH_PROVIDER=""

color_echo "$BLUE" "9. Checking OAuth providers proxy (/api/auth/oauth/providers)"
perform_request "OAuth providers proxy" "${BASE_URL}/api/auth/oauth/providers"
assert_status "200" "OAuth providers proxy"
assert_header_contains 'content-type: application/json' "OAuth providers proxy"
assert_body_contains '"success":true' "OAuth providers proxy"

if grep -q '"github"' <<<"$LAST_BODY"; then
  OAUTH_PROVIDER="github"
elif grep -q '"google"' <<<"$LAST_BODY"; then
  OAUTH_PROVIDER="google"
elif grep -q '"42"' <<<"$LAST_BODY"; then
  OAUTH_PROVIDER="42"
fi

if [[ -n "$OAUTH_PROVIDER" ]]; then
  color_echo "$BLUE" "10. OAuth start proxy returns provider redirect for ${OAUTH_PROVIDER}"
  perform_request "OAuth start proxy" -c "$OAUTH_COOKIE_JAR" "${BASE_URL}/api/auth/oauth/${OAUTH_PROVIDER}"
  assert_status "302" "OAuth start proxy"
  assert_header_contains '^location:' "OAuth start proxy"

  OAUTH_STATE="$(awk '$6=="oauth_state" { print $7 }' "$OAUTH_COOKIE_JAR" | tail -n 1)"
  if [[ -z "$OAUTH_STATE" ]]; then
    color_echo "$RED" "OAuth start proxy: oauth_state cookie missing"
    exit 1
  fi

  color_echo "$BLUE" "11. Denied consent maps to oauth_provider_denied"
  perform_request "OAuth callback denied proxy" -b "$OAUTH_COOKIE_JAR" -c "$OAUTH_COOKIE_JAR" "${BASE_URL}/api/auth/oauth/${OAUTH_PROVIDER}/callback?error=access_denied&state=${OAUTH_STATE}"
  assert_status "302" "OAuth callback denied proxy"
  if ! grep -iq 'location: .*code=oauth_provider_denied' <<<"$LAST_HEADERS"; then
    color_echo "$RED" "OAuth callback denied proxy: expected code=oauth_provider_denied"
    exit 1
  fi

  color_echo "$BLUE" "12. Tampered state maps to oauth_state_invalid"
  perform_request "OAuth start tamper setup" -c "$OAUTH_COOKIE_JAR" "${BASE_URL}/api/auth/oauth/${OAUTH_PROVIDER}"
  assert_status "302" "OAuth start tamper setup"
  OAUTH_STATE="$(awk '$6=="oauth_state" { print $7 }' "$OAUTH_COOKIE_JAR" | tail -n 1)"
  perform_request "OAuth callback tampered proxy" -b "$OAUTH_COOKIE_JAR" -c "$OAUTH_COOKIE_JAR" "${BASE_URL}/api/auth/oauth/${OAUTH_PROVIDER}/callback?code=fake-code&state=${OAUTH_STATE}_tampered"
  assert_status "302" "OAuth callback tampered proxy"
  if ! grep -iq 'location: .*code=oauth_state_invalid' <<<"$LAST_HEADERS"; then
    color_echo "$RED" "OAuth callback tampered proxy: expected code=oauth_state_invalid"
    exit 1
  fi

  color_echo "$BLUE" "13. Reused callback state is rejected (oauth_state_missing)"
  perform_request "OAuth start reuse setup" -c "$OAUTH_COOKIE_JAR" "${BASE_URL}/api/auth/oauth/${OAUTH_PROVIDER}"
  assert_status "302" "OAuth start reuse setup"
  OAUTH_STATE="$(awk '$6=="oauth_state" { print $7 }' "$OAUTH_COOKIE_JAR" | tail -n 1)"

  perform_request "OAuth callback first use proxy" -b "$OAUTH_COOKIE_JAR" -c "$OAUTH_COOKIE_JAR" "${BASE_URL}/api/auth/oauth/${OAUTH_PROVIDER}/callback?code=fake-code&state=${OAUTH_STATE}"
  assert_status "302" "OAuth callback first use proxy"

  perform_request "OAuth callback reused proxy" -b "$OAUTH_COOKIE_JAR" -c "$OAUTH_COOKIE_JAR" "${BASE_URL}/api/auth/oauth/${OAUTH_PROVIDER}/callback?code=fake-code&state=${OAUTH_STATE}"
  assert_status "302" "OAuth callback reused proxy"
  if ! grep -iq 'location: .*code=oauth_state_missing' <<<"$LAST_HEADERS"; then
    color_echo "$RED" "OAuth callback reused proxy: expected code=oauth_state_missing"
    exit 1
  fi
else
  color_echo "$YELLOW" "10-13. OAuth frontend tests skipped: no OAuth providers enabled"
fi

# ============================================================================
# [USERS] Frontend: Edit profile form with displayName, bio, avatar
# ============================================================================
# Description: Form with displayName, bio, avatar upload/delete
# Features: Form rendering, avatar preview, field validation, API integration
# Epic Link: Auth + User Foundation
# Status: Done ✓
# ============================================================================

color_echo "$BLUE" "14. Checking /edit-profile route"
perform_request "Edit profile route" "${BASE_URL}/edit-profile"
assert_status "200" "Edit profile route"
assert_header_contains 'content-type: text/html' "Edit profile route"
assert_body_contains '<div id="root"></div>' "Edit profile route"

color_echo "$BLUE" "15. Checking /feed route"
perform_request "Feed route" "${BASE_URL}/feed"
assert_status "200" "Feed route"
assert_header_contains 'content-type: text/html' "Feed route"
assert_body_contains '<div id="root"></div>' "Feed route"

# ============================================================================
# [STATIC] Privacy Policy page - Static content, guest accessible
# ============================================================================

color_echo "$BLUE" "16. Checking /privacy-policy route"
perform_request "Privacy Policy route" "${BASE_URL}/privacy-policy"
assert_status "200" "Privacy Policy route"
assert_header_contains 'content-type: text/html' "Privacy Policy route"
assert_body_contains '<div id="root"></div>' "Privacy Policy route"

# ============================================================================
# [STATIC] Terms of Service page - Static content, guest accessible
# ============================================================================

color_echo "$BLUE" "17. Checking /terms-of-service route"
perform_request "Terms of Service route" "${BASE_URL}/terms-of-service"
assert_status "200" "Terms of Service route"
assert_header_contains 'content-type: text/html' "Terms of Service route"
assert_body_contains '<div id="root"></div>' "Terms of Service route"

# ============================================================================
# Articles, comments, likes, and article search (the /search page, the
# global feed, ArticleCard/Article page proxies, and the create/edit form)
# are covered by scripts/test-articles-flow.sh — run that script separately
# for coverage of those routes and their /api/articles + /api/comments proxies.
# ============================================================================

color_echo "$BLUE" "18. Running frontend production build"
(
  cd "$FRONTEND_DIR"
  npm run build
)

color_echo "$GREEN" "Done. Frontend smoke checks passed."
