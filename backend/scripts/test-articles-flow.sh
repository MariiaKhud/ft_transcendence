#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Articles / Comments / Likes / Search — backend integration tests
# Covers: GET/POST/PATCH/DELETE /api/articles, keyword + field search,
# comments (add/edit/delete/list), and article like/unlike.
# Extracted from test-backend-flow.sh so this feature area (owned by
# Tingting Yang) can be run and maintained independently. Test numbers are
# renumbered sequentially from 1.
# ============================================================================

BASE_URL="${BACKEND_BASE_URL:-https://localhost:8443}"
COOKIE_JAR="$(mktemp)"
EMPTY_COOKIE_JAR="$(mktemp)"
COOKIE_JAR2="$(mktemp)"
COOKIE_JAR_MOD="$(mktemp)"
RUN_ID="$(date +%s | tail -c 5)"
USERNAME="articles_${RUN_ID}"
USERNAME_UPPER="$(printf '%s' "$USERNAME" | tr '[:lower:]' '[:upper:]')"
EMAIL="articles.${RUN_ID}@example.com"
USERNAME2="articles2_${RUN_ID}"
EMAIL2="articles2.${RUN_ID}@example.com"
PASSWORD="strongPass123"
DISPLAY_NAME="Articles Test User"

VERBOSE="${VERBOSE:-0}"

LAST_STATUS=""
LAST_BODY=""
LAST_HEADERS=""
PASS=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
RESET='\033[0m'

color_echo() {
  local color="$1"
  shift
  printf "%b%s%b\n" "$color" "$*" "$RESET"
}

# Portable relative-date helpers — macOS ships BSD date (`-v-1d`), while
# Linux/CI ships GNU date (`-d 'yesterday'`); detect which one we have.
yesterday_date() {
  if date -v-1d +%Y-%m-%d >/dev/null 2>&1; then
    date -u -v-1d +%Y-%m-%d
  else
    date -u -d 'yesterday' +%Y-%m-%d
  fi
}

tomorrow_date() {
  if date -v-1d +%Y-%m-%d >/dev/null 2>&1; then
    date -u -v+1d +%Y-%m-%d
  else
    date -u -d 'tomorrow' +%Y-%m-%d
  fi
}

cleanup() {
  rm -f "$COOKIE_JAR"
  rm -f "$EMPTY_COOKIE_JAR"
  rm -f "$COOKIE_JAR2"
  rm -f "$COOKIE_JAR_MOD"

  if command -v docker >/dev/null 2>&1 && [[ -f "../docker-compose.yml" ]]; then
    docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -c \"DELETE FROM users WHERE email IN ('${EMAIL}', '${EMAIL2}');\"" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

perform_request() {
  local label="$1"
  shift

  local response_file
  local headers_file
  response_file="$(mktemp)"
  headers_file="$(mktemp)"

  local status
  status="$(curl -ksS -D "$headers_file" -o "$response_file" -w '%{http_code}' "$@")"

  LAST_STATUS="$status"
  LAST_BODY="$(cat "$response_file")"
  LAST_HEADERS="$(cat "$headers_file")"

  color_echo "$DIM" "  -> ${label}: HTTP ${status}"
  if [[ "$VERBOSE" == "1" ]]; then
    printf "%s\n" "$LAST_BODY"
  fi

  rm -f "$response_file" "$headers_file"
}

# On failure: print the reason plus enough context to debug, then stop the
# run immediately — later checks build on state (article/comment IDs, XP,
# comment counts) left behind by earlier ones, so continuing past a failure
# would just cascade into confusing, unrelated-looking failures.
fail_check() {
  local label="$1"
  local reason="$2"

  color_echo "$RED" "  ✘ FAIL: ${label}: ${reason}"
  color_echo "$RED" "    last response (HTTP ${LAST_STATUS}): ${LAST_BODY:0:500}"
  exit 1
}

pass_check() {
  local label="$1"
  PASS=$((PASS + 1))
  color_echo "$GREEN" "  ✔ PASS: ${label}"
}

assert_status() {
  local expected="$1"
  local label="$2"

  if [[ "$LAST_STATUS" != "$expected" ]]; then
    fail_check "$label" "expected HTTP ${expected}, got HTTP ${LAST_STATUS}"
  fi
  pass_check "$label"
}

assert_body_contains() {
  local needle="$1"
  local label="$2"

  if ! grep -qF "$needle" <<<"$LAST_BODY"; then
    fail_check "$label" "response did not contain '${needle}'"
  fi
  pass_check "$label"
}

assert_body_not_contains() {
  local needle="$1"
  local label="$2"

  if grep -qF "$needle" <<<"$LAST_BODY"; then
    fail_check "$label" "response unexpectedly contained '${needle}'"
  fi
  pass_check "$label"
}

color_echo "$BLUE" "1. Registering + logging in primary test user: ${EMAIL}"
perform_request "Register" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"displayName\":\"${DISPLAY_NAME}\"}"
assert_status "201" "Register"
assert_body_contains '"success":true' "Register"

perform_request "Login" -c "$COOKIE_JAR" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
assert_status "200" "Login"
assert_body_contains '"success":true' "Login"

# ============================================================================
# [ARTICLES] GET /api/articles — global feed
# ============================================================================
# Description: Fetch paginated articles with filtering and sorting
# Features: pagination, search, category filter, sort by newest/oldest/most_liked
# Epic Link: Articles + Feed
# Status: In Progress

# Test 2: GET /api/articles — default (newest, page 1, limit 20)
color_echo "$BLUE" "2. GET /api/articles — default (newest first, page 1)"
perform_request "Get articles (default)" "${BASE_URL}/api/articles"
assert_status "200" "Get articles (default)"
assert_body_contains '"success":true' "Get articles (default)"
assert_body_contains '"articles":' "Get articles (default)"
assert_body_contains '"pagination":' "Get articles (default)"
assert_body_contains '"page":1' "Get articles (default)"
assert_body_contains '"limit":20' "Get articles (default)"

# Test 3: GET /api/articles — with custom pagination
color_echo "$BLUE" "3. GET /api/articles — with custom pagination (page=1, limit=5)"
perform_request "Get articles (limit 5)" "${BASE_URL}/api/articles?page=1&limit=5"
assert_status "200" "Get articles (limit 5)"
assert_body_contains '"limit":5' "Get articles (limit 5)"

# Test 4: GET /api/articles — with sort by oldest
color_echo "$BLUE" "4. GET /api/articles — sort by oldest"
perform_request "Get articles (oldest)" "${BASE_URL}/api/articles?sort=oldest"
assert_status "200" "Get articles (oldest)"
assert_body_contains '"success":true' "Get articles (oldest)"

# Test 5: GET /api/articles — with sort by most_liked
color_echo "$BLUE" "5. GET /api/articles — sort by most_liked"
perform_request "Get articles (most liked)" "${BASE_URL}/api/articles?sort=most_liked"
assert_status "200" "Get articles (most liked)"
assert_body_contains '"success":true' "Get articles (most liked)"

# Test 6: GET /api/articles — with category filter
color_echo "$BLUE" "6. GET /api/articles — with category filter (PROGRAMMING)"
perform_request "Get articles (category filter)" "${BASE_URL}/api/articles?category=PROGRAMMING"
assert_status "200" "Get articles (category filter)"
assert_body_contains '"success":true' "Get articles (category filter)"

# Test 7: GET /api/articles — with search query
color_echo "$BLUE" "7. GET /api/articles — with search query"
perform_request "Get articles (search)" "${BASE_URL}/api/articles?search=test"
assert_status "200" "Get articles (search)"
assert_body_contains '"success":true' "Get articles (search)"

# Test 8: GET /api/articles — invalid sort parameter
color_echo "$BLUE" "8. GET /api/articles — invalid sort parameter"
perform_request "Get articles (invalid sort)" "${BASE_URL}/api/articles?sort=invalid"
assert_status "400" "Get articles (invalid sort)"

# Test 9: GET /api/articles — pagination boundary (page out of range)
color_echo "$BLUE" "9. GET /api/articles — page parameter (large page number)"
perform_request "Get articles (high page)" "${BASE_URL}/api/articles?page=9999"
assert_status "200" "Get articles (high page)"
assert_body_contains '"articles":[]' "Get articles (high page)"

# ============================================================================
# [ARTICLES] POST /api/articles — create article
# ============================================================================
# Description: Tests for POST /api/articles and GET /api/articles/:id
# Features: create article, XP reward, validation, single article fetch
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

VALID_CONTENT="This is a valid article body. It is long enough to pass the minimum content length requirement of one hundred characters."
LONG_TITLE="$(printf 'T%.0s' {1..121})"

# Test 10: POST /api/articles — unauthenticated
color_echo "$BLUE" "10. POST /api/articles — unauthenticated request"
perform_request "Create article (no auth)" -b "$EMPTY_COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Article\",\"content\":\"${VALID_CONTENT}\",\"category\":\"PROGRAMMING\"}"
assert_status "401" "Create article (no auth)"

# Test 11: POST /api/articles — missing required fields
color_echo "$BLUE" "11. POST /api/articles — missing required fields"
perform_request "Create article (empty body)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{}"
assert_status "400" "Create article (empty body)"

# Test 12: POST /api/articles — content too short (<100 chars)
color_echo "$BLUE" "12. POST /api/articles — content too short"
perform_request "Create article (short content)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Article","content":"Too short.","category":"PROGRAMMING"}'
assert_status "400" "Create article (short content)"

