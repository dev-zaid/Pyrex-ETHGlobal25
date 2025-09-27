#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load env
if [ -f "$ROOT_DIR/.env.local" ]; then
  # shellcheck disable=SC1091
  set -a
  . "$ROOT_DIR/.env.local"
  set +a
else
  echo "ERROR: demo/.env.local not found. Copy demo/.env.local.sample and set values." >&2
  exit 1
fi

echo "Compiling demo packages..."
# Compile TypeScript only when tsconfig.json exists; otherwise require prebuilt dist
PKGS=("facilitator-amoy" "resource-server-express" "service-agent" "client-agent")
for pkg in "${PKGS[@]}"; do
  TS_CONFIG="$ROOT_DIR/a2a/$pkg/tsconfig.json"
  DIST_DIR="$ROOT_DIR/a2a/$pkg/dist"
  if [ -f "$TS_CONFIG" ]; then
    echo "Compiling $pkg..."
    npx -y tsc -p "$TS_CONFIG"
  else
    if [ -d "$DIST_DIR" ]; then
      echo "No tsconfig for $pkg, found existing dist — skipping compile"
    else
      echo "ERROR: No tsconfig and no dist for $pkg ($TS_CONFIG / $DIST_DIR). Please build the package or provide dist files." >&2
      exit 1
    fi
  fi
done

# Kill anything on the demo ports
for port in "${FACILITATOR_PORT:-5401}" "${SERVICE_AGENT_PORT:-5402}" "${RESOURCE_SERVER_PORT:-5403}"; do
  pids=$(lsof -n -iTCP:"$port" -sTCP:LISTEN -t || true)
  if [ -n "$pids" ]; then
    echo "Killing processes on port $port: $pids"
    kill -9 $pids || true
  fi
done

# Start services
echo "Starting Facilitator..."
nohup env PORT="${FACILITATOR_PORT:-5401}" FACILITATOR_PRIVATE_KEY="$FACILITATOR_PRIVATE_KEY" AMOY_RPC_URL="$AMOY_RPC_URL" AMOY_PYUSD_ADDRESS="$AMOY_PYUSD_ADDRESS" REAL_SETTLE="$REAL_SETTLE" node "$ROOT_DIR/a2a/facilitator-amoy/dist/index.js" > /tmp/fac.log 2>&1 &
echo $! > /tmp/fac.pid
sleep 0.6

echo "Starting Resource Server..."
nohup env PORT="${RESOURCE_SERVER_PORT:-5403}" FACILITATOR_URL="$FACILITATOR_URL" node "$ROOT_DIR/a2a/resource-server-express/dist/index.js" > /tmp/res.log 2>&1 &
echo $! > /tmp/res.pid
sleep 0.6

echo "Starting Service Agent..."
nohup env PORT="${SERVICE_AGENT_PORT:-5402}" RESOURCE_SERVER_URL="$RESOURCE_SERVER_URL" node "$ROOT_DIR/a2a/service-agent/dist/index.js" > /tmp/service.log 2>&1 &
echo $! > /tmp/service.pid
sleep 1

# Wait for health endpoints
echo "Waiting for services to become healthy..."
npx wait-on "http://localhost:${FACILITATOR_PORT:-5401}/healthz" "http://localhost:${RESOURCE_SERVER_PORT:-5403}/healthz" "http://localhost:${SERVICE_AGENT_PORT:-5402}/healthz" --timeout 20000 || { echo "Services failed to start in time" >&2; exit 1; }

echo "Running Client Agent to exercise demo..."
# Client agent doesn't listen on an HTTP port, but ensure PORT is unset or set to a non-conflicting value
nohup env PORT="${CLIENT_AGENT_PORT:-}" PRIVATE_KEY="$PRIVATE_KEY" PRIVATE_KEY_ADDRESS="$PRIVATE_KEY_ADDRESS" SERVICE_AGENT_URL="$SERVICE_AGENT_URL" PAYMENT_AMOUNT="$PAYMENT_AMOUNT" node "$ROOT_DIR/a2a/client-agent/dist/index.js" > /tmp/client_run.log 2>&1 || true

echo "Client run finished — printing logs (tail)"

printf "\n--- CLIENT LOG (last 200 lines) ---\n"
tail -n 200 /tmp/client_run.log || true
printf "\n--- FACILITATOR LOG (last 200 lines) ---\n"
tail -n 200 /tmp/fac.log || true
printf "\n--- RESOURCE LOG (last 200 lines) ---\n"
tail -n 200 /tmp/res.log || true
printf "\n--- SERVICE LOG (last 200 lines) ---\n"
tail -n 200 /tmp/service.log || true

echo "Demo run complete. If REAL_SETTLE=true, check the tx hash in facilitator logs and verify on Amoy explorer." 