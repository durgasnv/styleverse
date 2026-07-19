#!/usr/bin/env bash
# One-command way to run StyleVerse locally: installs deps, starts the API
# server and the frontend dev server together, and opens the app in a browser.
set -e
set -m # give each backgrounded job its own process group, so cleanup can kill it and its children together

cd "$(dirname "$0")"

PORT_API=8080
PORT_WEB=20978

# This project targets Node 24 (see .replit). Vite 7 requires Node >=20.19 or
# >=22.12 and fails at runtime on older Node 20.x, so prefer an nvm-installed
# Node 24/22 over an older system default if one's available.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  \. "$HOME/.nvm/nvm.sh"
  nvm use 24 >/dev/null 2>&1 || nvm use 22 >/dev/null 2>&1 || true
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 22 ] 2>/dev/null; then
  echo "Warning: running Node $(node --version 2>/dev/null). This project needs Node >=20.19 (or >=22.12+) for Vite 7 — if the frontend fails to start, install Node 22+ (e.g. via nvm)." >&2
fi

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required but not installed. Install it: https://pnpm.io/installation" >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example."
  echo "Open .env, set MONGODB_URI (and optionally OPENROUTER_API_KEY), then run ./run.sh again."
  exit 1
fi

set -a
source .env
set +a

if [ -z "$MONGODB_URI" ]; then
  echo "MONGODB_URI is not set in .env — add your MongoDB connection string and re-run ./run.sh." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only, this can take a minute)..."
  pnpm install
fi

echo "Starting API server on port $PORT_API..."
(cd artifacts/api-server && PORT="$PORT_API" MONGODB_URI="$MONGODB_URI" OPENROUTER_API_KEY="$OPENROUTER_API_KEY" FASHN_API_KEY="$FASHN_API_KEY" TRYON_ENGINE="$TRYON_ENGINE" pnpm run dev) &
API_PID=$!

cleanup() {
  echo ""
  echo "Shutting down..."
  # Kill the API server's whole process group (pnpm -> esbuild/node), not just
  # the immediate subshell, so nothing keeps holding port 8080 afterward.
  kill -- "-$API_PID" 2>/dev/null || kill "$API_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for the API server to be ready..."
for _ in $(seq 1 60); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT_API/api/healthz" 2>/dev/null)" = "200" ]; then
    echo "API server is up."
    break
  fi
  sleep 1
done

URL="http://localhost:$PORT_WEB"
(
  sleep 3
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1
  elif command -v open >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1
  elif command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -c "Start-Process '$URL'" >/dev/null 2>&1
  fi
) &

echo ""
echo "StyleVerse is starting at $URL — it'll open in your browser automatically."
echo "Press Ctrl+C to stop everything."
echo ""

cd artifacts/styleverse
PORT="$PORT_WEB" BASE_PATH=/ API_PROXY_PORT="$PORT_API" pnpm run dev
