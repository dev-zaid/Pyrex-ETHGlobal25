# Main Seller Agent — Smart Order Router

A TypeScript service that listens for incoming PYUSD liquidity requests and allocates INR payouts across sellers on the FX Bridge orderbook. It reserves liquidity via the hosted orderbook-service, performs (mockable) PYUSD transfers on Polygon, and triggers seller payouts via webhook.

## Features
- Prioritises Polygon PYUSD offers with configurable weights
- Greedy allocator with support for partial fills across sellers
- Reservation life-cycle using the external orderbook-service
- Mockable Polygon ERC20 transfers and UPI payouts
- Express API exposing `/health` and `/route`
- Structured logging with Pino and configurable environment
- Designed to accommodate multiple concurrent order requests via short-lived reservations and stateless orchestration

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

#### POST /route

Routes an inbound PYUSD liquidity request to the best available sellers on the orderbook and reserves their inventory. Provide at least one of `target_pyusd` or `target_inr`.

```json
{
  "target_pyusd": "250",
  "constraints": {
    "max_latency_ms": 20000,
    "max_fee_pct": 0.03,
    "allow_non_pyusd": false
  },
  "payment_context": {
    "chain": "polygon"
  }
}
```

- `target_pyusd` (string, optional) amount of PYUSD the agent should source; use a string to avoid precision loss. Required if `target_inr` is absent.
- `target_inr` (string, optional) lets the agent back into the PYUSD amount using the weighted INR-to-PYUSD conversion from ranked offers.
- `constraints` (object, optional) forwards filters to `GET /offers` on the orderbook: `max_latency_ms` rejects slow offers, `max_fee_pct` caps seller fees, and `allow_non_pyusd` removes the default `token=PYUSD` filter so multi-token pools can be considered.
- `payment_context` (object, optional) lets callers pass metadata downstream when a settlement flow needs it. Include `chain` if you want to override the default Polygon snapshot; add `payer` or `tx_hash` only when you need to correlate routing decisions with external payments.

Request handling flow: the agent pulls up to 100 offers for `chain=polygon` (and `token=PYUSD` unless `allow_non_pyusd` is true), ranks them using the configurable `ROUTER_WEIGHTS`, runs a greedy allocator to satisfy the desired PYUSD, and creates reservations on the external orderbook. Any error during reservation triggers a rollback of prior holds.

Responses:
- `200 OK` returns a `RouteResponse` with the matched offers, totals, and downstream execution placeholders.
- `400 Bad Request` carries `{ "error": "message" }` when validation, liquidity, or reservation steps fail.

### Sample response explained

```json
{
  "audit_id": "ab9faa55-3ee1-4c62-b3e4-25fc9f02e9ff",
  "matched_offers": [
    {
      "offer_id": "6237fe9e-c785-44ee-b655-0622da2e5efa",
      "seller_pubkey": "0x439115aFf7e5F94F3A013Ddfd8CdF530408f44E8",
      "token": "PYUSD",
      "chain": "polygon",
      "rate": 0.0115,
      "fee_pct": 0.0015,
      "reserved_pyusd": 150,
      "expected_inr": 13023.913043478262,
      "reservation_id": "3ab3f4ac-2b1d-4d25-8077-1bb7520cb7ae",
      "est_latency_ms": 9000
    }
  ],
  "totals": {
    "total_pyusd": 150,
    "total_inr_estimated": 13023.913043478262,
    "weighted_latency_ms": 9000
  },
  "onchain_transfers": [],
  "seller_payouts": []
}
```

- `audit_id` uniquely tags the routing attempt for tracing.
- `matched_offers` contains the chosen seller(s). Here the agent only needed one offer because it had enough liquidity to cover the 150 PYUSD target.
- `expected_inr` is derived from the offer’s rate and fee: `150 ÷ 0.0115 ≈ 13 043.48 INR`, multiplied by `(1 - 0.0015)` for the 0.15 % fee, yielding `≈ 13 023.91 INR`.
- `reservation_id` now carries the real reservation identifier returned by `/offers/:id/reserve`, meaning the liquidity has been locked in the orderbook for downstream services to settle or release.
- `totals` aggregates the matched offer(s) and reports the weighted latency (9 seconds in this example).
- `onchain_transfers` and `seller_payouts` stay empty because the downstream settlement/payout pipeline runs in a separate service.

## Handling multiple incoming orders

- Each `/route` call fetches the orderbook snapshot on demand and computes allocations independently, so the agent can serve many concurrent requests without shared state.
- Reservations are issued sequentially within a single request to keep its batch atomic; if an offer suddenly lacks liquidity the reservation call fails and previously reserved rows are released before the error bubbles up.
- Run multiple instances (or a process cluster) behind a load balancer to scale throughput—reservation logic is transactional in the orderbook DB, preventing double spends across threads/processes.
- Downstream settlement should process each reservation ID asynchronously and either `commit` or `release` it. Pending reservations can be monitored through the orderbook’s `/admin/metrics` endpoint.
- Use the `audit_id` returned in responses to correlate logs across services when diagnosing concurrent flows.

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