# Test 13: POST /api/articles — title too long (>120 chars)
color_echo "$BLUE" "13. POST /api/articles — title too long (>120 chars)"
perform_request "Create article (long title)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"${LONG_TITLE}\",\"content\":\"${VALID_CONTENT}\",\"category\":\"PROGRAMMING\"}"
assert_status "400" "Create article (long title)"

# Test 14: POST /api/articles — invalid category
color_echo "$BLUE" "14. POST /api/articles — invalid category"
perform_request "Create article (bad category)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Article\",\"content\":\"${VALID_CONTENT}\",\"category\":\"INVALID\"}"
assert_status "400" "Create article (bad category)"

# Test 15: POST /api/articles — valid article creation
color_echo "$BLUE" "15. POST /api/articles — valid article creation"
perform_request "Create article" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"My Test Article\",\"content\":\"${VALID_CONTENT}\",\"category\":\"PROGRAMMING\"}"
assert_status "201" "Create article"
assert_body_contains '"success":true' "Create article"
assert_body_contains '"title":"My Test Article"' "Create article"
assert_body_contains '"category":"PROGRAMMING"' "Create article"
assert_body_contains '"commentsCount":0' "Create article"

ARTICLE_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"
color_echo "$BLUE" "   Created article ID: ${ARTICLE_ID}"

# Test 16: POST /api/articles — XP awarded after publish (author gains 25 XP for the
# article, plus 10 XP from the "First Post" badge, which fires on every account's
# first published article — see getBadgeCondition() in gamification.service.ts)
color_echo "$BLUE" "16. POST /api/articles — author XP increases by 35 after first publish (25 article + 10 First Post badge)"
perform_request "Check XP after publish" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me"
assert_status "200" "Check XP after publish"
assert_body_contains '"xp":35' "Check XP after publish"

# Test 17: GET /api/articles/:id — authenticated user gets isLikedByCurrentUser: false
color_echo "$BLUE" "17. GET /api/articles/:id — authenticated user, not yet liked"
perform_request "Get article by ID (auth)" -b "$COOKIE_JAR" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article by ID (auth)"
assert_body_contains '"success":true' "Get article by ID (auth)"
assert_body_contains '"title":"My Test Article"' "Get article by ID (auth)"
assert_body_contains '"commentsCount":' "Get article by ID (auth)"
assert_body_contains '"isLikedByCurrentUser":false' "Get article by ID (auth)"

# Test 18: GET /api/articles/:id — guest gets isLikedByCurrentUser: null
color_echo "$BLUE" "18. GET /api/articles/:id — guest user gets isLikedByCurrentUser null"
perform_request "Get article by ID (guest)" -b "$EMPTY_COOKIE_JAR" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article by ID (guest)"
assert_body_contains '"isLikedByCurrentUser":null' "Get article by ID (guest)"

# Test 19: GET /api/articles/:id — non-existent article returns 404
color_echo "$BLUE" "19. GET /api/articles/:id — non-existent ID returns 404"
perform_request "Get article (not found)" "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000"
assert_status "404" "Get article (not found)"

# Test 20: GET /api/articles — created article appears in the feed
color_echo "$BLUE" "20. GET /api/articles — created article appears in feed"
perform_request "Get feed after create" "${BASE_URL}/api/articles"
assert_status "200" "Get feed after create"
assert_body_contains '"title":"My Test Article"' "Get feed after create"

# ============================================================================
# [ARTICLES] GET /api/articles?search=&category=&sort= — advanced search
# ============================================================================
# Description: Keyword search across title + content + author username
# (ILIKE), combined with category filter, on top of pagination/sort.
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

# Test 21: GET /api/articles — search matches by title keyword
color_echo "$BLUE" "21. GET /api/articles — search matches title keyword"
perform_request "Search by title" "${BASE_URL}/api/articles?search=Article"
assert_status "200" "Search by title"
assert_body_contains '"title":"My Test Article"' "Search by title"

# Test 22: GET /api/articles — search matches by content keyword
color_echo "$BLUE" "22. GET /api/articles — search matches content keyword"
perform_request "Search by content" "${BASE_URL}/api/articles?search=hundred"
assert_status "200" "Search by content"
assert_body_contains '"title":"My Test Article"' "Search by content"

# Test 23: GET /api/articles — search matches by author username
color_echo "$BLUE" "23. GET /api/articles — search matches author username"
perform_request "Search by author username" "${BASE_URL}/api/articles?search=${USERNAME}"
assert_status "200" "Search by author username"
assert_body_contains '"title":"My Test Article"' "Search by author username"

# Test 24: GET /api/articles — author username search is case-insensitive (ILIKE)
color_echo "$BLUE" "24. GET /api/articles — author username search is case-insensitive"
perform_request "Search by author username (uppercased)" "${BASE_URL}/api/articles?search=${USERNAME_UPPER}"
assert_status "200" "Search by author username (uppercased)"
assert_body_contains '"title":"My Test Article"' "Search by author username (uppercased)"

# Test 25: GET /api/articles — search with no matches returns an empty page
color_echo "$BLUE" "25. GET /api/articles — search with no matches returns empty list"
perform_request "Search (no match)" "${BASE_URL}/api/articles?search=zzz_no_such_match_zzz"
assert_status "200" "Search (no match)"
assert_body_contains '"articles":[]' "Search (no match)"

# Test 26: GET /api/articles — search + category combined (matching category)
color_echo "$BLUE" "26. GET /api/articles — search + matching category returns the article"
perform_request "Search + matching category" "${BASE_URL}/api/articles?search=${USERNAME}&category=PROGRAMMING"
assert_status "200" "Search + matching category"
assert_body_contains '"title":"My Test Article"' "Search + matching category"

