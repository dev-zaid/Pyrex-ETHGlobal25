# Main Seller Agent — Smart Order Router

A TypeScript service that listens for incoming PYUSD liquidity requests and allocates INR payouts across sellers on the FX Bridge orderbook. It reserves liquidity via the hosted orderbook-service, performs (mockable) PYUSD transfers on Polygon, and triggers seller payouts via webhook.

## Features
- Prioritises Polygon PYUSD offers with configurable weights
- Greedy allocator with support for partial fills across sellers
- Reservation life-cycle using the external orderbook-service
- Mockable Polygon ERC20 transfers and UPI payouts
- Express API exposing `/health` and `/route`
- Structured logging with Pino and configurable environment

## Getting started
```bash
cd main-seller-agent
npm install
npm run dev
```

The service starts on `http://localhost:4000` by default. Configure via `.env` using the sample below.

### Example `.env`
```
PORT=4000
ORDERBOOK_BASE_URL=https://pyrex-ethglobal25.onrender.com
CHAIN=polygon
RPC_URL=<polygon-rpc>
PYUSD_ADDRESS=<pyusd-token-address>
AGENT_WALLET_PK=<private-key>
CONFIRMATIONS=2
ROUTER_WEIGHTS=w_rate=0.6,w_fee=0.2,w_latency=0.2
MAX_LATENCY_MS=30000
MAX_FEE_PCT=0.05
ALLOW_NON_PYUSD=false
PAYOUT_MODE=mock
PAYOUT_WEBHOOK_URL=
```

### API
`POST /route` with payload:
```json
{
  "target_pyusd": "250",
  "constraints": {
    "max_latency_ms": 20000,
    "max_fee_pct": 0.03
  },
  "payment_context": {
    "chain": "polygon",
    "payer": "0xPayer",
    "tx_hash": "0xIncomingTx"
  }
}
```

Response includes matched offers, estimated INR totals, simulated transfer hashes, and payout references.

Run tests:
```bash
npm test
```

Build:
```bash
npm run build
```

Docker build (sample):
```bash
docker build -t main-seller-agent .
```
