#!/usr/bin/env bash
set -uo pipefail

# ============================================================
# Gamification API Integration Tests
# TRAN-62: XP and level logic via article create/delete flow
# TRAN-63: Badge award & idempotency checks
# TRAN-65: Leaderboard endpoint, ranking, limit and removed articles
# ============================================================

BASE_URL="${BACKEND_BASE_URL:-https://localhost:8443}"
RUN_ID="$(date +%s | tail -c 5)"
PASSWORD="Password123!"
XP_REWARD_CREATE_ARTICLE=25
TARGET_XP_TO_LEVEL_2=100
ARTICLES_FOR_LEVEL_2=$(( (TARGET_XP_TO_LEVEL_2 + XP_REWARD_CREATE_ARTICLE - 1) / XP_REWARD_CREATE_ARTICLE ))
TOTAL_ARTICLES_FOR_BADGES=20
ARTICLE_CONTENT="Testing XP award on article creation. This article is intentionally long enough to satisfy validation rules and should trigger the gamification reward flow in the backend."

COOKIE_A="$(mktemp)"; COOKIE_B="$(mktemp)"; COOKIE_C="$(mktemp)"
COOKIE_D="$(mktemp)"; COOKIE_E="$(mktemp)"; COOKIE_F="$(mktemp)"

USERNAME_A="gamify_a_${RUN_ID}"; EMAIL_A="${USERNAME_A}@example.com"
USERNAME_B="gamify_b_${RUN_ID}"; EMAIL_B="${USERNAME_B}@example.com"
USERNAME_C="gamify_c_${RUN_ID}"; EMAIL_C="${USERNAME_C}@example.com"
USERNAME_D="gamify_d_${RUN_ID}"; EMAIL_D="${USERNAME_D}@example.com"
USERNAME_E="gamify_e_${RUN_ID}"; EMAIL_E="${USERNAME_E}@example.com"
USERNAME_F="gamify_f_${RUN_ID}"; EMAIL_F="${USERNAME_F}@example.com"

LAST_STATUS=""; LAST_BODY=""; PASS=0; FAIL=0
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CYAN_L='\033[2;36m'; CYAN_HI='\033[0;96m'; RESET='\033[0m'

color_echo() { local color="$1"; shift; printf "%b%s%b\n" "$color" "$*" "$RESET"; }
check() { local label="$1" actual="$2" expected="$3"; if [[ "$actual" == "$expected" ]]; then color_echo "$GREEN" "✔ $label"; ((PASS++)); else color_echo "$RED" "✘ $label (got: '$actual', expected: '$expected')"; ((FAIL++)); fi; }

query_db() {
  docker compose exec -T postgres sh -lc \
    "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -t -A -c \"$1\""
}

perform_request() {
  local label="$1"; shift; local response; response="$(mktemp)"
  LAST_STATUS="$(curl -ksS -o "$response" -w "%{http_code}" "$@")"
  LAST_BODY="$(cat "$response")"; rm -f "$response"
  if [[ "$LAST_STATUS" =~ ^2 ]]; then color_echo "$GREEN" "$label : HTTP $LAST_STATUS"; elif [[ "$LAST_STATUS" =~ ^4 ]]; then color_echo "$YELLOW" "$label : HTTP $LAST_STATUS"; else color_echo "$RED" "$label : HTTP $LAST_STATUS"; fi
  echo "$LAST_BODY"; echo
}

extract_article_id() { echo "$LAST_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

register_and_login() {
  local username="$1" email="$2" cookie="$3"
  perform_request "Register $username" -X POST "$BASE_URL/api/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"username\":\"$username\",\"password\":\"$PASSWORD\"}"
  check "Register $username returns 201" "$LAST_STATUS" "201"
  perform_request "Login $username" -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}" -c "$cookie"
  check "Login $username returns 200" "$LAST_STATUS" "200"
}

create_article() {
  local title="$1" cookie="${2:-$COOKIE_A}"
  perform_request "Create $title" -X POST "$BASE_URL/api/articles" -b "$cookie" -H "Content-Type: application/json" -d "{\"title\":\"$title\",\"content\":\"$ARTICLE_CONTENT\",\"category\":\"PROGRAMMING\"}"
  check "$title returns 201" "$LAST_STATUS" "201"
}