# Test 27: GET /api/articles — search + category combined (non-matching category excludes it)
color_echo "$BLUE" "27. GET /api/articles — search + non-matching category excludes the article"
perform_request "Search + non-matching category" "${BASE_URL}/api/articles?search=${USERNAME}&category=CAREER"
assert_status "200" "Search + non-matching category"
assert_body_not_contains '"title":"My Test Article"' "Search + non-matching category"

# ============================================================================
# [ARTICLES] GET /api/articles?title=&author=&content=&postedFrom=&postedTo=
# — advanced search, per-field form
# ============================================================================
# Description: Field-specific filters (title/author/content ILIKE, plus a
# posted-date range), ANDed together and with category/sort, backing the
# dedicated /search page's structured form.
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

# Test 28: GET /api/articles — title field matches
color_echo "$BLUE" "28. GET /api/articles — title field matches"
perform_request "Search by title field" "${BASE_URL}/api/articles?title=Article"
assert_status "200" "Search by title field"
assert_body_contains '"title":"My Test Article"' "Search by title field"

# Test 29: GET /api/articles — author field matches (case-insensitive)
color_echo "$BLUE" "29. GET /api/articles — author field matches (case-insensitive)"
perform_request "Search by author field" "${BASE_URL}/api/articles?author=${USERNAME_UPPER}"
assert_status "200" "Search by author field"
assert_body_contains '"title":"My Test Article"' "Search by author field"

# Test 30: GET /api/articles — content field matches
color_echo "$BLUE" "30. GET /api/articles — content field matches"
perform_request "Search by content field" "${BASE_URL}/api/articles?content=hundred"
assert_status "200" "Search by content field"
assert_body_contains '"title":"My Test Article"' "Search by content field"

# Test 31: GET /api/articles — title + author fields combined (AND, matching)
color_echo "$BLUE" "31. GET /api/articles — title + author fields combined (matching)"
perform_request "Title + author fields (match)" "${BASE_URL}/api/articles?title=Article&author=${USERNAME}"
assert_status "200" "Title + author fields (match)"
assert_body_contains '"title":"My Test Article"' "Title + author fields (match)"

# Test 32: GET /api/articles — title + author fields combined (AND, non-matching author excludes it)
color_echo "$BLUE" "32. GET /api/articles — title + author fields combined (non-matching author excludes it)"
perform_request "Title + author fields (no match)" "${BASE_URL}/api/articles?title=Article&author=${USERNAME2}"
assert_status "200" "Title + author fields (no match)"
assert_body_not_contains '"title":"My Test Article"' "Title + author fields (no match)"

# Test 33: GET /api/articles — posted date range includes the just-created article
color_echo "$BLUE" "33. GET /api/articles — posted date range includes today's article"
POSTED_FROM="$(yesterday_date)"
POSTED_TO="$(tomorrow_date)"
perform_request "Posted date range (match)" "${BASE_URL}/api/articles?author=${USERNAME}&postedFrom=${POSTED_FROM}&postedTo=${POSTED_TO}"
assert_status "200" "Posted date range (match)"
assert_body_contains '"title":"My Test Article"' "Posted date range (match)"

# Test 34: GET /api/articles — posted date range excludes the article when postedTo is in the past
color_echo "$BLUE" "34. GET /api/articles — posted date range excludes when postedTo is in the past"
PAST_DATE="$(yesterday_date)"
perform_request "Posted date range (excluded)" "${BASE_URL}/api/articles?author=${USERNAME}&postedTo=${PAST_DATE}"
assert_status "200" "Posted date range (excluded)"
assert_body_not_contains '"title":"My Test Article"' "Posted date range (excluded)"

# Test 35: GET /api/articles — invalid postedFrom returns 400
color_echo "$BLUE" "35. GET /api/articles — invalid postedFrom returns 400"
perform_request "Invalid postedFrom" "${BASE_URL}/api/articles?postedFrom=not-a-date"
assert_status "400" "Invalid postedFrom"

# ============================================================================
# [ARTICLES] PATCH /api/articles/:id — edit article
# ============================================================================
# Description: Tests for PATCH /api/articles/:id (author-only edit)
# Features: partial update, ownership check, validation, auth requirement
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

UPDATED_CONTENT="This is the updated article body. It is also long enough to pass the minimum content length requirement of one hundred characters."

# Test 36: Register + login a second user to test author-only enforcement
color_echo "$BLUE" "36. Registering a second user for author-only PATCH checks"
perform_request "Register (user2)" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"username\":\"${USERNAME2}\",\"password\":\"${PASSWORD}\",\"displayName\":\"Second Test User\"}"
assert_status "201" "Register (user2)"

perform_request "Login (user2)" -c "$COOKIE_JAR2" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL2}\",\"password\":\"${PASSWORD}\"}"
assert_status "200" "Login (user2)"

# Test 37: PATCH /api/articles/:id — unauthenticated
color_echo "$BLUE" "37. PATCH /api/articles/:id — unauthenticated request"
perform_request "Edit article (no auth)" -b "$EMPTY_COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title"}'
assert_status "401" "Edit article (no auth)"

# Test 38: PATCH /api/articles/:id — non-author is forbidden
color_echo "$BLUE" "38. PATCH /api/articles/:id — non-author forbidden"
perform_request "Edit article (non-author)" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hacked Title"}'
assert_status "403" "Edit article (non-author)"

# Test 39: PATCH /api/articles/:id — non-existent article
color_echo "$BLUE" "39. PATCH /api/articles/:id — non-existent article returns 404"
perform_request "Edit article (not found)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{"title":"Does Not Matter"}'
assert_status "404" "Edit article (not found)"

# Test 40: PATCH /api/articles/:id — empty body is rejected
color_echo "$BLUE" "40. PATCH /api/articles/:id — empty body rejected"
perform_request "Edit article (empty body)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{}'
assert_status "400" "Edit article (empty body)"

# Test 41: PATCH /api/articles/:id — invalid category
color_echo "$BLUE" "41. PATCH /api/articles/:id — invalid category"
perform_request "Edit article (bad category)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"category":"INVALID"}'
assert_status "400" "Edit article (bad category)"

# Test 42: PATCH /api/articles/:id — content too short
color_echo "$BLUE" "42. PATCH /api/articles/:id — content too short"
perform_request "Edit article (short content)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Too short."}'
assert_status "400" "Edit article (short content)"

# Test 43: PATCH /api/articles/:id — title too long
color_echo "$BLUE" "43. PATCH /api/articles/:id — title too long"
perform_request "Edit article (long title)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"${LONG_TITLE}\"}"
assert_status "400" "Edit article (long title)"

# Test 44: PATCH /api/articles/:id — author partial update (title only)
color_echo "$BLUE" "44. PATCH /api/articles/:id — author updates title only"
perform_request "Edit article (title)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Updated Article Title"}'
assert_status "200" "Edit article (title)"
assert_body_contains '"success":true' "Edit article (title)"
assert_body_contains '"title":"My Updated Article Title"' "Edit article (title)"

# Test 45: PATCH /api/articles/:id — author updates content + category
color_echo "$BLUE" "45. PATCH /api/articles/:id — author updates content and category"
perform_request "Edit article (content+category)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${UPDATED_CONTENT}\",\"category\":\"CAREER\"}"
assert_status "200" "Edit article (content+category)"
assert_body_contains "\"content\":\"${UPDATED_CONTENT}\"" "Edit article (content+category)"
assert_body_contains '"category":"CAREER"' "Edit article (content+category)"
# Title from the previous edit should be untouched by this partial update
assert_body_contains '"title":"My Updated Article Title"' "Edit article (content+category)"

