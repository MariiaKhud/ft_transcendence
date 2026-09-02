#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Articles / Comments / Likes / Search — frontend proxy smoke tests
# Checks that the frontend (nginx/Vite) correctly serves the SPA shell for
# article-related routes and proxies the /api/articles + /api/comments
# endpoints. Deep validation/business-logic tests live in the backend's
# scripts/test-articles-flow.sh — this script only covers the frontend's
# routing + reverse-proxy behavior for the same feature area (owned by
# Tingting Yang). Extracted from test-frontend-flow.sh and renumbered
# sequentially from 1.
# ============================================================================

BASE_URL="${FRONTEND_BASE_URL:-https://localhost:8443}"
CURL_INSECURE="${FRONTEND_CURL_INSECURE:-true}"
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

  color_echo "$DIM" "  -> ${label}: HTTP ${status}"
  if [[ "$VERBOSE" == "1" ]]; then
    printf "%s\n" "$LAST_BODY"
  fi

  rm -f "$response_file" "$headers_file"
}

# On failure: print the reason plus enough context to debug, then stop the
# run immediately — later checks build on state (e.g. the first article ID
# found in the feed) left behind by earlier ones.
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

assert_status_one_of() {
  local label="$1"
  shift
  local allowed=("$@")

  for code in "${allowed[@]}"; do
    if [[ "$LAST_STATUS" == "$code" ]]; then
      pass_check "$label"
      return
    fi
  done

  fail_check "$label" "expected one of [${allowed[*]}], got HTTP ${LAST_STATUS}"
}

assert_body_contains() {
  local needle="$1"
  local label="$2"

  if ! grep -q "$needle" <<<"$LAST_BODY"; then
    fail_check "$label" "response did not contain '${needle}'"
  fi
  pass_check "$label"
}

assert_header_contains() {
  local needle="$1"
  local label="$2"

  if ! grep -iq "$needle" <<<"$LAST_HEADERS"; then
    fail_check "$label" "headers did not contain '${needle}'"
  fi
  pass_check "$label"
}

color_echo "$BLUE" "1. Checking /search route (dedicated advanced search page)"
perform_request "Search route" "${BASE_URL}/search"
assert_status "200" "Search route"
assert_header_contains 'content-type: text/html' "Search route"
assert_body_contains '<div id="root"></div>' "Search route"

# ============================================================================
# [ARTICLES] Frontend: Global feed with articles display
# ============================================================================
# Description: Feed page with articles list, filtering, sorting, pagination
# Features: Search, category filter, sort (newest/oldest/most_liked), pagination
# Epic Link: Articles + Feed
# Status: In Progress
# ============================================================================

color_echo "$BLUE" "2. Checking articles API proxy through frontend (/api/articles)"
perform_request "Articles API proxy" "${BASE_URL}/api/articles"
assert_status_one_of "Articles API proxy" "200"
assert_header_contains 'content-type: application/json' "Articles API proxy"

color_echo "$BLUE" "3. Checking articles API with pagination (/api/articles?page=1&limit=5)"
perform_request "Articles API with pagination" "${BASE_URL}/api/articles?page=1&limit=5"
assert_status_one_of "Articles API with pagination" "200"
assert_header_contains 'content-type: application/json' "Articles API with pagination"
assert_body_contains '"pagination"' "Articles API with pagination"

color_echo "$BLUE" "4. Checking articles API with category filter (/api/articles?category=PROGRAMMING)"
perform_request "Articles API with category" "${BASE_URL}/api/articles?category=PROGRAMMING"
assert_status_one_of "Articles API with category" "200"
assert_header_contains 'content-type: application/json' "Articles API with category"

# ============================================================================
# [SEARCH] Frontend: Advanced search page (/search) — per-field form
# ============================================================================
# Description: Structured search form (Title/Author/Content/posted-date
# range) backing the dedicated /search page, proxied through the frontend.
# Features: field-specific filters, AND combination, date range, validation
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

color_echo "$BLUE" "5. Checking articles API with title field (/api/articles?title=test)"
perform_request "Articles API title field" "${BASE_URL}/api/articles?title=test"
assert_status_one_of "Articles API title field" "200"
assert_header_contains 'content-type: application/json' "Articles API title field"
assert_body_contains '"pagination"' "Articles API title field"

color_echo "$BLUE" "6. Checking articles API with author field (/api/articles?author=admin)"
perform_request "Articles API author field" "${BASE_URL}/api/articles?author=admin"
assert_status_one_of "Articles API author field" "200"
assert_header_contains 'content-type: application/json' "Articles API author field"

color_echo "$BLUE" "7. Checking articles API with content field (/api/articles?content=the)"
perform_request "Articles API content field" "${BASE_URL}/api/articles?content=the"
assert_status_one_of "Articles API content field" "200"
assert_header_contains 'content-type: application/json' "Articles API content field"

