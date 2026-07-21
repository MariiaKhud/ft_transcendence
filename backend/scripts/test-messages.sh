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

DELETE FROM messages
WHERE sender_id IN (
    SELECT id FROM users WHERE email IN ('${EMAIL_A}','${EMAIL_B}')
)
OR receiver_id IN (
    SELECT id FROM users WHERE email IN ('${EMAIL_A}','${EMAIL_B}')
);

DELETE FROM users
WHERE email IN ('${EMAIL_A}','${EMAIL_B}');
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

query_db() {

    docker compose exec -T postgres sh -lc \
    "psql \
        -U \"\${POSTGRES_USER:-transcendence}\" \
        -d \"\${POSTGRES_DB:-transcendence}\" \
        -t -A \
        -c \"$1\""
}

color_echo "$BLUE" "==========================================="
color_echo "$BLUE" "      Messages API integration tests       "
color_echo "$BLUE" "==========================================="
echo

###########################################################
color_echo "$CYAN_HI" ============== System health ==============
###########################################################
color_echo "$CYAN_L" "Check #1"
perform_request \
    "Health check" \
    "$BASE_URL/health"

check "Health check returns 200" "$LAST_STATUS" "200"
echo

###########################################################
color_echo "$CYAN_HI" ============== Auth flow ==============
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
color_echo "$CYAN_HI" ============== User setup ==============
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
color_echo "$CYAN_HI" "============== Send messages =============="
###########################################################

# A sends B
color_echo "$CYAN_L" "Check #6"
perform_request \
    "User A sends message to User B" \
    -X POST \
    "$BASE_URL/api/messages/$USER_B_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d '{"content": "Hey, how are you?"}'
check "Send message returns 201" "$LAST_STATUS" "201"
echo

# Verify message id
color_echo "$CYAN_L" "Check #7"
MESSAGE_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)"
[[ -n "$MESSAGE_ID" ]] && \
    { color_echo "$GREEN" "✔ Message ID received: $MESSAGE_ID"; ((PASS++)) || true; } || \
    { color_echo "$RED" "✘ Message ID missing from response"; ((FAIL++)) || true; }
echo

color_echo "$CYAN_L" "Check #8"
SENDER_PRESENT="$(echo "$LAST_BODY" | grep -o '"sender":{' | head -1)"
check "Response contains sender information" "$SENDER_PRESENT" '"sender":{'
echo

# B replies
color_echo "$CYAN_L" "Check #9"
perform_request \
    "User B replies to User A" \
    -X POST \
    "$BASE_URL/api/messages/$USER_A_ID" \
    -b "$COOKIE_B" \
    -H "Content-Type: application/json" \
    -d '{"content": "I am good, thanks!"}'
check "Reply returns 201" "$LAST_STATUS" "201"
echo

###########################################################
color_echo "$CYAN_HI" "============== Message validation =============="
###########################################################

# Empty content
color_echo "$CYAN_L" "Check #10"
perform_request \
    "Empty content (should 400)" \
    -X POST \
    "$BASE_URL/api/messages/$USER_B_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d '{"content": ""}'
check "Empty content returns 400" "$LAST_STATUS" "400"
echo

# Whitespace only
color_echo "$CYAN_L" "Check #11"
perform_request \
    "Whitespace only content (should 400)" \
    -X POST \
    "$BASE_URL/api/messages/$USER_B_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d '{"content": "     "}'
check "Whitespace only returns 400" "$LAST_STATUS" "400"
echo

# Over 2000 chars
color_echo "$CYAN_L" "Check #12"
LONG_MSG="$(python3 -c 'print("a" * 2001)')"
perform_request \
    "Over 2000 chars (should 400)" \
    -X POST \
    "$BASE_URL/api/messages/$USER_B_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$LONG_MSG\"}"
check "Over 2000 chars returns 400" "$LAST_STATUS" "400"
echo