# Test 46: GET /api/articles/:id — reflects the persisted edits
color_echo "$BLUE" "46. GET /api/articles/:id — edits are persisted"
perform_request "Get article after edit" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article after edit"
assert_body_contains '"title":"My Updated Article Title"' "Get article after edit"
assert_body_contains "\"content\":\"${UPDATED_CONTENT}\"" "Get article after edit"
assert_body_contains '"category":"CAREER"' "Get article after edit"

# ============================================================================
# [COMMENTS] POST /api/articles/:id/comments — add comment
# ============================================================================
# Description: Tests for POST /api/articles/:id/comments
# Features: content validation (1-1000 chars), auth requirement, article
# existence check, commentsCount bump, notification to article author
# (skipped when commenting on your own article)
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

LONG_COMMENT="$(printf 'c%.0s' {1..1001})"
MAX_COMMENT="$(printf 'c%.0s' {1..1000})"

perform_request "Whoami for comment notification checks" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me" >/dev/null
AUTHOR_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"

NOTIF_CHECK_ENABLED=0
count_author_comment_notifications() {
  docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM notifications WHERE user_id = '${AUTHOR_ID}' AND type = 'COMMENT' AND ref_id = '${ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]'
}

if command -v docker >/dev/null 2>&1 && [[ -n "$AUTHOR_ID" ]]; then
  INITIAL_NOTIF_COUNT="$(count_author_comment_notifications)"
  if [[ "$INITIAL_NOTIF_COUNT" =~ ^[0-9]+$ ]]; then
    NOTIF_CHECK_ENABLED=1
  fi
fi

# Test 47: POST /api/articles/:id/comments — unauthenticated
color_echo "$BLUE" "47. POST /api/articles/:id/comments — unauthenticated request"
perform_request "Add comment (no auth)" -b "$EMPTY_COOKIE_JAR" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Nice article!"}'
assert_status "401" "Add comment (no auth)"

# Test 48: POST /api/articles/:id/comments — empty content
color_echo "$BLUE" "48. POST /api/articles/:id/comments — empty content rejected"
perform_request "Add comment (empty content)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":""}'
assert_status "400" "Add comment (empty content)"

# Test 49: POST /api/articles/:id/comments — whitespace-only content
color_echo "$BLUE" "49. POST /api/articles/:id/comments — whitespace-only content rejected"
perform_request "Add comment (whitespace content)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"   "}'
assert_status "400" "Add comment (whitespace content)"

# Test 50: POST /api/articles/:id/comments — content too long (>1000 chars)
color_echo "$BLUE" "50. POST /api/articles/:id/comments — content too long (>1000 chars)"
perform_request "Add comment (too long)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${LONG_COMMENT}\"}"
assert_status "400" "Add comment (too long)"

# Test 51: POST /api/articles/:id/comments — non-existent article
color_echo "$BLUE" "51. POST /api/articles/:id/comments — non-existent article returns 404"
perform_request "Add comment (not found)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Nice article!"}'
assert_status "404" "Add comment (not found)"

# Test 52: POST /api/articles/:id/comments — valid comment at max length (1000 chars)
color_echo "$BLUE" "52. POST /api/articles/:id/comments — valid comment at max length (1000 chars)"
perform_request "Add comment (max length)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${MAX_COMMENT}\"}"
assert_status "201" "Add comment (max length)"
assert_body_contains '"success":true' "Add comment (max length)"
assert_body_contains "\"content\":\"${MAX_COMMENT}\"" "Add comment (max length)"
assert_body_contains "\"articleId\":\"${ARTICLE_ID}\"" "Add comment (max length)"

MAX_COMMENT_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"

# Test 53: POST /api/articles/:id/comments — valid comment by non-author
color_echo "$BLUE" "53. POST /api/articles/:id/comments — non-author adds a comment"
perform_request "Add comment (non-author)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Great read, thanks for sharing!"}'
assert_status "201" "Add comment (non-author)"
assert_body_contains '"content":"Great read, thanks for sharing!"' "Add comment (non-author)"
assert_body_contains "\"username\":\"${USERNAME2}\"" "Add comment (non-author)"

COMMENT_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"
color_echo "$BLUE" "   Created comment ID: ${COMMENT_ID}"

# Test 54: GET /api/articles/:id — commentsCount reflects the new comments
color_echo "$BLUE" "54. GET /api/articles/:id — commentsCount increases after comments"
perform_request "Get article after comments" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article after comments"
assert_body_contains '"commentsCount":2' "Get article after comments"

# Test 55: GET /api/articles — the feed list's comment count also reflects the new comments.
# Regression guard: articleSummarySelect used to omit `_count` entirely, so feed
# cards always showed a stale/zero comment count no matter how many comments existed.
color_echo "$BLUE" "55. GET /api/articles — feed list comment count increases after comments"
perform_request "Get feed after comments" "${BASE_URL}/api/articles?author=${USERNAME}"
assert_status "200" "Get feed after comments"
assert_body_contains '"_count":{"comments":2}' "Get feed after comments"