like_article() { curl -ksS -o /dev/null -X POST "$BASE_URL/api/articles/$2/like" -b "$1"; }

cleanup() {
  rm -f "$COOKIE_A" "$COOKIE_B" "$COOKIE_C" "$COOKIE_D" "$COOKIE_E" "$COOKIE_F"
  docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -c \"
DELETE FROM articles WHERE author_id IN (SELECT id FROM users WHERE email IN ('$EMAIL_A','$EMAIL_B','$EMAIL_C','$EMAIL_D','$EMAIL_E','$EMAIL_F') OR email LIKE 'leaderboard_${RUN_ID}_%@example.com');
DELETE FROM users WHERE email IN ('$EMAIL_A','$EMAIL_B','$EMAIL_C','$EMAIL_D','$EMAIL_E','$EMAIL_F') OR email LIKE 'leaderboard_${RUN_ID}_%@example.com';\" >/dev/null" || true
}
trap cleanup EXIT

color_echo "$BLUE" "==========================================="
color_echo "$BLUE" "     Gamification API integration tests    "
color_echo "$BLUE" "==========================================="

perform_request "Health check" "$BASE_URL/health"; check "Health check returns 200" "$LAST_STATUS" "200"
register_and_login "$USERNAME_A" "$EMAIL_A" "$COOKIE_A"
register_and_login "$USERNAME_B" "$EMAIL_B" "$COOKIE_B"
USER_A_ID="$(query_db "SELECT id FROM users WHERE email='${EMAIL_A}';" | tr -d '\n' | xargs)"
[[ -z "$USER_A_ID" ]] && { color_echo "$RED" "Could not find User A in DB"; exit 1; }

INITIAL_XP="$(query_db "SELECT xp FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
INITIAL_LEVEL="$(query_db "SELECT level FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
check "Initial XP is 0" "$INITIAL_XP" "0"; check "Initial level is 1" "$INITIAL_LEVEL" "1"

create_article "Gamification test article 1"; ARTICLE_1_ID="$(extract_article_id)"
XP_AFTER_ONE="$(query_db "SELECT xp FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
LEVEL_AFTER_ONE="$(query_db "SELECT level FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
check "XP increased after first article" "$XP_AFTER_ONE" "$XP_REWARD_CREATE_ARTICLE"; check "Level remains 1 after first article" "$LEVEL_AFTER_ONE" "1"

FIRST_POST="$(query_db "SELECT COUNT(*) FROM user_badges ub JOIN badges b ON b.id=ub.badge_id WHERE ub.user_id='${USER_A_ID}' AND b.name='First Post';" | tr -d '\n' | xargs)"
check "First Post badge is awarded once" "$FIRST_POST" "1"

for ((i=2; i<=ARTICLES_FOR_LEVEL_2; i++)); do create_article "Gamification test article $i"; done
XP_AFTER_LEVEL2="$(query_db "SELECT xp FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
LEVEL_AFTER_LEVEL2="$(query_db "SELECT level FROM users WHERE id='${USER_A_ID}';" | tr -d '\n' | xargs)"
check "XP reaches expected total" "$XP_AFTER_LEVEL2" "$((ARTICLES_FOR_LEVEL_2 * XP_REWARD_CREATE_ARTICLE))"; check "Level becomes 2 at 100 XP" "$LEVEL_AFTER_LEVEL2" "2"

for ((i=ARTICLES_FOR_LEVEL_2+1; i<=TOTAL_ARTICLES_FOR_BADGES; i++)); do create_article "Gamification test article $i"; done
ARTICLE_COUNT="$(query_db "SELECT COUNT(*) FROM articles WHERE author_id='${USER_A_ID}' AND is_removed=false;" | tr -d '\n' | xargs)"
check "User has 20 non-removed articles" "$ARTICLE_COUNT" "$TOTAL_ARTICLES_FOR_BADGES"
for badge in "Consistent Writer" "Prolific Author"; do count="$(query_db "SELECT COUNT(*) FROM user_badges ub JOIN badges b ON b.id=ub.badge_id WHERE ub.user_id='$USER_A_ID' AND b.name='$badge';" | tr -d '\n' | xargs)"; check "$badge badge is awarded" "$count" "1"; done

