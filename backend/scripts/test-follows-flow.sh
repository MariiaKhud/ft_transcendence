#!/usr/bin/env bash
set -uo pipefail

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
CYAN_HI='\033[0;96m'
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
DELETE FROM follows;
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
color_echo "$BLUE" " Follows API integration tests"
color_echo "$BLUE" "==========================================="
echo

###########################################################
color_echo "$CYAN_HI" "============== System health =============="
###########################################################
color_echo "$CYAN_L" "Check #1"
perform_request \
    "Health check" \
    "$BASE_URL/health"

check "Health check returns 200" "$LAST_STATUS" "200"
echo

###########################################################
color_echo "$CYAN_HI" "============== Auth flow =============="
###########################################################

# Register A
color_echo "$CYAN_L" "Check #2"
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

# Register B
color_echo "$CYAN_L" "Check #3"
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

# Login A
color_echo "$CYAN_L" "Check #4"
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

# Login B
color_echo "$CYAN_L" "Check #5"
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
color_echo "$CYAN_HI" "============== User setup =============="
###########################################################

# Database lookup
color_echo "$CYAN_L" "Lookup ids"
USER_A_ID="$(query_db "SELECT id FROM users WHERE username='${USERNAME_A}';" | tr -d '\n' | xargs)"
USER_B_ID="$(query_db "SELECT id FROM users WHERE username='${USERNAME_B}';" | tr -d '\n' | xargs)"

[[ -z "$USER_A_ID" ]] && { color_echo "$RED" "Could not find User A in DB"; exit 1; }
[[ -z "$USER_B_ID" ]] && { color_echo "$RED" "Could not find User B in DB"; exit 1; }

color_echo "$BLUE" "User A: $USER_A_ID"
color_echo "$BLUE" "User B: $USER_B_ID"
echo

###########################################################
color_echo "$CYAN_HI" "============== Unfollow — not following yet =============="
###########################################################
color_echo "$CYAN_L" "Check #6"
perform_request \
    "Unfollow user not followed (should 404)" \
    -X DELETE \
    "$BASE_URL/api/follows/$USER_A_ID" \
    -b "$COOKIE_B"
check "Not following returns 404" "$LAST_STATUS" "404"
echo

###########################################################
color_echo "$CYAN_HI" "============== Follow user =============="
###########################################################
color_echo "$CYAN_L" "Check #7"
perform_request \
    "User A follows User B" \
    -X POST \
    "$BASE_URL/api/follows/$USER_B_ID" \
    -b "$COOKIE_A"
check "Follow returns 201" "$LAST_STATUS" "201"
echo

###########################################################
color_echo "$CYAN_HI" "============== Duplicate follow =============="
###########################################################
color_echo "$CYAN_L" "Check #8"
perform_request \
    "Duplicate follow (should 409)" \
    -X POST \
    "$BASE_URL/api/follows/$USER_B_ID" \
    -b "$COOKIE_A"
check "Duplicate follow returns 409" "$LAST_STATUS" "409"
echo

###########################################################
color_echo "$CYAN_HI" "============== Follow yourself =============="
###########################################################
color_echo "$CYAN_L" "Check #9"
perform_request \
    "Follow yourself (should 400)" \
    -X POST \
    "$BASE_URL/api/follows/$USER_A_ID" \
    -b "$COOKIE_A"
check "Self follow returns 400" "$LAST_STATUS" "400"
echo

###########################################################
color_echo "$CYAN_HI" "============== Follow non-existent user =============="
###########################################################
color_echo "$CYAN_L" "Check #10"
FAKE_ID="00000000-0000-0000-0000-000000000000"
perform_request \
    "Follow non-existent user (should 404)" \
    -X POST \
    "$BASE_URL/api/follows/$FAKE_ID" \
    -b "$COOKIE_A"
check "Non-existent user returns 404" "$LAST_STATUS" "404"
echo

###########################################################
color_echo "$CYAN_HI" "============== Follow without auth =============="
###########################################################
color_echo "$CYAN_L" "Check #11"
perform_request \
    "Follow without auth (should 401)" \
    -X POST \
    "$BASE_URL/api/follows/$USER_B_ID"
check "No auth returns 401" "$LAST_STATUS" "401"
echo

###########################################################
color_echo "$CYAN_HI" "============== DB verify — follow row exists =============="
###########################################################
color_echo "$CYAN_L" "Check #12"
FOLLOW_ROW="$(query_db "
SELECT id
FROM follows
WHERE follower_id='${USER_A_ID}'
AND following_id='${USER_B_ID}';
" | tr -d '\n' | xargs)"

if [[ -n "$FOLLOW_ROW" ]]; then
    color_echo "$GREEN" "✔ Follow row exists in DB"
    ((PASS++))
else
    color_echo "$RED" "✘ Follow row missing in DB"
    ((FAIL++))
fi
echo