# Test 56: non-author comments trigger a notification to the article author
if [[ "$NOTIF_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "56. Verifying notifications were created for the article author"
  NOTIF_COUNT_AFTER_OTHERS="$(count_author_comment_notifications)"
  EXPECTED_COUNT=$((INITIAL_NOTIF_COUNT + 2))
  if [[ "$NOTIF_COUNT_AFTER_OTHERS" == "$EXPECTED_COUNT" ]]; then
    pass_check "Author received ${EXPECTED_COUNT} COMMENT notification(s) as expected"
  else
    fail_check "Comment notification count" "expected ${EXPECTED_COUNT} COMMENT notifications, got ${NOTIF_COUNT_AFTER_OTHERS}"
  fi
else
  color_echo "$YELLOW" "56. Notification DB check skipped (docker/psql not reachable)"
fi

# Test 57: POST /api/articles/:id/comments — author comments on their own article
color_echo "$BLUE" "57. POST /api/articles/:id/comments — author comments on own article"
perform_request "Add comment (self)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/comments" \
  -H "Content-Type: application/json" \
  -d '{"content":"Thanks everyone for reading!"}'
assert_status "201" "Add comment (self)"
assert_body_contains "\"username\":\"${USERNAME}\"" "Add comment (self)"

# Test 58: self-comment does NOT trigger a self-notification
if [[ "$NOTIF_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "58. Verifying no self-notification is created for the author's own comment"
  NOTIF_COUNT_AFTER_SELF="$(count_author_comment_notifications)"
  if [[ "$NOTIF_COUNT_AFTER_SELF" == "$NOTIF_COUNT_AFTER_OTHERS" ]]; then
    pass_check "No self-notification created (still ${NOTIF_COUNT_AFTER_SELF})"
  else
    fail_check "Self-comment notification count" "self-comment unexpectedly created a notification (${NOTIF_COUNT_AFTER_OTHERS} -> ${NOTIF_COUNT_AFTER_SELF})"
  fi
else
  color_echo "$YELLOW" "58. Self-notification DB check skipped (docker/psql not reachable)"
fi

# ============================================================================
# [COMMENTS] PATCH /api/comments/:id — edit comment
# ============================================================================
# Description: Tests for PATCH /api/comments/:id
# Features: author-only edit, content validation (1-1000 chars), auth requirement
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

# Test 59: PATCH /api/comments/:id — unauthenticated
color_echo "$BLUE" "59. PATCH /api/comments/:id — unauthenticated request"
perform_request "Edit comment (no auth)" -b "$EMPTY_COOKIE_JAR" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hacked comment"}'
assert_status "401" "Edit comment (no auth)"

# Test 60: PATCH /api/comments/:id — non-author is forbidden
color_echo "$BLUE" "60. PATCH /api/comments/:id — non-author forbidden"
perform_request "Edit comment (non-author)" -b "$COOKIE_JAR" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hacked comment"}'
assert_status "403" "Edit comment (non-author)"

# Test 61: PATCH /api/comments/:id — non-existent comment
color_echo "$BLUE" "61. PATCH /api/comments/:id — non-existent comment returns 404"
perform_request "Edit comment (not found)" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/comments/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -d '{"content":"Does not matter"}'
assert_status "404" "Edit comment (not found)"

# Test 62: PATCH /api/comments/:id — empty content rejected
color_echo "$BLUE" "62. PATCH /api/comments/:id — empty content rejected"
perform_request "Edit comment (empty content)" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"   "}'
assert_status "400" "Edit comment (empty content)"

# Test 63: PATCH /api/comments/:id — content too long (>1000 chars)
color_echo "$BLUE" "63. PATCH /api/comments/:id — content too long (>1000 chars)"
perform_request "Edit comment (too long)" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${LONG_COMMENT}\"}"
assert_status "400" "Edit comment (too long)"

# Test 64: PATCH /api/comments/:id — author edits their own comment
color_echo "$BLUE" "64. PATCH /api/comments/:id — author edits own comment"
perform_request "Edit comment" -b "$COOKIE_JAR2" -X PATCH "${BASE_URL}/api/comments/${COMMENT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Edited: great read, thanks for sharing!"}'
assert_status "200" "Edit comment"
assert_body_contains '"success":true' "Edit comment"
assert_body_contains '"content":"Edited: great read, thanks for sharing!"' "Edit comment"
assert_body_contains "\"id\":\"${COMMENT_ID}\"" "Edit comment"

# Test 65: GET /api/articles/:id — edit is persisted and commentsCount unchanged
color_echo "$BLUE" "65. GET /api/articles/:id — comment edit does not change commentsCount"
perform_request "Get article after comment edit" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article after comment edit"
assert_body_contains '"commentsCount":3' "Get article after comment edit"

# ============================================================================
# [COMMENTS] DELETE /api/comments/:id — delete comment
# ============================================================================
# Description: Tests for DELETE /api/comments/:id
# Features: author hard-deletes own comment; moderator/admin soft-removes with
# a required reason (1-500 chars); auth requirement; ownership/role enforcement
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

# Log in as the seeded moderator account to test the moderator soft-remove path.
# Skipped gracefully if the seed data isn't present (e.g. a fresh, unseeded DB).
MOD_CHECK_ENABLED=0
perform_request "Login (moderator seed)" -c "$COOKIE_JAR_MOD" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"carol@example.com","password":"password123"}'
if [[ "$LAST_STATUS" == "200" ]]; then
  MOD_CHECK_ENABLED=1
  color_echo "$GREEN" "Login (moderator seed): moderator account available for role tests"
else
  color_echo "$YELLOW" "Login (moderator seed): skipped moderator tests (seed data unavailable)"
fi

# Test 66: DELETE /api/comments/:id — unauthenticated
color_echo "$BLUE" "66. DELETE /api/comments/:id — unauthenticated request"
perform_request "Delete comment (no auth)" -b "$EMPTY_COOKIE_JAR" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}"
assert_status "401" "Delete comment (no auth)"

# Test 67: DELETE /api/comments/:id — neither the comment author nor a moderator
color_echo "$BLUE" "67. DELETE /api/comments/:id — non-author, non-moderator forbidden"
perform_request "Delete comment (forbidden)" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}"
assert_status "403" "Delete comment (forbidden)"

if [[ "$MOD_CHECK_ENABLED" == "1" ]]; then
  # Test 68: DELETE /api/comments/:id — moderator soft-remove without a reason
  color_echo "$BLUE" "68. DELETE /api/comments/:id — moderator soft-remove missing reason"
  perform_request "Delete comment (mod, no reason)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d '{}'
  assert_status "400" "Delete comment (mod, no reason)"

  # Test 69: DELETE /api/comments/:id — moderator soft-remove with whitespace-only reason
  color_echo "$BLUE" "69. DELETE /api/comments/:id — moderator soft-remove whitespace reason"
  perform_request "Delete comment (mod, blank reason)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d '{"reason":"   "}'
  assert_status "400" "Delete comment (mod, blank reason)"

  # Test 70: DELETE /api/comments/:id — moderator soft-remove with oversized reason (>500 chars)
  color_echo "$BLUE" "70. DELETE /api/comments/:id — moderator soft-remove reason too long"
  LONG_REASON="$(printf 'r%.0s' {1..501})"
  perform_request "Delete comment (mod, long reason)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"reason\":\"${LONG_REASON}\"}"
  assert_status "400" "Delete comment (mod, long reason)"

  # Test 71: DELETE /api/comments/:id — moderator soft-removes with a valid reason
  color_echo "$BLUE" "71. DELETE /api/comments/:id — moderator soft-remove with valid reason"
  perform_request "Delete comment (mod)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Violates community guidelines"}'
  assert_status "200" "Delete comment (mod)"
  assert_body_contains '"isRemoved":true' "Delete comment (mod)"
  assert_body_contains '"removedReason":"Violates community guidelines"' "Delete comment (mod)"

  # Test 72: DELETE /api/comments/:id — already soft-removed comment is gone (404)
  color_echo "$BLUE" "72. DELETE /api/comments/:id — already-removed comment returns 404"
  perform_request "Delete comment (already removed)" -b "$COOKIE_JAR_MOD" -X DELETE "${BASE_URL}/api/comments/${COMMENT_ID}" \
    -H "Content-Type: application/json" \
    -d '{"reason":"again"}'
  assert_status "404" "Delete comment (already removed)"
else
  color_echo "$YELLOW" "68-72. Moderator soft-remove tests skipped (seed data unavailable)"
fi

# Test 73: DELETE /api/comments/:id — author hard-deletes their own comment
color_echo "$BLUE" "73. DELETE /api/comments/:id — author hard-deletes own comment"
perform_request "Delete comment (author)" -b "$COOKIE_JAR2" -X DELETE "${BASE_URL}/api/comments/${MAX_COMMENT_ID}"
assert_status "200" "Delete comment (author)"
assert_body_contains "\"id\":\"${MAX_COMMENT_ID}\"" "Delete comment (author)"

# Test 74: DELETE /api/comments/:id — hard-deleted comment is gone (404)
color_echo "$BLUE" "74. DELETE /api/comments/:id — hard-deleted comment returns 404 on re-delete"
perform_request "Delete comment (already deleted)" -b "$COOKIE_JAR2" -X DELETE "${BASE_URL}/api/comments/${MAX_COMMENT_ID}"
assert_status "404" "Delete comment (already deleted)"

# Test 75: GET /api/articles/:id — commentsCount reflects the removed/deleted comments
color_echo "$BLUE" "75. GET /api/articles/:id — commentsCount excludes removed and deleted comments"
perform_request "Get article after comment deletions" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article after comment deletions"
if [[ "$MOD_CHECK_ENABLED" == "1" ]]; then
  assert_body_contains '"commentsCount":1' "Get article after comment deletions"
