#!/usr/bin/env bash
set -uo pipefail

# ============================================================
# Friend Request API Integration Tests
# ============================================================

BASE_URL="${BACKEND_BASE_URL:-http://localhost:3000}"

COOKIE_A="$(mktemp)"
COOKIE_B="$(mktemp)"

RUN_ID="$(date +%s | tail -c 5)"

USERNAME_A="friend_a_${RUN_ID}"
USERNAME_B="friend_b_${RUN_ID}"

EMAIL_A="${USERNAME_A}@example.com"
EMAIL_B="${USERNAME_B}@example.com"

PASSWORD="Password123!"

LAST_STATUS=""
LAST_BODY=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN_L='\033[2;36m'
RESET='\033[0m'

PASS=0
FAIL=0

check() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    color_echo "$GREEN" "✔ $label"
    ((PASS++))
  else
    color_echo "$RED" "✘ $label (got: '$actual', expected: '$expected')"
    ((FAIL++))
  fi
}

color_echo() {
    local color="$1"
    shift
    printf "%b%s%b\n" "$color" "$*" "$RESET"
}

cleanup() {
    rm -f "$COOKIE_A"
    rm -f "$COOKIE_B"

    docker compose exec -T postgres sh -lc \
    "psql -U \"\${POSTGRES_USER:-transcendence}\" \
          -d \"\${POSTGRES_DB:-transcendence}\" \
          -c \"
DELETE FROM notifications;
DELETE FROM friendships;
DELETE FROM users WHERE email IN ('${EMAIL_A}','${EMAIL_B}');
\" >/dev/null" || true
}

trap cleanup EXIT

perform_request() {

    local label="$1"
    shift

    local response
    response="$(mktemp)"

    LAST_STATUS="$(curl -sS \
        -o "$response" \
        -w "%{http_code}" \
        "$@")"

    LAST_BODY="$(cat "$response")"
    rm "$response"

    if [[ "$LAST_STATUS" =~ ^2 ]]; then
        color_echo "$GREEN" "$label : HTTP $LAST_STATUS"
    elif [[ "$LAST_STATUS" =~ ^4 ]]; then
        color_echo "$YELLOW" "$label : HTTP $LAST_STATUS"
    else
        color_echo "$RED" "$label : HTTP $LAST_STATUS"
    fi

    echo "$LAST_BODY"
    echo
}

assert_status() {

    local expected="$1"

    if [[ "$LAST_STATUS" != "$expected" ]]; then
        color_echo "$RED" "Expected HTTP $expected but got $LAST_STATUS"
        exit 1
    fi
}

query_db() {

    docker compose exec -T postgres sh -lc \
    "psql \
        -U \"\${POSTGRES_USER:-transcendence}\" \
        -d \"\${POSTGRES_DB:-transcendence}\" \
        -t -A \
        -c \"$1\""
}

color_echo "$BLUE" "==========================================="
color_echo "$BLUE" " Friends API integration tests"
color_echo "$BLUE" "==========================================="
echo

###########################################################
# Health
###########################################################
color_echo "$CYAN_L" "Test #1"
perform_request \
    "Health check" \
    "$BASE_URL/health"

check "Health check returns 200" "$LAST_STATUS" "200"
echo

###########################################################
# Register A
###########################################################
color_echo "$CYAN_L" "Test #2"
perform_request \
    "Register User A" \
    -X POST \
    "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\":\"$EMAIL_A\",
        \"username\":\"$USERNAME_A\",
        \"password\":\"$PASSWORD\"
    }"

check "Register User A returns 201" "$LAST_STATUS" "201"
echo

###########################################################
# Register B
###########################################################
color_echo "$CYAN_L" "Test #3"
perform_request \
    "Register User B" \
    -X POST \
    "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\":\"$EMAIL_B\",
        \"username\":\"$USERNAME_B\",
        \"password\":\"$PASSWORD\"
    }"

