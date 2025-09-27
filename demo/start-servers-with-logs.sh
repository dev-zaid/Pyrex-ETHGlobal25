#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "$ROOT_DIR/.env.local" ]; then
  echo -e "${GREEN}Loading environment from .env.local${NC}"
  set -a
  . "$ROOT_DIR/.env.local"
  set +a
else
  echo -e "${YELLOW}Warning: .env.local not found. Using default values.${NC}"
  echo -e "${YELLOW}Copy .env.local.sample to .env.local and configure your settings.${NC}"
fi

# Set default values if not provided
FACILITATOR_PORT=${FACILITATOR_PORT:-5401}
SERVICE_AGENT_PORT=${SERVICE_AGENT_PORT:-5402}
RESOURCE_SERVER_PORT=${RESOURCE_SERVER_PORT:-5403}

echo -e "${BLUE}🚀 Starting Pyrex A2A x402 Demo Servers${NC}"
echo -e "${BLUE}==========================================${NC}"

# Function to kill processes on exit
cleanup() {
  echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
  jobs -p | xargs -r kill
  exit 0
}

trap cleanup SIGINT SIGTERM

# Compile TypeScript packages
echo -e "${CYAN}📦 Compiling TypeScript packages...${NC}"
PKGS=("facilitator-amoy" "resource-server-express" "service-agent" "client-agent")
for pkg in "${PKGS[@]}"; do
  TS_CONFIG="$ROOT_DIR/a2a/$pkg/tsconfig.json"
  DIST_DIR="$ROOT_DIR/a2a/$pkg/dist"
  if [ -f "$TS_CONFIG" ]; then
    echo -e "${CYAN}  Compiling $pkg...${NC}"
    npx -y tsc -p "$TS_CONFIG" || {
      echo -e "${RED}❌ Failed to compile $pkg${NC}"
      exit 1
    }
  else
    if [ -d "$DIST_DIR" ]; then
      echo -e "${CYAN}  No tsconfig for $pkg, found existing dist — skipping compile${NC}"
    else
      echo -e "${RED}❌ No tsconfig and no dist for $pkg${NC}"
      exit 1
    fi
  fi
done

# Kill any existing processes on demo ports
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
for port in "$FACILITATOR_PORT" "$SERVICE_AGENT_PORT" "$RESOURCE_SERVER_PORT"; do
  pids=$(lsof -n -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${YELLOW}  Killing processes on port $port: $pids${NC}"
    kill -9 $pids 2>/dev/null || true
  fi
done

# Start Facilitator
echo -e "${GREEN}🔧 Starting Facilitator on port $FACILITATOR_PORT...${NC}"
env PORT="$FACILITATOR_PORT" \
    FACILITATOR_PRIVATE_KEY="${FACILITATOR_PRIVATE_KEY:-}" \
    AMOY_RPC_URL="${AMOY_RPC_URL:-}" \
    AMOY_PYUSD_ADDRESS="${AMOY_PYUSD_ADDRESS:-}" \
    REAL_SETTLE="${REAL_SETTLE:-false}" \
    node "$ROOT_DIR/a2a/facilitator-amoy/dist/index.js" &
FACILITATOR_PID=$!

# Start Resource Server
echo -e "${GREEN}🔧 Starting Resource Server on port $RESOURCE_SERVER_PORT...${NC}"
env PORT="$RESOURCE_SERVER_PORT" \
    FACILITATOR_URL="${FACILITATOR_URL:-http://localhost:$FACILITATOR_PORT}" \
    ADDRESS="${ADDRESS:-0xPayToAddress}" \
    AMOY_PYUSD_ADDRESS="${AMOY_PYUSD_ADDRESS:-0xAmoyPYUSD}" \
    node "$ROOT_DIR/a2a/resource-server-express/dist/index.js" &
RESOURCE_PID=$!

# Start Service Agent
echo -e "${GREEN}🔧 Starting Service Agent on port $SERVICE_AGENT_PORT...${NC}"
env PORT="$SERVICE_AGENT_PORT" \
    RESOURCE_SERVER_URL="${RESOURCE_SERVER_URL:-http://localhost:$RESOURCE_SERVER_PORT}" \
    node "$ROOT_DIR/a2a/service-agent/dist/index.js" &
SERVICE_PID=$!


# Wait for services to become healthy
echo -e "${CYAN}⏳ Waiting for services to become healthy...${NC}"
sleep 2

# Check health endpoints
check_health() {
  local url=$1
  local name=$2
  local max_attempts=30
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    if curl -s "$url" > /dev/null 2>&1; then
      echo -e "${GREEN}✅ $name is healthy${NC}"
      return 0
    fi
    echo -e "${YELLOW}⏳ Waiting for $name... (attempt $attempt/$max_attempts)${NC}"
    sleep 1
    attempt=$((attempt + 1))
  done
  
  echo -e "${RED}❌ $name failed to start within timeout${NC}"
  return 1
}

check_health "http://localhost:$FACILITATOR_PORT/healthz" "Facilitator"
check_health "http://localhost:$RESOURCE_SERVER_PORT/healthz" "Resource Server"
check_health "http://localhost:$SERVICE_AGENT_PORT/healthz" "Service Agent"

echo -e "${GREEN}🎉 All services are running!${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "${CYAN}📊 Service URLs:${NC}"
echo -e "  ${PURPLE}Facilitator:${NC}     http://localhost:$FACILITATOR_PORT"
echo -e "  ${PURPLE}Service Agent:${NC}   http://localhost:$SERVICE_AGENT_PORT"
echo -e "  ${PURPLE}Resource Server:${NC} http://localhost:$RESOURCE_SERVER_PORT"
echo -e "${BLUE}==========================================${NC}"
echo -e "${CYAN}🧪 Test the flow with:${NC}"
echo -e "curl -X POST http://localhost:$SERVICE_AGENT_PORT/a2a \\"
echo -e "  -H \"Content-Type: application/json\" \\"
echo -e "  -d '{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"message/send\", \"params\": {\"skill\": \"premium.summarize\", \"input\": {\"orderId\": \"ORDER_123\", \"amount\": \"10000\", \"text\": \"Test text\"}}}'"
echo -e "${BLUE}==========================================${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Function to show logs with colors (only new lines)
show_logs() {
  local fac_last_line=""
  local res_last_line=""
  local service_last_line=""
  
  while true; do
    if [ -f "/tmp/fac.log" ]; then
      local current_line=$(tail -n 1 /tmp/fac.log 2>/dev/null || echo "")
      if [ "$current_line" != "$fac_last_line" ] && [ -n "$current_line" ]; then
        echo -e "${PURPLE}[FACILITATOR]${NC} $current_line"
        fac_last_line="$current_line"
      fi
    fi
    if [ -f "/tmp/res.log" ]; then
      local current_line=$(tail -n 1 /tmp/res.log 2>/dev/null || echo "")
      if [ "$current_line" != "$res_last_line" ] && [ -n "$current_line" ]; then
        echo -e "${BLUE}[RESOURCE]${NC} $current_line"
        res_last_line="$current_line"
      fi
    fi
    if [ -f "/tmp/service.log" ]; then
      local current_line=$(tail -n 1 /tmp/service.log 2>/dev/null || echo "")
      if [ "$current_line" != "$service_last_line" ] && [ -n "$current_line" ]; then
        echo -e "${GREEN}[SERVICE]${NC} $current_line"
        service_last_line="$current_line"
      fi
    fi
    sleep 1
  done
}

# Start log monitoring in background
show_logs &
LOG_PID=$!

# Wait for any process to exit
wait
