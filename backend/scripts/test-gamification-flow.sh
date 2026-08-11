#!/usr/bin/env bash
set -uo pipefail



# ============================================================
# Gamification API Integration Tests
# TRAN-62: XP and level logic via article create/delete flow
# TRAN-63: Badge award & idempotency checks
# ============================================================



BASE_URL="${BACKEND_BASE_URL:-http://localhost:3000}"



COOKIE_A="$(mktemp)"
COOKIE_B="$(mktemp)"
COOKIE_C="$(mktemp)"
COOKIE_D="$(mktemp)"
COOKIE_E="$(mktemp)"
COOKIE_F="$(mktemp)"
RUN_ID="$(date +%s | tail -c 5)"



USERNAME_A="gamify_a_${RUN_ID}"
EMAIL_A="${USERNAME_A}@example.com"

USERNAME_B="gamify_b_${RUN_ID}"
EMAIL_B="${USERNAME_B}@example.com"

USERNAME_C="gamify_c_${RUN_ID}"
EMAIL_C="${USERNAME_C}@example.com"

USERNAME_D="gamify_d_${RUN_ID}"
EMAIL_D="${USERNAME_D}@example.com"

USERNAME_E="gamify_e_${RUN_ID}"
EMAIL_E="${USERNAME_E}@example.com"

USERNAME_F="gamify_f_${RUN_ID}"
EMAIL_F="${USERNAME_F}@example.com"

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
TOTAL_ARTICLES_FOR_BADGES=20
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
  rm -f "$COOKIE_A" "$COOKIE_B" "$COOKIE_C" "$COOKIE_D" "$COOKIE_E" "$COOKIE_F"

  docker compose exec -T postgres sh -lc \
  "psql -U \"\${POSTGRES_USER:-transcendence}\" \
        -d \"\${POSTGRES_DB:-transcendence}\" \
        -c \"
DELETE FROM articles WHERE author_id IN (
  SELECT id FROM users WHERE email IN ('${EMAIL_A}', '${EMAIL_B}', '${EMAIL_C}', '${EMAIL_D}', '${EMAIL_E}', '${EMAIL_F}')
);
DELETE FROM users WHERE email IN ('${EMAIL_A}', '${EMAIL_B}', '${EMAIL_C}', '${EMAIL_D}', '${EMAIL_E}', '${EMAIL_F}');
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
color_echo "$CYAN_HI" "============== Auth flow (User A) =============="
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
color_echo "$CYAN_HI" "============== Auth flow (User B) =============="
###########################################################



color_echo "$CYAN_L" "Check #3b"
perform_request \
  "Register User B" \
  -X POST \
  "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_B\",\
    \"username\":\"$USERNAME_B\",\
    \"password\":\"$PASSWORD\"\
  }"
check "Register User B returns 201" "$LAST_STATUS" "201"
echo



color_echo "$CYAN_L" "Check #3c"
perform_request \
  "Login User B" \
  -X POST \
  "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_B\",\
    \"password\":\"$PASSWORD\"\
  }" \
  -c "$COOKIE_B"
check "Login User B returns 200" "$LAST_STATUS" "200"
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
color_echo "$CYAN_HI" "============== Badges: First Post =============="
###########################################################



color_echo "$CYAN_L" "Check #6a"
FIRST_POST_BADGE_COUNT_AFTER_ONE="$(query_db "
  SELECT COUNT(*)
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id='${USER_A_ID}'
    AND b.name='First Post';
" | tr -d '\n' | xargs)"
check "User has exactly one 'First Post' badge after first article" "$FIRST_POST_BADGE_COUNT_AFTER_ONE" "1"
echo



###########################################################
color_echo "$CYAN_HI" "============== Threshold crossing (Level 2 XP) =============="
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



color_echo "$CYAN_L" "Check #7a"
FIRST_POST_BADGE_COUNT_AFTER_MANY_4="$(query_db "
  SELECT COUNT(*)
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id='${USER_A_ID}'
    AND b.name='First Post';
" | tr -d '\n' | xargs)"
check "'First Post' badge remains unique after multiple articles (4)" "$FIRST_POST_BADGE_COUNT_AFTER_MANY_4" "1"
echo



###########################################################
color_echo "$CYAN_HI" "====== Badges: Consistent Writer & Prolific Author ======"
###########################################################



for ((i=ARTICLES_FOR_LEVEL_2+1; i<=TOTAL_ARTICLES_FOR_BADGES; i++)); do
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



color_echo "$CYAN_L" "Check #7b"
ARTICLE_COUNT_FOR_BADGES="$(query_db "
  SELECT COUNT(*)
  FROM articles
  WHERE author_id='${USER_A_ID}' AND is_removed=false;
" | tr -d '\n' | xargs)"
check "User has 20 non-removed articles" "$ARTICLE_COUNT_FOR_BADGES" "$TOTAL_ARTICLES_FOR_BADGES"
echo