check "Register User B returns 201" "$LAST_STATUS" "201"
echo

###########################################################
# Login A
###########################################################
color_echo "$CYAN_L" "Test #4"
perform_request \
    "Login User A" \
    -X POST \
    "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\":\"$EMAIL_A\",
        \"password\":\"$PASSWORD\"
    }" \
    -c "$COOKIE_A"

check "Login User A returns 200" "$LAST_STATUS" "200"
echo

###########################################################
# Login B
###########################################################
color_echo "$CYAN_L" "Test #5"
perform_request \
    "Login User B" \
    -X POST \
    "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\":\"$EMAIL_B\",
        \"password\":\"$PASSWORD\"
    }" \
    -c "$COOKIE_B"

check "Login User B returns 200" "$LAST_STATUS" "200"
echo

###########################################################
# Lookup ids
###########################################################
color_echo "$CYAN_L" "Lookup ids"
USER_A_ID="$(query_db "SELECT id FROM users WHERE username='${USERNAME_A}';" | tr -d '\n' | xargs)"
USER_B_ID="$(query_db "SELECT id FROM users WHERE username='${USERNAME_B}';" | tr -d '\n' | xargs)"

[[ -z "$USER_A_ID" ]] && { color_echo "$RED" "Could not find User A in DB"; exit 1; }
[[ -z "$USER_B_ID" ]] && { color_echo "$RED" "Could not find User B in DB"; exit 1; }

color_echo "$BLUE" "User A: $USER_A_ID"
color_echo "$BLUE" "User B: $USER_B_ID"
echo

###########################################################
# Friend request
###########################################################
color_echo "$CYAN_L" "Test #6"
perform_request \
    "Send friend request" \
    -X POST \
    "$BASE_URL/api/friends/request/$USER_B_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json"

check "Send friend request returns 201" "$LAST_STATUS" "201"
echo

###########################################################
# Duplicate request
###########################################################
color_echo "$CYAN_L" "Test #7"
perform_request \
    "Duplicate friend request" \
    -X POST \
    "$BASE_URL/api/friends/request/$USER_B_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json"

check "Duplicate request returns 400" "$LAST_STATUS" "400"
echo

###########################################################
# Friend yourself
###########################################################
color_echo "$CYAN_L" "Test #8"
perform_request \
    "Friend yourself" \
    -X POST \
    "$BASE_URL/api/friends/request/$USER_A_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json"

check "Friend yourself returns 400" "$LAST_STATUS" "400"
echo

###########################################################
# Without authentication
###########################################################
color_echo "$CYAN_L" "Test #9"
perform_request \
    "No authentication" \
    -X POST \
    "$BASE_URL/api/friends/request/$USER_B_ID" \
    -H "Content-Type: application/json"

check "No auth returns 401" "$LAST_STATUS" "401"
echo

###########################################################
# Verify friendship
###########################################################
color_echo "$CYAN_L" "Test #10"
STATUS="$(query_db "
SELECT status
FROM friendships
WHERE requester_id='${USER_A_ID}'
AND addressee_id='${USER_B_ID}';
" | tr -d '\n' | xargs)"

check "Friendship row status is PENDING" "$STATUS" "PENDING"
echo

###########################################################
# Verify notification
###########################################################
color_echo "$CYAN_L" "Test #11"
NOTIFICATION_TYPE="$(query_db "
SELECT type
FROM notifications
WHERE user_id='${USER_B_ID}'
ORDER BY created_at DESC
LIMIT 1;
" | tr -d '\n' | xargs)"

check "Notification type is FRIEND_REQUEST" "$NOTIFICATION_TYPE" "FRIEND_REQUEST"

echo
if [[ $FAIL -eq 0 ]]; then
  color_echo "$GREEN" "ALL $PASS CHECKS PASSED"
else
  color_echo "$RED" "$FAIL FAILED / $PASS PASSED"
  exit 1
fi