color_echo "$BLUE" "8. Checking articles API with title+author fields combined"
perform_request "Articles API title+author fields" "${BASE_URL}/api/articles?title=test&author=admin"
assert_status_one_of "Articles API title+author fields" "200"
assert_header_contains 'content-type: application/json' "Articles API title+author fields"

color_echo "$BLUE" "9. Checking articles API with a posted-date range"
perform_request "Articles API date range" "${BASE_URL}/api/articles?postedFrom=2020-01-01&postedTo=2030-01-01"
assert_status_one_of "Articles API date range" "200"
assert_header_contains 'content-type: application/json' "Articles API date range"

color_echo "$BLUE" "10. Checking articles API rejects an invalid postedFrom date"
perform_request "Articles API invalid date" "${BASE_URL}/api/articles?postedFrom=not-a-date"
assert_status "400" "Articles API invalid date"
assert_header_contains 'content-type: application/json' "Articles API invalid date"

# ============================================================================
# [ARTICLES] Frontend: Global feed page (Home)
# ============================================================================
# Description: Paginated ArticleCards on Home ("/"), category filter, sort
#              dropdown (newest/oldest/most_liked), pagination, guest access
# Features: Category filter, sort order, search, pagination, guest accessibility
# Epic Link: Articles + Feed
# Status: Done \u2713
# ============================================================================

color_echo "$BLUE" "11. Checking articles API with sort=oldest"
perform_request "Articles API sort oldest" "${BASE_URL}/api/articles?sort=oldest"
assert_status_one_of "Articles API sort oldest" "200"
assert_header_contains 'content-type: application/json' "Articles API sort oldest"

color_echo "$BLUE" "12. Checking articles API with sort=most_liked"
perform_request "Articles API sort most_liked" "${BASE_URL}/api/articles?sort=most_liked"
assert_status_one_of "Articles API sort most_liked" "200"
assert_header_contains 'content-type: application/json' "Articles API sort most_liked"

color_echo "$BLUE" "13. Checking articles API rejects an invalid sort value"
perform_request "Articles API invalid sort" "${BASE_URL}/api/articles?sort=bogus"
assert_status "400" "Articles API invalid sort"
assert_header_contains 'content-type: application/json' "Articles API invalid sort"

color_echo "$BLUE" "14. Checking articles API with search (/api/articles?search=docker)"
perform_request "Articles API search" "${BASE_URL}/api/articles?search=docker"
assert_status_one_of "Articles API search" "200"
assert_header_contains 'content-type: application/json' "Articles API search"
assert_body_contains '"pagination"' "Articles API search"

color_echo "$BLUE" "15. Checking articles API is guest-accessible (no auth cookie sent)"
perform_request "Articles API guest access" "${BASE_URL}/api/articles"
assert_status "200" "Articles API guest access"
assert_body_contains '"success":true' "Articles API guest access"

color_echo "$BLUE" "16. Checking /feed redirects to the consolidated Home feed"
perform_request "Feed redirect shell" "${BASE_URL}/feed"
assert_status "200" "Feed redirect shell"
assert_header_contains 'content-type: text/html' "Feed redirect shell"
assert_body_contains '<div id="root"></div>' "Feed redirect shell"

# ============================================================================
# [ARTICLES] Frontend: ArticleCard component
# ============================================================================
# Description: Article summary card - title, excerpt, author avatar +
#              username, category badge, like count, comment count, date.
#              Clickable, links to the article page.
# Features: Field rendering, link target, single-article API fields
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

color_echo "$BLUE" "17. Checking articles API response includes ArticleCard fields"
perform_request "Articles API fields" "${BASE_URL}/api/articles?limit=1"
assert_status "200" "Articles API fields"
if grep -q '"articles":\[\]' <<<"$LAST_BODY"; then
  color_echo "$YELLOW" "17. ArticleCard field checks skipped: feed returned no articles"
else
  assert_body_contains '"title"' "Articles API fields"
  assert_body_contains '"category"' "Articles API fields"
  assert_body_contains '"likeCount"' "Articles API fields"
  assert_body_contains '"createdAt"' "Articles API fields"
  assert_body_contains '"username"' "Articles API fields"
  assert_body_contains '"avatarUrl"' "Articles API fields"
  # Regression guard: the feed list used to omit `_count` entirely, so the
  # ArticleCard's comment count (article._count?.comments) was always stale/zero.
  assert_body_contains '"_count":{"comments"' "Articles API fields"
fi