else
  assert_body_contains '"commentsCount":2' "Get article after comment deletions"
fi

# ============================================================================
# [COMMENTS] GET /api/articles/:id/comments — list comments
# ============================================================================
# Description: Tests for GET /api/articles/:id/comments
# Features: public (no auth required), oldest-first ordering, includes
# soft-removed comments (the frontend decides how to render them), excludes
# hard-deleted comments, 404 for a non-existent article
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

# Test 76: GET /api/articles/:id/comments — public request succeeds
color_echo "$BLUE" "76. GET /api/articles/:id/comments — public request returns the comment list"
perform_request "List comments" -b "$EMPTY_COOKIE_JAR" "${BASE_URL}/api/articles/${ARTICLE_ID}/comments"
assert_status "200" "List comments"
assert_body_contains '"success":true' "List comments"

# Test 77: hard-deleted comment is excluded from the list
color_echo "$BLUE" "77. GET /api/articles/:id/comments — hard-deleted comment is excluded"
assert_body_not_contains "\"id\":\"${MAX_COMMENT_ID}\"" "List comments"

# Test 78: the surviving self-comment is present
color_echo "$BLUE" "78. GET /api/articles/:id/comments — surviving comment is present"
assert_body_contains '"content":"Thanks everyone for reading!"' "List comments"

# Test 79: comments are ordered oldest first
color_echo "$BLUE" "79. GET /api/articles/:id/comments — comments are ordered oldest first"
FIRST_POS="$(grep -bo 'Edited: great read, thanks for sharing!' <<<"$LAST_BODY" | head -1 | cut -d: -f1)"
SECOND_POS="$(grep -bo 'Thanks everyone for reading!' <<<"$LAST_BODY" | head -1 | cut -d: -f1)"
if [[ -n "$FIRST_POS" && -n "$SECOND_POS" && "$FIRST_POS" -lt "$SECOND_POS" ]]; then
  pass_check "List comments ordering: oldest-first confirmed"
else
  fail_check "List comments ordering" "expected the earlier comment to appear first (positions: ${FIRST_POS:-?} vs ${SECOND_POS:-?})"
fi

if [[ "$MOD_CHECK_ENABLED" == "1" ]]; then
  # Test 80: soft-removed comment is still included, with isRemoved + removedReason
  color_echo "$BLUE" "80. GET /api/articles/:id/comments — soft-removed comment included with reason"
  assert_body_contains '"isRemoved":true' "List comments"
  assert_body_contains '"removedReason":"Violates community guidelines"' "List comments"
else
  color_echo "$YELLOW" "80. Soft-removed comment check skipped (moderator tests were skipped)"
fi

# Test 81: GET /api/articles/:id/comments — non-existent article returns 404
color_echo "$BLUE" "81. GET /api/articles/:id/comments — non-existent article returns 404"
perform_request "List comments (not found)" "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000/comments"
assert_status "404" "List comments (not found)"

# ============================================================================
# [LIKES] POST /api/articles/:id/like — like or unlike (toggle)
# ============================================================================
# Description: Tests for POST /api/articles/:id/like
# Features: toggle like/unlike, likeCount increment/decrement, isLikedByCurrentUser
# per-viewer, notification to article author on like (skipped on unlike),
# self-like rejected with 400, auth requirement, article existence check
# Epic Link: Comments + Notifications
# Status: Done ✓
# ============================================================================

count_author_like_notifications() {
  docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM notifications WHERE user_id = '${AUTHOR_ID}' AND type = 'LIKE' AND ref_id = '${ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]'
}

if [[ "$NOTIF_CHECK_ENABLED" == "1" ]]; then
  LIKE_NOTIF_BASELINE="$(count_author_like_notifications)"
fi

# Test 82: POST /api/articles/:id/like — unauthenticated
color_echo "$BLUE" "82. POST /api/articles/:id/like — unauthenticated request"
perform_request "Like article (no auth)" -b "$EMPTY_COOKIE_JAR" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/like"
assert_status "401" "Like article (no auth)"

# Test 83: POST /api/articles/:id/like — non-existent article
color_echo "$BLUE" "83. POST /api/articles/:id/like — non-existent article returns 404"
perform_request "Like article (not found)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000/like"
assert_status "404" "Like article (not found)"

# Test 84: POST /api/articles/:id/like — non-author likes the article (toggle on)
color_echo "$BLUE" "84. POST /api/articles/:id/like — non-author likes the article"
perform_request "Like article (user2)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/like"
assert_status "200" "Like article (user2)"
assert_body_contains '"success":true' "Like article (user2)"
assert_body_contains '"liked":true' "Like article (user2)"
assert_body_contains '"likeCount":1' "Like article (user2)"

# Test 85: GET /api/articles/:id — liker sees isLikedByCurrentUser true and likeCount 1
color_echo "$BLUE" "85. GET /api/articles/:id — liker sees isLikedByCurrentUser true"
perform_request "Get article (as liker)" -b "$COOKIE_JAR2" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article (as liker)"
assert_body_contains '"isLikedByCurrentUser":true' "Get article (as liker)"
assert_body_contains '"likeCount":1' "Get article (as liker)"

# Test 86: GET /api/articles/:id — a different viewer (the author) sees isLikedByCurrentUser false, same likeCount
color_echo "$BLUE" "86. GET /api/articles/:id — likeCount is shared but isLikedByCurrentUser is per-viewer"
perform_request "Get article (as author)" -b "$COOKIE_JAR" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article (as author)"
assert_body_contains '"isLikedByCurrentUser":false' "Get article (as author)"
assert_body_contains '"likeCount":1' "Get article (as author)"

