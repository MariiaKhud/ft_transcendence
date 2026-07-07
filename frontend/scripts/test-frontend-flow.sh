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

color_echo "$BLUE" "9. Checking /edit-profile route"
perform_request "Edit profile route" "${BASE_URL}/edit-profile"
assert_status "200" "Edit profile route"
assert_header_contains 'content-type: text/html' "Edit profile route"
assert_body_contains '<div id="root"></div>' "Edit profile route"

color_echo "$BLUE" "10. Checking /feed route"
perform_request "Feed route" "${BASE_URL}/feed"
assert_status "200" "Feed route"
assert_header_contains 'content-type: text/html' "Feed route"
assert_body_contains '<div id="root"></div>' "Feed route"

# ============================================================================
# [STATIC] Privacy Policy page - Static content, guest accessible
# ============================================================================

color_echo "$BLUE" "11. Checking /privacy-policy route"
perform_request "Privacy Policy route" "${BASE_URL}/privacy-policy"
assert_status "200" "Privacy Policy route"
assert_header_contains 'content-type: text/html' "Privacy Policy route"
assert_body_contains '<div id="root"></div>' "Privacy Policy route"

# ============================================================================
# [STATIC] Terms of Service page - Static content, guest accessible
# ============================================================================

color_echo "$BLUE" "12. Checking /terms-of-service route"
perform_request "Terms of Service route" "${BASE_URL}/terms-of-service"
assert_status "200" "Terms of Service route"
assert_header_contains 'content-type: text/html' "Terms of Service route"
assert_body_contains '<div id="root"></div>' "Terms of Service route"

# ============================================================================
# [ARTICLES] Frontend: Global feed with articles display
# ============================================================================
# Description: Feed page with articles list, filtering, sorting, pagination
# Features: Search, category filter, sort (newest/oldest/most_liked), pagination
# Epic Link: Articles + Feed
# Status: In Progress
# ============================================================================

color_echo "$BLUE" "13. Checking articles API proxy through frontend (/api/articles)"
perform_request "Articles API proxy" "${BASE_URL}/api/articles"
assert_status_one_of "Articles API proxy" "200"
assert_header_contains 'content-type: application/json' "Articles API proxy"

color_echo "$BLUE" "14. Checking articles API with pagination (/api/articles?page=1&limit=5)"
perform_request "Articles API with pagination" "${BASE_URL}/api/articles?page=1&limit=5"
assert_status_one_of "Articles API with pagination" "200"
assert_header_contains 'content-type: application/json' "Articles API with pagination"
assert_body_contains '"pagination"' "Articles API with pagination"

color_echo "$BLUE" "15. Checking articles API with category filter (/api/articles?category=PROGRAMMING)"
perform_request "Articles API with category" "${BASE_URL}/api/articles?category=PROGRAMMING"
assert_status_one_of "Articles API with category" "200"
assert_header_contains 'content-type: application/json' "Articles API with category"

# ============================================================================
# [USERS] Frontend: Edit profile form with displayName, bio, avatar
# ============================================================================
# Description: Form with displayName, bio, avatar upload/delete
# Features: Form rendering, avatar preview, field validation, API integration
# Epic Link: Auth + User Foundation
# Status: Done \u2713
# ============================================================================

# ============================================================================
# [ARTICLES] Frontend: Global feed page (Home)
# ============================================================================
# Description: Paginated ArticleCards on Home ("/"), category filter, sort
#              dropdown (newest/oldest/most_liked), pagination, guest access
# Features: Category filter, sort order, search, pagination, guest accessibility
# Epic Link: Articles + Feed
# Status: Done \u2713
# ============================================================================

color_echo "$BLUE" "16. Checking articles API with sort=oldest"
perform_request "Articles API sort oldest" "${BASE_URL}/api/articles?sort=oldest"
assert_status_one_of "Articles API sort oldest" "200"
assert_header_contains 'content-type: application/json' "Articles API sort oldest"

color_echo "$BLUE" "17. Checking articles API with sort=most_liked"
perform_request "Articles API sort most_liked" "${BASE_URL}/api/articles?sort=most_liked"
assert_status_one_of "Articles API sort most_liked" "200"
assert_header_contains 'content-type: application/json' "Articles API sort most_liked"

color_echo "$BLUE" "18. Checking articles API rejects an invalid sort value"
perform_request "Articles API invalid sort" "${BASE_URL}/api/articles?sort=bogus"
assert_status "400" "Articles API invalid sort"
assert_header_contains 'content-type: application/json' "Articles API invalid sort"

color_echo "$BLUE" "19. Checking articles API with search (/api/articles?search=docker)"
perform_request "Articles API search" "${BASE_URL}/api/articles?search=docker"
assert_status_one_of "Articles API search" "200"
assert_header_contains 'content-type: application/json' "Articles API search"
assert_body_contains '"pagination"' "Articles API search"