FIRST_ARTICLE_ID="$(grep -o '"id":"[^"]*"' <<<"$LAST_BODY" | head -1 | cut -d'"' -f4 || true)"

if [[ -n "$FIRST_ARTICLE_ID" ]]; then
  color_echo "$BLUE" "18. Checking single article API includes comment count for ArticleCard"
  perform_request "Single article API" "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}"
  assert_status "200" "Single article API"
  assert_body_contains '"commentsCount"' "Single article API"

  color_echo "$BLUE" "19. Checking /articles/:id route (ArticleCard link target) serves the SPA shell"
  perform_request "Article detail route" "${BASE_URL}/articles/${FIRST_ARTICLE_ID}"
  assert_status "200" "Article detail route"
  assert_header_contains 'content-type: text/html' "Article detail route"
  assert_body_contains '<div id="root"></div>' "Article detail route"

  # ============================================================================
  # [ARTICLES] Frontend: Article page
  # ============================================================================
  # Description: Full article view - Markdown content, author info, like
  #              button, comments section, edit/delete buttons if own article.
  # Features: Article detail data, edit/delete auth guard, like stub, comments
  #           section (list, add, edit, delete/soft-remove)
  # Epic Link: Articles + Feed
  # Status: Done ✓
  # ============================================================================

  color_echo "$BLUE" "20. Checking single article API includes fields the Article page needs"
  perform_request "Article page fields" "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}"
  assert_status "200" "Article page fields"
  assert_body_contains '"authorId"' "Article page fields"
  assert_body_contains '"isLikedByCurrentUser"' "Article page fields"
  assert_body_contains '"content"' "Article page fields"

  color_echo "$BLUE" "21. Checking PATCH /api/articles/:id proxy requires authentication (Edit button)"
  perform_request "Edit article proxy" -X PATCH "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}" \
    -H "Content-Type: application/json" -d '{"title":"Unauthorized edit attempt"}'
  assert_status "401" "Edit article proxy"
  assert_header_contains 'content-type: application/json' "Edit article proxy"

  color_echo "$BLUE" "22. Checking DELETE /api/articles/:id proxy requires authentication (Delete button)"
  perform_request "Delete article proxy" -X DELETE "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}"
  assert_status "401" "Delete article proxy"
  assert_header_contains 'content-type: application/json' "Delete article proxy"

  color_echo "$BLUE" "23. Checking POST /api/articles/:id/like proxy requires authentication (Like button)"
  perform_request "Like article proxy" -X POST "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}/like"
  assert_status "401" "Like article proxy"
  assert_header_contains 'content-type: application/json' "Like article proxy"

  color_echo "$BLUE" "24. Checking the comments list proxy returns the article's comments (Comments section)"
  perform_request "Article comments proxy" "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}/comments"
  assert_status "200" "Article comments proxy"
  assert_header_contains 'content-type: application/json' "Article comments proxy"
  assert_body_contains '"success":true' "Article comments proxy"

  color_echo "$BLUE" "25. Checking POST /api/articles/:id/comments proxy requires authentication (Add comment form)"
  perform_request "Add comment proxy" -X POST "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}/comments" \
    -H "Content-Type: application/json" -d '{"content":"Unauthorized comment attempt"}'
  assert_status "401" "Add comment proxy"
  assert_header_contains 'content-type: application/json' "Add comment proxy"

  color_echo "$BLUE" "26. Checking PATCH /api/comments/:id proxy requires authentication (comment Edit button)"
  perform_request "Edit comment proxy" -X PATCH "${BASE_URL}/api/comments/00000000-0000-0000-0000-000000000000" \
    -H "Content-Type: application/json" -d '{"content":"Unauthorized edit attempt"}'
  assert_status "401" "Edit comment proxy"
  assert_header_contains 'content-type: application/json' "Edit comment proxy"

  color_echo "$BLUE" "27. Checking DELETE /api/comments/:id proxy requires authentication (comment Delete/Remove button)"
  perform_request "Delete comment proxy" -X DELETE "${BASE_URL}/api/comments/00000000-0000-0000-0000-000000000000"
  assert_status "401" "Delete comment proxy"
  assert_header_contains 'content-type: application/json' "Delete comment proxy"

  color_echo "$BLUE" "28. Checking the comments list proxy 404s for a non-existent article"
  perform_request "Article comments proxy (not found)" "${BASE_URL}/api/articles/00000000-0000-0000-0000-000000000000/comments"
  assert_status "404" "Article comments proxy (not found)"
else
  color_echo "$YELLOW" "18-28. Article-detail proxy checks skipped: no article available in feed"
fi

# ============================================================================
# [ARTICLES] Frontend: Create/Edit article form
# ============================================================================
# Description: Title input, category select, Markdown textarea with preview
#              toggle, validation. Submit calls POST (create) or PATCH (edit).
# Features: Client-side validation, auth-gated submit, Markdown preview
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

color_echo "$BLUE" "29. Checking /articles/new route serves the SPA shell"
perform_request "Create article route" "${BASE_URL}/articles/new"
assert_status "200" "Create article route"
assert_header_contains 'content-type: text/html' "Create article route"
assert_body_contains '<div id="root"></div>' "Create article route"

color_echo "$BLUE" "30. Checking POST /api/articles proxy requires authentication (Publish button)"
perform_request "Create article proxy" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" -d '{"title":"x","content":"x","category":"LIFE"}'
assert_status "401" "Create article proxy"
assert_header_contains 'content-type: application/json' "Create article proxy"

color_echo "$GREEN" "=============================================="
color_echo "$GREEN" " ALL ${PASS} CHECKS PASSED"
color_echo "$GREEN" "=============================================="
