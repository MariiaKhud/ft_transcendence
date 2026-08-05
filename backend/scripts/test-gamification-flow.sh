#!/usr/bin/env bash
set -uo pipefail


# ============================================================
# Gamification API Integration Tests
# TRAN-62: XP and level logic via article create/delete flow
# ============================================================


BASE_URL="${BACKEND_BASE_URL:-http://localhost:3000}"


COOKIE_A="$(mktemp)"
RUN_ID="$(date +%s | tail -c 5)"


USERNAME_A="gamify_a_${RUN_ID}"
EMAIL_A="${USERNAME_A}@example.com"
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


XP_REWARD_CREATE_ARTICLE=25
TARGET_XP_TO_LEVEL_2=100
ARTICLES_FOR_LEVEL_2=$(( (TARGET_XP_TO_LEVEL_2 + XP_REWARD_CREATE_ARTICLE - 1) / XP_REWARD_CREATE_ARTICLE ))
ARTICLE_CONTENT="Testing XP award on article creation. This article is intentionally long enough to satisfy validation rules and should trigger the gamification reward flow in the backend."


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


  docker compose exec -T postgres sh -lc \
  "psql -U \"\${POSTGRES_USER:-transcendence}\" \
        -d \"\${POSTGRES_DB:-transcendence}\" \
        -c \"
DELETE FROM articles WHERE author_id IN (
  SELECT id FROM users WHERE email='${EMAIL_A}'
);
DELETE FROM users WHERE email='${EMAIL_A}';
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


