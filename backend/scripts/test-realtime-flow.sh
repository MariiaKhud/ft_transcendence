#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Real-time (Socket.IO) integration tests — comments/likes live-update +
# notification-suppression behavior, on top of the plain HTTP flow covered by
# scripts/test-articles-flow.sh.
#
# Unlike the other test-*-flow.sh scripts (plain curl/psql, no dependencies),
# this one needs a real Socket.IO client to open WebSocket connections and
# assert on pushed events, which bash can't do on its own. The actual test
# logic lives in scripts/test-realtime-flow.mjs (Node + socket.io-client);
# this wrapper just execs it inside the `backend` container, where that
# dependency is installed, so it can still be run the same way as every
# other suite: `./scripts/test-realtime-flow.sh` or `make test-realtime`.
# ============================================================================

BACKEND_BASE_URL="${BACKEND_BASE_URL:-http://localhost:3000}"

docker compose exec -T -e BACKEND_BASE_URL="${BACKEND_BASE_URL}" backend node scripts/test-realtime-flow.mjs