# Test 87: liking as a non-author triggers a LIKE notification for the article author
if [[ "$NOTIF_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "87. Verifying a LIKE notification was created for the article author"
  LIKE_NOTIF_AFTER_LIKE="$(count_author_like_notifications)"
  EXPECTED_LIKE_COUNT=$((LIKE_NOTIF_BASELINE + 1))
  if [[ "$LIKE_NOTIF_AFTER_LIKE" == "$EXPECTED_LIKE_COUNT" ]]; then
    pass_check "Author received a LIKE notification as expected"
  else
    fail_check "Like notification count" "expected ${EXPECTED_LIKE_COUNT} LIKE notifications, got ${LIKE_NOTIF_AFTER_LIKE}"
  fi
else
  color_echo "$YELLOW" "87. LIKE notification DB check skipped (docker/psql not reachable)"
fi

# Test 88: POST /api/articles/:id/like — same user toggles again (unlike)
color_echo "$BLUE" "88. POST /api/articles/:id/like — non-author unlikes the article"
perform_request "Unlike article (user2)" -b "$COOKIE_JAR2" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/like"
assert_status "200" "Unlike article (user2)"
assert_body_contains '"liked":false' "Unlike article (user2)"
assert_body_contains '"likeCount":0' "Unlike article (user2)"

# Test 89: GET /api/articles/:id — isLikedByCurrentUser is false again after unlike
color_echo "$BLUE" "89. GET /api/articles/:id — isLikedByCurrentUser false after unlike"
perform_request "Get article (after unlike)" -b "$COOKIE_JAR2" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article (after unlike)"
assert_body_contains '"isLikedByCurrentUser":false' "Get article (after unlike)"
assert_body_contains '"likeCount":0' "Get article (after unlike)"

# Test 90: unliking does NOT create an additional notification
if [[ "$NOTIF_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "90. Verifying unlike does not create a notification"
  LIKE_NOTIF_AFTER_UNLIKE="$(count_author_like_notifications)"
  if [[ "$LIKE_NOTIF_AFTER_UNLIKE" == "$LIKE_NOTIF_AFTER_LIKE" ]]; then
    pass_check "No notification created on unlike (still ${LIKE_NOTIF_AFTER_UNLIKE})"
  else
    fail_check "Unlike notification count" "unlike unexpectedly created a notification (${LIKE_NOTIF_AFTER_LIKE} -> ${LIKE_NOTIF_AFTER_UNLIKE})"
  fi
else
  color_echo "$YELLOW" "90. Unlike notification DB check skipped (docker/psql not reachable)"
fi

# Test 91: POST /api/articles/:id/like — author cannot like their own article
color_echo "$BLUE" "91. POST /api/articles/:id/like — author cannot like own article"
perform_request "Like article (self)" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles/${ARTICLE_ID}/like"
assert_status "400" "Like article (self)"

# Test 92: GET /api/articles/:id — likeCount is unaffected by the rejected self-like attempt
color_echo "$BLUE" "92. GET /api/articles/:id — likeCount unchanged after rejected self-like"
perform_request "Get article (after rejected self-like)" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Get article (after rejected self-like)"
assert_body_contains '"likeCount":0' "Get article (after rejected self-like)"

# Test 93: the rejected self-like attempt does NOT create a notification
if [[ "$NOTIF_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "93. Verifying no notification is created for a rejected self-like"
  LIKE_NOTIF_AFTER_SELF="$(count_author_like_notifications)"
  if [[ "$LIKE_NOTIF_AFTER_SELF" == "$LIKE_NOTIF_AFTER_UNLIKE" ]]; then
    pass_check "No notification created for rejected self-like (still ${LIKE_NOTIF_AFTER_SELF})"
  else
    fail_check "Self-like notification count" "rejected self-like unexpectedly created a notification (${LIKE_NOTIF_AFTER_UNLIKE} -> ${LIKE_NOTIF_AFTER_SELF})"
  fi
else
  color_echo "$YELLOW" "93. Self-like notification DB check skipped (docker/psql not reachable)"
fi

# ============================================================================
# [ARTICLES] DELETE /api/articles/:id — delete article
# ============================================================================
# Description: Tests for DELETE /api/articles/:id (author-only hard delete)
# Features: ownership check, auth requirement, cascade delete of comments/likes
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

# Test 94: DELETE /api/articles/:id — unauthenticated
color_echo "$BLUE" "94. DELETE /api/articles/:id — unauthenticated request"
perform_request "Delete article (no auth)" -b "$EMPTY_COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "401" "Delete article (no auth)"

# Test 95: DELETE /api/articles/:id — non-author is forbidden
color_echo "$BLUE" "95. DELETE /api/articles/:id — non-author forbidden"
perform_request "Delete article (non-author)" -b "$COOKIE_JAR2" -X DELETE "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "403" "Delete article (non-author)"

# Test 96: DELETE /api/articles/:id — non-existent article
color_echo "$BLUE" "96. DELETE /api/articles/:id — non-existent article returns 404"
perform_request "Delete article (not found)" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000"
assert_status "404" "Delete article (not found)"

# Test 97: seed a comment and a like on the article directly in the DB (rather
# than via the API) so this cascade check stays independent of the like/unlike
# toggle state exercised above, and so we can prove the delete cascades.
CASCADE_CHECK_ENABLED=0
perform_request "Whoami for cascade seed" -b "$COOKIE_JAR" "${BASE_URL}/api/auth/me" >/dev/null
USER_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"

if command -v docker >/dev/null 2>&1 && [[ -n "$USER_ID" ]]; then
  color_echo "$BLUE" "97. Seeding a comment + like on the article to verify cascade delete"
  if docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -c \"INSERT INTO comments (id, article_id, author_id, content, updated_at) VALUES (gen_random_uuid(), '${ARTICLE_ID}', '${USER_ID}', 'seed comment', now());\"" >/dev/null 2>&1 \
    && docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -c \"INSERT INTO article_likes (id, article_id, user_id) VALUES (gen_random_uuid(), '${ARTICLE_ID}', '${USER_ID}');\"" >/dev/null 2>&1; then
    CASCADE_CHECK_ENABLED=1
    color_echo "$GREEN" "Seed comment + like: inserted"
  else
    color_echo "$YELLOW" "Seed comment + like: skipped (docker/psql not reachable)"
  fi
else
  color_echo "$YELLOW" "97. Cascade seed skipped (docker not available or user id not resolved)"
fi

# Test 98: DELETE /api/articles/:id — author deletes their own article
color_echo "$BLUE" "98. DELETE /api/articles/:id — author deletes own article"
perform_request "Delete article" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "200" "Delete article"
assert_body_contains '"success":true' "Delete article"

# Test 99: GET /api/articles/:id — deleted article is gone
color_echo "$BLUE" "99. GET /api/articles/:id — deleted article returns 404"
perform_request "Get article after delete" "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "404" "Get article after delete"

# Test 100: DELETE /api/articles/:id — deleting again returns 404 (already gone)
color_echo "$BLUE" "100. DELETE /api/articles/:id — deleting again returns 404"
perform_request "Delete article (again)" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/${ARTICLE_ID}"
assert_status "404" "Delete article (again)"

# Test 101: comments and likes for the deleted article are gone from the DB (cascade)
if [[ "$CASCADE_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "101. Verifying comments and likes were cascade-deleted"
  REMAINING_COMMENTS="$(docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM comments WHERE article_id = '${ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]')"
  REMAINING_LIKES="$(docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM article_likes WHERE article_id = '${ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]')"

  if [[ "$REMAINING_COMMENTS" == "0" && "$REMAINING_LIKES" == "0" ]]; then
    pass_check "Cascade delete: comments and likes removed (0 remaining each)"
  else
    fail_check "Cascade delete" "expected 0 remaining comments/likes, got comments=${REMAINING_COMMENTS} likes=${REMAINING_LIKES}"
  fi
else
  color_echo "$YELLOW" "101. Cascade delete DB check skipped (seed step unavailable)"
fi

# ============================================================================
# [LIKES] POST /api/articles/:id/like — concurrent toggle race
# ============================================================================
# Description: Regression test for a race between two simultaneous like
# requests from the same user on the same article. Before the fix, the
# loser of the race hit an unhandled Prisma unique-constraint error and the
# endpoint returned a bare 500 instead of resolving idempotently.
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

# Test 102: seed a fresh article for the race test, independent of the
# article already deleted above.
color_echo "$BLUE" "102. POST /api/articles — create article for like race test"
perform_request "Create race-test article" -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Like Race Test Article\",\"content\":\"${VALID_CONTENT}\",\"category\":\"PROGRAMMING\"}"
assert_status "201" "Create race-test article"
RACE_ARTICLE_ID="$(echo "$LAST_BODY" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')"

RACE_NOTIF_CHECK_ENABLED=0
count_author_race_like_notifications() {
  docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM notifications WHERE user_id = '${AUTHOR_ID}' AND type = 'LIKE' AND ref_id = '${RACE_ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]'
}
if command -v docker >/dev/null 2>&1 && [[ -n "$AUTHOR_ID" ]]; then
  RACE_NOTIF_BASELINE="$(count_author_race_like_notifications)"
  if [[ "$RACE_NOTIF_BASELINE" =~ ^[0-9]+$ ]]; then
    RACE_NOTIF_CHECK_ENABLED=1
  fi
fi

# Test 103: fire two simultaneous like requests from the same (non-author)
# user and confirm both resolve cleanly and agree on the final state.
color_echo "$BLUE" "103. POST /api/articles/:id/like — two concurrent requests from the same user"
RACE_STATUS_A_FILE="$(mktemp)"
RACE_BODY_A_FILE="$(mktemp)"
RACE_STATUS_B_FILE="$(mktemp)"
RACE_BODY_B_FILE="$(mktemp)"

curl -ksS -b "$COOKIE_JAR2" -o "$RACE_BODY_A_FILE" -w '%{http_code}' -X POST "${BASE_URL}/api/articles/${RACE_ARTICLE_ID}/like" > "$RACE_STATUS_A_FILE" &
PID_A=$!
curl -ksS -b "$COOKIE_JAR2" -o "$RACE_BODY_B_FILE" -w '%{http_code}' -X POST "${BASE_URL}/api/articles/${RACE_ARTICLE_ID}/like" > "$RACE_STATUS_B_FILE" &
PID_B=$!
wait "$PID_A"
wait "$PID_B"

RACE_STATUS_A="$(cat "$RACE_STATUS_A_FILE")"
RACE_BODY_A="$(cat "$RACE_BODY_A_FILE")"
RACE_STATUS_B="$(cat "$RACE_STATUS_B_FILE")"
RACE_BODY_B="$(cat "$RACE_BODY_B_FILE")"
rm -f "$RACE_STATUS_A_FILE" "$RACE_BODY_A_FILE" "$RACE_STATUS_B_FILE" "$RACE_BODY_B_FILE"

color_echo "$DIM" "  -> Concurrent like A: HTTP ${RACE_STATUS_A}"
color_echo "$DIM" "  -> Concurrent like B: HTTP ${RACE_STATUS_B}"

if [[ "$RACE_STATUS_A" == "200" && "$RACE_STATUS_B" == "200" ]]; then
  pass_check "Both concurrent like requests returned HTTP 200 (no unhandled race error)"
else
  LAST_STATUS="${RACE_STATUS_A}/${RACE_STATUS_B}"
  LAST_BODY="A: ${RACE_BODY_A} | B: ${RACE_BODY_B}"
  fail_check "Concurrent like requests" "expected both HTTP 200, got A=${RACE_STATUS_A} B=${RACE_STATUS_B}"
fi

if grep -qF '"liked":true' <<<"$RACE_BODY_A" && grep -qF '"liked":true' <<<"$RACE_BODY_B" \
  && grep -qF '"likeCount":1' <<<"$RACE_BODY_A" && grep -qF '"likeCount":1' <<<"$RACE_BODY_B"; then
  pass_check "Both concurrent responses agree on the resolved state (liked:true, likeCount:1)"
else
  LAST_STATUS="${RACE_STATUS_A}/${RACE_STATUS_B}"
  LAST_BODY="A: ${RACE_BODY_A} | B: ${RACE_BODY_B}"
  fail_check "Concurrent like responses" "expected both to report liked:true and likeCount:1"
fi

# Test 104: GET /api/articles/:id — final likeCount reflects exactly one like
color_echo "$BLUE" "104. GET /api/articles/:id — likeCount is 1 after the race resolves"
perform_request "Get race-test article" "${BASE_URL}/api/articles/${RACE_ARTICLE_ID}"
assert_status "200" "Get race-test article"
assert_body_contains '"likeCount":1' "Get race-test article"

# Test 105: only one LIKE notification was created despite two requests
if [[ "$RACE_NOTIF_CHECK_ENABLED" == "1" ]]; then
  color_echo "$BLUE" "105. Verifying only one LIKE notification was created for the race"
  RACE_NOTIF_AFTER="$(count_author_race_like_notifications)"
  EXPECTED_RACE_NOTIF_COUNT=$((RACE_NOTIF_BASELINE + 1))
  if [[ "$RACE_NOTIF_AFTER" == "$EXPECTED_RACE_NOTIF_COUNT" ]]; then
    pass_check "Exactly one LIKE notification created for the race (${RACE_NOTIF_AFTER})"
  else
    fail_check "Race notification count" "expected ${EXPECTED_RACE_NOTIF_COUNT} LIKE notifications, got ${RACE_NOTIF_AFTER}"
  fi
else
  color_echo "$YELLOW" "105. Race notification DB check skipped (docker/psql not reachable)"
fi

# ============================================================================
# [USERS] DELETE /api/users/me — account deletion decrements liked articles'
# like counts
# ============================================================================
# Description: Regression test verifying that deleting an account which has
# liked another user's article decrements that article's denormalized
# likeCount, instead of leaving it overcounted once the like row is
# cascade-deleted at the DB level (the user-like cascade bypasses the
# application code that normally keeps the counter in sync).
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

# Test 106: DELETE /api/users/me — the liking user (user2, still holding the
# like from the race test above) deletes their own account.
color_echo "$BLUE" "106. DELETE /api/users/me — liking user deletes their own account"
RACE_CSRF_TOKEN="$(awk '$6=="csrf_token" { print $7 }' "$COOKIE_JAR2" | tail -n 1)"
perform_request "Delete liker's account" -b "$COOKIE_JAR2" -X DELETE "${BASE_URL}/api/users/me" \
  -H "x-csrf-token: ${RACE_CSRF_TOKEN}"
assert_status "200" "Delete liker's account"
assert_body_contains '"success":true' "Delete liker's account"

# Test 107: GET /api/articles/:id — likeCount is decremented, not left stale
color_echo "$BLUE" "107. GET /api/articles/:id — likeCount decremented after liker's account deletion"
perform_request "Get race-test article after liker deletion" "${BASE_URL}/api/articles/${RACE_ARTICLE_ID}"
assert_status "200" "Get race-test article after liker deletion"
assert_body_contains '"likeCount":0' "Get race-test article after liker deletion"

# Test 108: articles.like_count and the article_likes row count stay in sync
if command -v docker >/dev/null 2>&1; then
  color_echo "$BLUE" "108. Verifying like_count and article_likes stay consistent at the DB level"
  DB_LIKE_COUNT="$(docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT like_count FROM articles WHERE id = '${RACE_ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]')"
  DB_LIKE_ROWS="$(docker compose exec -T postgres sh -lc "psql -U \"\${POSTGRES_USER:-transcendence}\" -d \"\${POSTGRES_DB:-transcendence}\" -tAc \"SELECT COUNT(*) FROM article_likes WHERE article_id = '${RACE_ARTICLE_ID}';\"" 2>/dev/null | tr -d '[:space:]')"

  if [[ "$DB_LIKE_COUNT" == "0" && "$DB_LIKE_ROWS" == "0" ]]; then
    pass_check "articles.like_count (0) matches article_likes row count (0) after account deletion"
  else
    fail_check "Post-deletion like count consistency" "expected like_count=0 and article_likes rows=0, got like_count=${DB_LIKE_COUNT} rows=${DB_LIKE_ROWS}"
  fi
else
  color_echo "$YELLOW" "108. DB consistency check skipped (docker not reachable)"
fi

# Cleanup: user1 still owns the race-test article; remove it like the rest.
perform_request "Delete race-test article" -b "$COOKIE_JAR" -X DELETE "${BASE_URL}/api/articles/${RACE_ARTICLE_ID}"
assert_status "200" "Delete race-test article"

color_echo "$GREEN" "=============================================="
color_echo "$GREEN" " ALL ${PASS} CHECKS PASSED"
color_echo "$GREEN" "=============================================="