# Exactly 2000 chars — should pass
color_echo "$CYAN_L" "Check #13"
EXACT_MSG="$(python3 -c 'print("a" * 2000)')"
perform_request \
    "Exactly 2000 chars (should 201)" \
    -X POST \
    "$BASE_URL/api/messages/$USER_B_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$EXACT_MSG\"}"
check "Exactly 2000 chars returns 201" "$LAST_STATUS" "201"
echo

# Message yourself
color_echo "$CYAN_L" "Check #14"
perform_request \
    "Message yourself (should 400)" \
    -X POST \
    "$BASE_URL/api/messages/$USER_A_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d '{"content": "Hello me"}'
check "Self message returns 400" "$LAST_STATUS" "400"
echo

# Non-existent receiver
color_echo "$CYAN_L" "Check #15"
perform_request \
    "Non-existent receiver (should 404)" \
    -X POST \
    "$BASE_URL/api/messages/00000000-0000-0000-0000-000000000000" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d '{"content": "Hello nobody"}'
check "Non-existent receiver returns 404" "$LAST_STATUS" "404"
echo

# Missing content field entirely
color_echo "$CYAN_L" "Check #16"
perform_request \
    "Missing content field (should 400)" \
    -X POST \
    "$BASE_URL/api/messages/$USER_B_ID" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d '{}'
check "Missing content returns 400" "$LAST_STATUS" "400"
echo

# No auth
color_echo "$CYAN_L" "Check #17"
perform_request \
    "Send message without auth (should 401)" \
    -X POST \
    "$BASE_URL/api/messages/$USER_B_ID" \
    -H "Content-Type: application/json" \
    -d '{"content": "Hello"}'
check "No auth returns 401" "$LAST_STATUS" "401"
echo

###########################################################
color_echo "$CYAN_HI" "============== Database verification =============="
###########################################################

# Messages exist
color_echo "$CYAN_L" "Check #18"
MSG_COUNT="$(query_db "
SELECT COUNT(*)
FROM messages
WHERE (sender_id='${USER_A_ID}' AND receiver_id='${USER_B_ID}')
OR (sender_id='${USER_B_ID}' AND receiver_id='${USER_A_ID}');
" | tr -d '\n' | xargs)"
color_echo "$BLUE" "Total messages between A and B in DB: $MSG_COUNT"

[[ "$MSG_COUNT" -ge 2 ]] && \
    { color_echo "$GREEN" "✔ Messages saved to DB"; ((PASS++)) || true; } || \
    { color_echo "$RED" "✘ Expected at least 2 messages in DB"; ((FAIL++)) || true; }
echo

###########################################################
color_echo "$CYAN_HI" "============== Get conversation =============="
###########################################################

# Success
color_echo "$CYAN_L" "Check #19"
perform_request \
    "Get conversation (User A fetches chat with User B)" \
    -X GET \
    "$BASE_URL/api/messages/$USER_B_ID" \
    -b "$COOKIE_A"
check "Get conversation returns 200" "$LAST_STATUS" "200"
echo

# Verify messages array is not empty
color_echo "$CYAN_L" "Check #20"
FIRST_MSG_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)"
[[ -n "$FIRST_MSG_ID" ]] && \
    { color_echo "$GREEN" "✔ Messages returned in response"; ((PASS++)) || true; } || \
    { color_echo "$RED" "✘ No messages in response"; ((FAIL++)) || true; }