color_echo "$BLUE" "20. Checking articles API is guest-accessible (no auth cookie sent)"
perform_request "Articles API guest access" "${BASE_URL}/api/articles"
assert_status "200" "Articles API guest access"
assert_body_contains '"success":true' "Articles API guest access"

color_echo "$BLUE" "21. Checking /feed redirects to the consolidated Home feed"
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

color_echo "$BLUE" "22. Checking articles API response includes ArticleCard fields"
perform_request "Articles API fields" "${BASE_URL}/api/articles?limit=1"
assert_status "200" "Articles API fields"
assert_body_contains '"title"' "Articles API fields"
assert_body_contains '"category"' "Articles API fields"
assert_body_contains '"likeCount"' "Articles API fields"
assert_body_contains '"createdAt"' "Articles API fields"
assert_body_contains '"username"' "Articles API fields"
assert_body_contains '"avatarUrl"' "Articles API fields"

FIRST_ARTICLE_ID="$(grep -o '"id":"[^"]*"' <<<"$LAST_BODY" | head -1 | cut -d'"' -f4)"

color_echo "$BLUE" "23. Checking single article API includes comment count for ArticleCard"
perform_request "Single article API" "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}"
assert_status "200" "Single article API"
assert_body_contains '"commentsCount"' "Single article API"

color_echo "$BLUE" "24. Checking /articles/:id route (ArticleCard link target) serves the SPA shell"
perform_request "Article detail route" "${BASE_URL}/articles/${FIRST_ARTICLE_ID}"
assert_status "200" "Article detail route"
assert_header_contains 'content-type: text/html' "Article detail route"
assert_body_contains '<div id="root"></div>' "Article detail route"

# ============================================================================
# [ARTICLES] Frontend: Article page
# ============================================================================
# Description: Full article view - Markdown content, author info, like
#              button, comments section, edit/delete buttons if own article.
# Features: Article detail data, edit/delete auth guard, like + comments stubs
# Epic Link: Articles + Feed
# Status: Done ✓ (like/comments are UI-only until their backend endpoints exist)
# ============================================================================

color_echo "$BLUE" "25. Checking single article API includes fields the Article page needs"
perform_request "Article page fields" "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}"
assert_status "200" "Article page fields"
assert_body_contains '"authorId"' "Article page fields"
assert_body_contains '"isLikedByCurrentUser"' "Article page fields"
assert_body_contains '"content"' "Article page fields"

color_echo "$BLUE" "26. Checking PATCH /api/articles/:id proxy requires authentication (Edit button)"
perform_request "Edit article proxy" -X PATCH "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}" \
  -H "Content-Type: application/json" -d '{"title":"Unauthorized edit attempt"}'
assert_status "401" "Edit article proxy"
assert_header_contains 'content-type: application/json' "Edit article proxy"

color_echo "$BLUE" "27. Checking DELETE /api/articles/:id proxy requires authentication (Delete button)"
perform_request "Delete article proxy" -X DELETE "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}"
assert_status "401" "Delete article proxy"
assert_header_contains 'content-type: application/json' "Delete article proxy"

color_echo "$BLUE" "28. Checking the like endpoint isn't implemented yet (Like button degrades gracefully)"
perform_request "Like article proxy" -X POST "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}/like"
assert_status "404" "Like article proxy"

color_echo "$BLUE" "29. Checking the comments endpoint isn't implemented yet (Comments section degrades gracefully)"
perform_request "Article comments proxy" "${BASE_URL}/api/articles/${FIRST_ARTICLE_ID}/comments"
assert_status "404" "Article comments proxy"

# ============================================================================
# [ARTICLES] Frontend: Create/Edit article form
# ============================================================================
# Description: Title input, category select, Markdown textarea with preview
#              toggle, validation. Submit calls POST (create) or PATCH (edit).
# Features: Client-side validation, auth-gated submit, Markdown preview
# Epic Link: Articles + Feed
# Status: Done ✓
# ============================================================================

color_echo "$BLUE" "30. Checking /articles/new route serves the SPA shell"
perform_request "Create article route" "${BASE_URL}/articles/new"
assert_status "200" "Create article route"
assert_header_contains 'content-type: text/html' "Create article route"
assert_body_contains '<div id="root"></div>' "Create article route"

color_echo "$BLUE" "31. Checking POST /api/articles proxy requires authentication (Publish button)"
perform_request "Create article proxy" -X POST "${BASE_URL}/api/articles" \
  -H "Content-Type: application/json" -d '{"title":"x","content":"x","category":"LIFE"}'
assert_status "401" "Create article proxy"
assert_header_contains 'content-type: application/json' "Create article proxy"

color_echo "$BLUE" "32. Running frontend production build"
(
  cd "$FRONTEND_DIR"
  npm run build
)

color_echo "$GREEN" "Done. Frontend smoke checks passed."