perform_request "User B likes first article" -X POST "$BASE_URL/api/articles/$ARTICLE_1_ID/like" -b "$COOKIE_B"; check "Like article returns 200" "$LAST_STATUS" "200"
for spec in "C:$EMAIL_C:$COOKIE_C" "D:$EMAIL_D:$COOKIE_D" "E:$EMAIL_E:$COOKIE_E" "F:$EMAIL_F:$COOKIE_F"; do IFS=: read -r letter email cookie <<< "$spec"; register_and_login "gamify_${letter}_${RUN_ID}" "$email" "$cookie"; done

for id in $(query_db "SELECT id FROM articles WHERE author_id='$USER_A_ID' AND is_removed=false ORDER BY created_at ASC OFFSET 1 LIMIT 9;" | tr -d '\r'); do like_article "$COOKIE_B" "$id"; done
for cookie in "$COOKIE_C" "$COOKIE_D" "$COOKIE_E" "$COOKIE_F"; do for id in $(query_db "SELECT id FROM articles WHERE author_id='$USER_A_ID' AND is_removed=false ORDER BY created_at ASC LIMIT 10;" | tr -d '\r'); do like_article "$cookie" "$id"; done; done
TOTAL_LIKES="$(query_db "SELECT COALESCE(SUM(like_count),0) FROM articles WHERE author_id='$USER_A_ID' AND is_removed=false;" | tr -d '\n' | xargs)"
check "Total likes reach 50" "$TOTAL_LIKES" "50"
for badge in "First Like" "Rising Voice" "Popular Writer"; do count="$(query_db "SELECT COUNT(*) FROM user_badges ub JOIN badges b ON b.id=ub.badge_id WHERE ub.user_id='$USER_A_ID' AND b.name='$badge';" | tr -d '\n' | xargs)"; check "$badge badge is awarded" "$count" "1"; done

XP_BEFORE_DELETE="$(query_db "SELECT xp FROM users WHERE id='$USER_A_ID';" | tr -d '\n' | xargs)"; LEVEL_BEFORE_DELETE="$(query_db "SELECT level FROM users WHERE id='$USER_A_ID';" | tr -d '\n' | xargs)"
perform_request "Delete first article" -X DELETE "$BASE_URL/api/articles/$ARTICLE_1_ID" -b "$COOKIE_A"; check "Delete article returns 200" "$LAST_STATUS" "200"
XP_AFTER_DELETE="$(query_db "SELECT xp FROM users WHERE id='$USER_A_ID';" | tr -d '\n' | xargs)"; LEVEL_AFTER_DELETE="$(query_db "SELECT level FROM users WHERE id='$USER_A_ID';" | tr -d '\n' | xargs)"
check "XP decreases by article reward after delete" "$XP_AFTER_DELETE" "$((XP_BEFORE_DELETE-XP_REWARD_CREATE_ARTICLE))"
if [[ "$LEVEL_AFTER_DELETE" -le "$LEVEL_BEFORE_DELETE" ]]; then color_echo "$GREEN" "✔ Level stays valid after delete"; ((PASS++)); else color_echo "$RED" "✘ Level increased after delete"; ((FAIL++)); fi

perform_request "Create article without auth" -X POST "$BASE_URL/api/articles" -H "Content-Type: application/json" -d "{\"title\":\"No auth article\",\"content\":\"$ARTICLE_CONTENT\",\"category\":\"PROGRAMMING\"}"; check "No auth create returns 401" "$LAST_STATUS" "401"

###########################################################
color_echo "$CYAN_HI" "============== TRAN-65 Leaderboard =============="
###########################################################

perform_request "Get empty/current leaderboard" "$BASE_URL/api/users/leaderboard"
check "Leaderboard returns 200" "$LAST_STATUS" "200"

LB_TMP="$(mktemp)"; printf '%s' "$LAST_BODY" > "$LB_TMP"
LB_OK="$(python3 - "$LB_TMP" <<'PY'
import json,sys
try:
    x=json.load(open(sys.argv[1])); print(str(x.get('success') is True).lower())