color_echo "$CYAN_L" "Check #7c"
CONSISTENT_WRITER_BADGE_COUNT="$(query_db "
  SELECT COUNT(*)
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id='${USER_A_ID}'
    AND b.name='Consistent Writer';
" | tr -d '\n' | xargs)"
PROLIFIC_AUTHOR_BADGE_COUNT="$(query_db "
  SELECT COUNT(*)
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id='${USER_A_ID}'
    AND b.name='Prolific Author';
" | tr -d '\n' | xargs)"
check "User has 'Consistent Writer' badge at >=5 articles" "$CONSISTENT_WRITER_BADGE_COUNT" "1"
check "User has 'Prolific Author' badge at >=20 articles" "$PROLIFIC_AUTHOR_BADGE_COUNT" "1"
echo



###########################################################
color_echo "$CYAN_HI" "====== Badges: First Like, Rising Voice, Popular Writer ======"
###########################################################



# First Like: User B likes User A's first article.
color_echo "$CYAN_L" "Check #7d"
perform_request \
  "User B likes User A's first article" \
  -X POST \
  "$BASE_URL/api/articles/$ARTICLE_1_ID/like" \
  -b "$COOKIE_B"
check "Like article returns 200" "$LAST_STATUS" "200"
echo



color_echo "$CYAN_L" "Check #7e"
FIRST_LIKE_BADGE_COUNT="$(query_db "
  SELECT COUNT(*)
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id='${USER_A_ID}'
    AND b.name='First Like';
" | tr -d '\n' | xargs)"
check "User A has exactly one 'First Like' badge after receiving first like" "$FIRST_LIKE_BADGE_COUNT" "1"
echo



# Prepare additional liker users C, D, E, F
color_echo "$CYAN_HI" "Auth flow (liker users C–F)"
color_echo "$CYAN_L" "Check #7f"
perform_request \
  "Register User C" \
  -X POST \
  "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_C\",\
    \"username\":\"$USERNAME_C\",\
    \"password\":\"$PASSWORD\"\
  }"
check "Register User C returns 201" "$LAST_STATUS" "201"
perform_request \
  "Login User C" \
  -X POST \
  "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_C\",\
    \"password\":\"$PASSWORD\"\
  }" \
  -c "$COOKIE_C"
check "Login User C returns 200" "$LAST_STATUS" "200"
echo



color_echo "$CYAN_L" "Check #7g"
perform_request \
  "Register User D" \
  -X POST \
  "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_D\",\
    \"username\":\"$USERNAME_D\",\
    \"password\":\"$PASSWORD\"\
  }"
check "Register User D returns 201" "$LAST_STATUS" "201"
perform_request \
  "Login User D" \
  -X POST \
  "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_D\",\
    \"password\":\"$PASSWORD\"\
  }" \
  -c "$COOKIE_D"
check "Login User D returns 200" "$LAST_STATUS" "200"
echo



color_echo "$CYAN_L" "Check #7h"
perform_request \
  "Register User E" \
  -X POST \
  "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_E\",\
    \"username\":\"$USERNAME_E\",\
    \"password\":\"$PASSWORD\"\
  }"
check "Register User E returns 201" "$LAST_STATUS" "201"
perform_request \
  "Login User E" \
  -X POST \
  "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_E\",\
    \"password\":\"$PASSWORD\"\
  }" \
  -c "$COOKIE_E"
check "Login User E returns 200" "$LAST_STATUS" "200"
echo



color_echo "$CYAN_L" "Check #7i"
perform_request \
  "Register User F" \
  -X POST \
  "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_F\",\
    \"username\":\"$USERNAME_F\",\
    \"password\":\"$PASSWORD\"\
  }"
check "Register User F returns 201" "$LAST_STATUS" "201"
perform_request \
  "Login User F" \
  -X POST \
  "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\
    \"email\":\"$EMAIL_F\",\
    \"password\":\"$PASSWORD\"\
  }" \
  -c "$COOKIE_F"
check "Login User F returns 200" "$LAST_STATUS" "200"
echo



# Rising Voice: total likes >= 10.
# Use User B to like 9 more distinct articles (not the first one again).
color_echo "$CYAN_L" "Check #7j"
ARTICLE_IDS_FOR_RISING="$(query_db "
  SELECT id
  FROM articles
  WHERE author_id='${USER_A_ID}' AND is_removed=false
  ORDER BY created_at ASC
  OFFSET 1
  LIMIT 9;
" | tr -d '\r')"

for article_id in $ARTICLE_IDS_FOR_RISING; do
  perform_request \
    "User B likes article $article_id for Rising Voice" \
    -X POST \
    "$BASE_URL/api/articles/$article_id/like" \
    -b "$COOKIE_B" >/dev/null
done