###########################################################
color_echo "$CYAN_HI" "============== DB verify — FOLLOWED notification created =============="
###########################################################
color_echo "$CYAN_L" "Check #13"
FOLLOW_NOTIF="$(query_db "
SELECT type 
FROM notifications
WHERE user_id='${USER_B_ID}'
AND type='FOLLOWED'
ORDER BY created_at DESC LIMIT 1;
" | tr -d '\n' | xargs)"
check "FOLLOWED notification created" "$FOLLOW_NOTIF" "FOLLOWED"
echo

###########################################################
color_echo "$CYAN_HI" "============== Unfollow yourself =============="
###########################################################
color_echo "$CYAN_L" "Check #14"
perform_request \
    "Unfollow yourself (should 400)" \
    -X DELETE \
    "$BASE_URL/api/follows/$USER_A_ID" \
    -b "$COOKIE_A"
check "Self unfollow returns 400" "$LAST_STATUS" "400"
echo

###########################################################
color_echo "$CYAN_HI" "============== Unfollow without auth =============="
###########################################################
color_echo "$CYAN_L" "Check #15"
perform_request \
    "Unfollow without auth (should 401)" \
    -X DELETE \
    "$BASE_URL/api/follows/$USER_B_ID"
check "No auth returns 401" "$LAST_STATUS" "401"
echo

###########################################################
color_echo "$CYAN_HI" "============== Successful unfollow — User A unfollows User B =============="
###########################################################
color_echo "$CYAN_L" "Check #16"
perform_request \
    "User A unfollows User B" \
    -X DELETE \
    "$BASE_URL/api/follows/$USER_B_ID" \
    -b "$COOKIE_A"
check "Unfollow returns 200" "$LAST_STATUS" "200"
echo

###########################################################
color_echo "$CYAN_HI" "============== Unfollow again — row is gone now =============="
###########################################################
color_echo "$CYAN_L" "Check #17"
perform_request \
    "Unfollow again (should 404)" \
    -X DELETE \
    "$BASE_URL/api/follows/$USER_B_ID" \
    -b "$COOKIE_A"
check "Double unfollow returns 404" "$LAST_STATUS" "404"
echo

###########################################################
color_echo "$CYAN_HI" "============== DB verify — follow row is gone =============="
###########################################################
color_echo "$CYAN_L" "Check #18"
FOLLOW_ROW="$(query_db "
SELECT id FROM follows
WHERE follower_id='${USER_A_ID}'
AND following_id='${USER_B_ID}';
" | tr -d '\n' | xargs)"

[[ -z "$FOLLOW_ROW" ]] && \
    { color_echo "$GREEN" "✔ Follow row correctly deleted from DB"; ((PASS++)) || true; } || \
    { color_echo "$RED" "✘ Follow row still exists in DB"; ((FAIL++)) || true; }
echo

###########################################################
color_echo "$CYAN_HI" "============== Mark online =============="
###########################################################
color_echo "$CYAN_L" "Check #19"
perform_request \
    "Mark User A online" \
    -X PATCH \
    "$BASE_URL/api/users/me/online" \
    -b "$COOKIE_A"
check "Mark online returns 200" "$LAST_STATUS" "200"
echo

###########################################################
color_echo "$CYAN_HI" "============== Mark online without auth =============="
###########################################################
color_echo "$CYAN_L" "Check #20"
perform_request \
    "Mark online without auth (should 401)" \
    -X PATCH \
    "$BASE_URL/api/users/me/online"
check "No auth returns 401" "$LAST_STATUS" "401"
echo

###########################################################
color_echo "$CYAN_HI" "============== DB verify — is_online is true =============="
###########################################################
color_echo "$CYAN_L" "Check #21"
IS_ONLINE="$(query_db "
SELECT is_online
FROM users
WHERE id='${USER_A_ID}';
" | tr -d '\n' | xargs)"
check "User A is_online is true in DB" "$IS_ONLINE" "t"
echo

###########################################################
color_echo "$CYAN_HI" "============== DB verify — background job sets offline after cutoff =============="
###########################################################
color_echo "$CYAN_L" "Check #22"
color_echo "$BLUE" "Setting last_seen_at to 3 minutes ago to test background job..."
query_db "
UPDATE users
SET last_seen_at = NOW() - INTERVAL '3 minutes'
WHERE id='${USER_A_ID}';
" > /dev/null

color_echo "$BLUE" "Waiting 35 seconds for background job to run..."
sleep 35

IS_ONLINE_AFTER="$(query_db "
SELECT is_online
FROM users
WHERE id='${USER_A_ID}';
" | tr -d '\n' | xargs)"
check "User A marked offline by background job" "$IS_ONLINE_AFTER" "f"



echo
if [[ $FAIL -eq 0 ]]; then
  color_echo "$GREEN" "============== ALL $PASS CHECKS PASSED =============="
else
  color_echo "$RED" "$FAIL FAILED / $PASS PASSED"
  exit 1
fi
