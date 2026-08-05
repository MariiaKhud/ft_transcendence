#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="$ROOT_DIR/nginx/certs"
MKCERT_ROOT="${HOME}/.mkcert"

mkdir -p "$CERT_DIR" "$MKCERT_ROOT"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert not found. Installing it locally with Go..."
  if ! command -v go >/dev/null 2>&1; then
    echo "Go is required to install mkcert but was not found." >&2
    exit 1
  fi
  export PATH="$PATH:$(go env GOPATH)/bin"
  go install filippo.io/mkcert@latest
fi

export CAROOT="$MKCERT_ROOT"
mkcert -cert-file "$CERT_DIR/cert.pem" -key-file "$CERT_DIR/key.pem" localhost 127.0.0.1 ::1

if command -v mkcert >/dev/null 2>&1; then
  mkcert -install >/dev/null 2>&1 || true
fi

echo "Local certificate generated at $CERT_DIR"
echo "You can now restart nginx with: docker compose restart nginx"
echo "If your browser still shows a warning, trust the mkcert CA from $MKCERT_ROOT/rootCA.pem in your OS or browser certificate store."
echo "For Chromium/Chrome, you can also import it from Settings > Privacy and security > Manage certificates > Authorities (or equivalent)."