TOTAL_LIKES_FOR_RISING="$(query_db "
  SELECT COALESCE(SUM(like_count),0)
  FROM articles
  WHERE author_id='${USER_A_ID}' AND is_removed=false;
" | tr -d '\n' | xargs)"
check "Total likes reach 10 for 'Rising Voice' threshold" "$TOTAL_LIKES_FOR_RISING" "10"

RISING_VOICE_BADGE_COUNT="$(query_db "
  SELECT COUNT(*)
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id='${USER_A_ID}'
    AND b.name='Rising Voice';
" | tr -d '\n' | xargs)"
check "User A has 'Rising Voice' badge at 10 likes" "$RISING_VOICE_BADGE_COUNT" "1"
echo



# Popular Writer: total likes >= 50.
# Have users C, D, E, F each like 10 articles (first 10), adding 40 likes on top of the 10 we already have.
color_echo "$CYAN_L" "Check #7k"
ARTICLE_IDS_FOR_POPULAR="$(query_db "
  SELECT id
  FROM articles
  WHERE author_id='${USER_A_ID}' AND is_removed=false
  ORDER BY created_at ASC
  LIMIT 10;
" | tr -d '\r')"

for article_id in $ARTICLE_IDS_FOR_POPULAR; do
  perform_request \
    "User C likes article $article_id for Popular Writer" \
    -X POST \
    "$BASE_URL/api/articles/$article_id/like" \
    -b "$COOKIE_C" >/dev/null
done

for article_id in $ARTICLE_IDS_FOR_POPULAR; do
  perform_request \
    "User D likes article $article_id for Popular Writer" \
    -X POST \
    "$BASE_URL/api/articles/$article_id/like" \
    -b "$COOKIE_D" >/dev/null
done

for article_id in $ARTICLE_IDS_FOR_POPULAR; do
  perform_request \
    "User E likes article $article_id for Popular Writer" \
    -X POST \
    "$BASE_URL/api/articles/$article_id/like" \
    -b "$COOKIE_E" >/dev/null
done

for article_id in $ARTICLE_IDS_FOR_POPULAR; do
  perform_request \
    "User F likes article $article_id for Popular Writer" \
    -X POST \
    "$BASE_URL/api/articles/$article_id/like" \
    -b "$COOKIE_F" >/dev/null
done

TOTAL_LIKES_FOR_POPULAR="$(query_db "
  SELECT COALESCE(SUM(like_count),0)
  FROM articles
  WHERE author_id='${USER_A_ID}' AND is_removed=false;
" | tr -d '\n' | xargs)"
check "Total likes reach 50 for 'Popular Writer' threshold" "$TOTAL_LIKES_FOR_POPULAR" "50"

POPULAR_WRITER_BADGE_COUNT="$(query_db "
  SELECT COUNT(*)
  FROM user_badges ub
  JOIN badges b ON b.id = ub.badge_id
  WHERE ub.user_id='${USER_A_ID}'
    AND b.name='Popular Writer';
" | tr -d '\n' | xargs)"
check "User A has 'Popular Writer' badge at 50 likes" "$POPULAR_WRITER_BADGE_COUNT" "1"
echo



###########################################################
color_echo "$CYAN_HI" "============== Article delete XP rollback =============="
###########################################################

# Snapshot XP/level before delete
XP_BEFORE_DELETE="$(query_db "SELECT xp FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
LEVEL_BEFORE_DELETE="$(query_db "SELECT level FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"

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
EXPECTED_XP_AFTER_DELETE=$((XP_BEFORE_DELETE - XP_REWARD_CREATE_ARTICLE))

check "XP decreases by article reward after delete" "$XP_AFTER_DELETE" "$EXPECTED_XP_AFTER_DELETE"

# Level should not increase; we just assert it is <= previous level.
if [[ "$LEVEL_AFTER_DELETE" -le "$LEVEL_BEFORE_DELETE" ]]; then
  color_echo "$GREEN" "✔ Level stays valid after delete (did not increase)"
  ((PASS++))
else
  color_echo "$RED" "✘ Level stays valid after delete (got: '$LEVEL_AFTER_DELETE', expected <= '$LEVEL_BEFORE_DELETE')"
  ((FAIL++))
fi
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
REMAINING_ARTICLES="$(query_db "
  SELECT COUNT(*)
  FROM articles
  WHERE author_id='${USER_A_ID}' AND is_removed=false;
" | tr -d '\n' | xargs)"
EXPECTED_REMAINING=$((TOTAL_ARTICLES_FOR_BADGES - 1))
check "Remaining article count matches expected" "$REMAINING_ARTICLES" "$EXPECTED_REMAINING"
echo



echo
if [[ $FAIL -eq 0 ]]; then
  color_echo "$GREEN" "============== ALL $PASS CHECKS PASSED =============="
else
  color_echo "$RED" "$FAIL FAILED / $PASS PASSED"
  exit 1
fi