except Exception: print('false')
PY
)"
check "Leaderboard response success is true" "$LB_OK" "true"
rm -f "$LB_TMP"

LEADERBOARD_CREATED=0
for ((i=1; i<=51; i++)); do username="leaderboard_${RUN_ID}_${i}"; email="${username}@example.com"; status="$(curl -ksS -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$email\",\"username\":\"$username\",\"password\":\"$PASSWORD\"}")"; [[ "$status" == 201 ]] && ((LEADERBOARD_CREATED++)); done
check "Created 51 leaderboard users" "$LEADERBOARD_CREATED" "51"

perform_request "Get leaderboard with 51 users" "$BASE_URL/api/users/leaderboard"
LB_TMP="$(mktemp)"; printf '%s' "$LAST_BODY" > "$LB_TMP"
LB_COUNT="$(python3 - "$LB_TMP" <<'PY'
import json,sys
try: print(len(json.load(open(sys.argv[1])).get('data',[])))
except Exception: print(-1)
PY
)"
check "Leaderboard is limited to 50 users" "$LB_COUNT" "50"
LB_SORTED="$(python3 - "$LB_TMP" <<'PY'
import json,sys
try:
 x=json.load(open(sys.argv[1])).get('data',[]); v=[u.get('totalLikes',0) for u in x]; print(str(v==sorted(v,reverse=True)).lower())
except Exception: print('false')
PY
)"
check "Leaderboard is sorted by totalLikes descending" "$LB_SORTED" "true"
LB_BADGES="$(python3 - "$LB_TMP" <<'PY'
import json,sys
try:
 x=json.load(open(sys.argv[1])).get('data',[]); print(str(all(isinstance(u.get('badges'),list) for u in x)).lower())
except Exception: print('false')
PY
)"
check "Every leaderboard user has a badges array" "$LB_BADGES" "true"
rm -f "$LB_TMP"

create_article "TRAN-65 removed article"
REMOVED_ARTICLE_ID="$(extract_article_id)"

perform_request "Leaderboard before removed article" "$BASE_URL/api/users/leaderboard"
BEFORE_TMP="$(mktemp)"
printf '%s' "$LAST_BODY" > "$BEFORE_TMP"

BEFORE="$(python3 - "$BEFORE_TMP" "$USERNAME_A" <<'PY'
import json,sys
x = next(u for u in json.load(open(sys.argv[1])).get('data', []) if u.get('username') == sys.argv[2])
print(f"{x.get('articleCount')}|{x.get('totalLikes')}")
PY
)"

query_db "UPDATE articles SET is_removed=true WHERE id='$REMOVED_ARTICLE_ID';" >/dev/null

perform_request "Leaderboard after removed article" "$BASE_URL/api/users/leaderboard"
AFTER_TMP="$(mktemp)"
printf '%s' "$LAST_BODY" > "$AFTER_TMP"

AFTER="$(python3 - "$AFTER_TMP" "$USERNAME_A" <<'PY'
import json,sys
x = next(u for u in json.load(open(sys.argv[1])).get('data', []) if u.get('username') == sys.argv[2])
print(f"{x.get('articleCount')}|{x.get('totalLikes')}")
PY
)"

# Parse BEFORE to get the expected totalLikes
BEFORE_LIKES="${BEFORE#*|}"
EXPECTED_AFTER="19|${BEFORE_LIKES}"
check "Removed articles are excluded from leaderboard totals" "$AFTER" "$EXPECTED_AFTER"

rm -f "$BEFORE_TMP" "$AFTER_TMP"

REMAINING_ARTICLES="$(query_db "SELECT COUNT(*) FROM articles WHERE author_id='$USER_A_ID' AND is_removed=false;" | tr -d '\n' | xargs)"
check "Remaining article count is 19 after deleting one" "$REMAINING_ARTICLES" "19"

echo
if [[ $FAIL -eq 0 ]]; then color_echo "$GREEN" "============== ALL $PASS CHECKS PASSED =============="; else color_echo "$RED" "$FAIL FAILED / $PASS PASSED"; exit 1; fi