extract_article_id() {
  echo "$LAST_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}


color_echo "$BLUE" "==========================================="
color_echo "$BLUE" "     Gamification API integration tests    "
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


color_echo "$CYAN_L" "Check #2"
perform_request \
  "Register User A" \
  -X POST \
  "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_A\",\
    \"username\":\"$USERNAME_A\",\
    \"password\":\"$PASSWORD\"\
  }"
check "Register User A returns 201" "$LAST_STATUS" "201"
echo


color_echo "$CYAN_L" "Check #3"
perform_request \
  "Login User A" \
  -X POST \
  "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_A\",\
    \"password\":\"$PASSWORD\"\
  }" \
  -c "$COOKIE_A"
check "Login User A returns 200" "$LAST_STATUS" "200"
echo


###########################################################
color_echo "$CYAN_HI" "============== DB lookup =============="
###########################################################


color_echo "$CYAN_L" "Lookup user id"
USER_A_ID="$(query_db "SELECT id FROM users WHERE email='${EMAIL_A}';" | tr -d '\n' | xargs)"
[[ -z "$USER_A_ID" ]] && { color_echo "$RED" "Could not find User A in DB"; exit 1; }
color_echo "$BLUE" "User A: $USER_A_ID"
echo


###########################################################
color_echo "$CYAN_HI" "============== Initial state =============="
###########################################################


color_echo "$CYAN_L" "Check #4"
INITIAL_XP="$(query_db "SELECT xp FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
INITIAL_LEVEL="$(query_db "SELECT level FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
check "Initial XP is 0" "$INITIAL_XP" "0"
check "Initial level is 1" "$INITIAL_LEVEL" "1"
echo


###########################################################
color_echo "$CYAN_HI" "============== Article create XP =============="
###########################################################


color_echo "$CYAN_L" "Check #5"
perform_request \
  "Create first article" \
  -X POST \
  "$BASE_URL/api/articles" \
  -b "$COOKIE_A" \
  -H "Content-Type: application/json" \
  -d "{\
    \"title\":\"Gamification test article 1\",\
    \"content\":\"$ARTICLE_CONTENT\",\
    \"category\":\"PROGRAMMING\"\
  }"
check "Create article returns 201" "$LAST_STATUS" "201"
ARTICLE_1_ID="$(extract_article_id)"
[[ -z "$ARTICLE_1_ID" ]] && { color_echo "$RED" "Could not extract first article id"; exit 1; }
echo


color_echo "$CYAN_L" "Check #6"
XP_AFTER_ONE="$(query_db "SELECT xp FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
LEVEL_AFTER_ONE="$(query_db "SELECT level FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
EXPECTED_XP_AFTER_ONE="$XP_REWARD_CREATE_ARTICLE"
EXPECTED_LEVEL_AFTER_ONE="1"
check "XP increased after first article" "$XP_AFTER_ONE" "$EXPECTED_XP_AFTER_ONE"
check "Level remains 1 after first article" "$LEVEL_AFTER_ONE" "$EXPECTED_LEVEL_AFTER_ONE"
echo


###########################################################
color_echo "$CYAN_HI" "============== Threshold crossing =============="
###########################################################


for ((i=2; i<=ARTICLES_FOR_LEVEL_2; i++)); do
  color_echo "$CYAN_L" "Create article #$i"
  perform_request \
    "Create article $i" \
    -X POST \
    "$BASE_URL/api/articles" \
    -b "$COOKIE_A" \
    -H "Content-Type: application/json" \
    -d "{\
      \"title\":\"Gamification test article $i\",\
      \"content\":\"$ARTICLE_CONTENT\",\
      \"category\":\"PROGRAMMING\"\
    }"
  check "Create article $i returns 201" "$LAST_STATUS" "201"
  echo
 done


color_echo "$CYAN_L" "Check #7"
XP_AFTER_LEVEL2="$(query_db "SELECT xp FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
LEVEL_AFTER_LEVEL2="$(query_db "SELECT level FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
EXPECTED_XP_AFTER_LEVEL2=$((ARTICLES_FOR_LEVEL_2 * XP_REWARD_CREATE_ARTICLE))
check "XP reaches expected total after enough articles" "$XP_AFTER_LEVEL2" "$EXPECTED_XP_AFTER_LEVEL2"
check "Level becomes 2 at 100 XP" "$LEVEL_AFTER_LEVEL2" "2"
echo


###########################################################
color_echo "$CYAN_HI" "============== Article delete XP rollback =============="
###########################################################


color_echo "$CYAN_L" "Check #8"
perform_request \
  "Delete first article" \
  -X DELETE \
  "$BASE_URL/api/articles/$ARTICLE_1_ID" \
  -b "$COOKIE_A"
check "Delete article returns 200" "$LAST_STATUS" "200"
echo


color_echo "$CYAN_L" "Check #9"
XP_AFTER_DELETE="$(query_db "SELECT xp FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
LEVEL_AFTER_DELETE="$(query_db "SELECT level FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
EXPECTED_XP_AFTER_DELETE=$((EXPECTED_XP_AFTER_LEVEL2 - XP_REWARD_CREATE_ARTICLE))
check "XP decreases after article delete" "$XP_AFTER_DELETE" "$EXPECTED_XP_AFTER_DELETE"
check "Level stays valid after delete" "$LEVEL_AFTER_DELETE" "1"
echo


###########################################################
color_echo "$CYAN_HI" "============== No auth validation =============="
###########################################################


color_echo "$CYAN_L" "Check #10"
perform_request \
  "Create article without auth" \
  -X POST \
  "$BASE_URL/api/articles" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"No auth article",
    "content":"This content is intentionally long enough to satisfy validation rules but the request should still fail because it has no auth.",
    "category":"PROGRAMMING"
  }'
check "No auth create returns 401" "$LAST_STATUS" "401"
echo


###########################################################
color_echo "$CYAN_HI" "============== Cleanup verification =============="
###########################################################


color_echo "$CYAN_L" "Check #11"
REMAINING_ARTICLES="$(query_db "SELECT COUNT(*) FROM articles WHERE author_id='${USER_A_ID}';" | tr -d '\n' | xargs)"
check "Remaining article count matches expected" "$REMAINING_ARTICLES" "$((ARTICLES_FOR_LEVEL_2 - 1))"
echo


echo
if [[ $FAIL -eq 0 ]]; then
  color_echo "$GREEN" "============== ALL $PASS CHECKS PASSED =============="
else
  color_echo "$RED" "$FAIL FAILED / $PASS PASSED"
  exit 1
fi