# Verify oldest message is first (asc order)
color_echo "$CYAN_L" "Check #21"
FIRST_CONTENT="$(echo "$LAST_BODY" | grep -o '"content":"[^"]*"' | head -1 | cut -d'"' -f4)"
check "First message is oldest (Hey, how are you?)" "$FIRST_CONTENT" "Hey, how are you?"
echo

# Check messages from B to A are now read
color_echo "$CYAN_L" "Check #22"
UNREAD_FOR_A="$(query_db "
SELECT COUNT(*)
FROM messages
WHERE sender_id='${USER_B_ID}'
AND receiver_id='${USER_A_ID}'
AND is_read = false;
" | tr -d '\n' | xargs)"
check "Messages from B to A marked as read" "$UNREAD_FOR_A" "0"
echo

###########################################################
color_echo "$CYAN_HI" "============== Conversation from other user =============="
###########################################################

color_echo "$CYAN_L" "Check #23"
perform_request \
    "Get conversation (User B fetches chat with User A)" \
    -X GET \
    "$BASE_URL/api/messages/$USER_A_ID" \
    -b "$COOKIE_B"
check "Get conversation from B side returns 200" "$LAST_STATUS" "200"
echo

# After B fetches, messages from A to B should be read too
color_echo "$CYAN_L" "Check #24"
UNREAD_FOR_B="$(query_db "
SELECT COUNT(*) FROM messages
WHERE sender_id='${USER_A_ID}'
AND receiver_id='${USER_B_ID}'
AND is_read = false;
" | tr -d '\n' | xargs)"
check "Messages from A to B marked as read" "$UNREAD_FOR_B" "0"
echo

###########################################################
color_echo "$CYAN_HI" "============== Conversation validation =============="
###########################################################

# Self conversation
color_echo "$CYAN_L" "Check #25"
perform_request \
    "Get conversation with yourself (should 400)" \
    -X GET \
    "$BASE_URL/api/messages/$USER_A_ID" \
    -b "$COOKIE_A"
check "Self conversation returns 400" "$LAST_STATUS" "400"
echo

# Non-existent user
color_echo "$CYAN_L" "Check #26"
perform_request \
    "Get conversation with non-existent user (should 404)" \
    -X GET \
    "$BASE_URL/api/messages/00000000-0000-0000-0000-000000000000" \
    -b "$COOKIE_A"
check "Non-existent user returns 404" "$LAST_STATUS" "404"
echo

# Empty conversation
# Register a third user with no messages
color_echo "$CYAN_L" "Check #27"

RUN_ID_C="$(date +%s | tail -c 6)"
USERNAME_C="friend_c_${RUN_ID_C}"
EMAIL_C="${USERNAME_C}@example.com"
COOKIE_C="$(mktemp)"

perform_request \
    "Register User C" \
    -X POST \
    "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL_C\",\"username\":\"$USERNAME_C\",\"password\":\"$PASSWORD\"}"
check "Register User C returns 201" "$LAST_STATUS" "201"
echo

color_echo "$CYAN_L" "Check #28"
perform_request \
    "Login User C" \
    -X POST \
    "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL_C\",\"password\":\"$PASSWORD\"}" \
    -c "$COOKIE_C"
check "Login User C returns 200" "$LAST_STATUS" "200"
echo

color_echo "$CYAN_L" "Check #29"
USER_C_ID="$(query_db "SELECT id FROM users WHERE username='${USERNAME_C}';" | tr -d '\n' | xargs)"
perform_request \
    "Get conversation with User C — no messages yet (should be empty array)" \
    -X GET \
    "$BASE_URL/api/messages/$USER_C_ID" \
    -b "$COOKIE_A"
check "Empty conversation returns 200" "$LAST_STATUS" "200"
echo

color_echo "$CYAN_L" "Check #30"
EMPTY_DATA="$(echo "$LAST_BODY" | grep -o '"data":\[\]' | head -1)"
check "Empty conversation returns empty array" "$EMPTY_DATA" '"data":[]'
echo

rm -f "$COOKIE_C"

###########################################################
color_echo "$CYAN_HI" "============== Authentication =============="
###########################################################

color_echo "$CYAN_L" "Test #31"
perform_request \
    "Get conversation without auth (should 401)" \
    -X GET \
    "$BASE_URL/api/messages/$USER_B_ID"
check "No auth returns 401" "$LAST_STATUS" "401"
echo


echo
if [[ $FAIL -eq 0 ]]; then
  color_echo "$GREEN" "============== ALL $PASS CHECKS PASSED =============="
else
  color_echo "$RED" "$FAIL FAILED / $PASS PASSED"
  exit 1
fi
