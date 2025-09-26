# Pyrex Planning Pack — Orderbook-Focused Update

> **Status note:** USD → PYUSD flow is already implemented. This planning pack now focuses on the **Orderbook**, Seller agents, Node/Express endpoints for creating & fetching orders, and a local Postgres on Docker setup. One document below is entirely devoted to the Orderbook implementation (schema, endpoints, Docker, seed scripts and test plan).

---

# Document 1 — Executive Summary (updated)

You already have USD → PYUSD working. Focus the hackathon on the **seller orderbook** and the router's ability to reliably query seller offers and allocate fills (partial or full). The deliverable: a working Node/Express service backed by Postgres (Docker) exposing secure endpoints for sellers to create/update/cancel offers and consumers/router to fetch a snapshot of the book. Sellers are simulated for the hackathon but must sign offers cryptographically.

Key constraints

- Chain: Polygon (testnet/Mumbai) — PYUSD will be used there but settlement anchoring is out of scope for this doc.
- Primary scope: Orderbook implementation + endpoints + local Postgres DB + seller signed-offer verification.
- Language/Runtime: Node.js (LTS) + Express.

---

# Document 2 — System Overview (concise)

Components implemented / to use in the demo:

1. **USD → PYUSD**: already done — buyer funds arrive into the app's PYUSD account.
2. **Orderbook Service (Node + Express + Postgres)**: this is primary — sellers POST signed offers; router/clients GET orderbook snapshots.
3. **Seller Agent Simulator**: a local script that posts offers and responds to `/execute` instructions (optional for this iteration).
4. **Router (separate service)**: will consume the orderbook snapshot via HTTP and compute allocations (not covered in deep detail here).

---

# Document 3 — Postgres on Docker (full setup + schema)

## Docker Compose (postgres + admin)

Save as `docker-compose.yml` in project root:

```yaml
version: "3.8"
services:
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: pyrex
      POSTGRES_PASSWORD: pyrex_pass
      POSTGRES_DB: pyrex_db
    volumes:
      - db-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  adminer:
    image: adminer
    restart: always
    ports:
      - "8080:8080"
volumes:
  db-data:
```

Run with: `docker compose up -d`

## Database connection (example env)

```
DATABASE_URL=postgres://pyrex:pyrex_pass@localhost:5432/pyrex_db
```

## Schema (SQL)

Save as `migrations/001_create_orderbook.sql` and execute via psql or migration tool.

```sql
-- Offers table: sellers publish offers for PYUSD -> INR
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_pubkey VARCHAR(66) NOT NULL,
  chain VARCHAR(32) NOT NULL DEFAULT 'polygon', -- chain tag
  token VARCHAR(32) NOT NULL DEFAULT 'PYUSD',
  rate_pyusd_per_inr NUMERIC(30,18) NOT NULL,
  min_pyusd NUMERIC(30,8) NOT NULL,
  max_pyusd NUMERIC(30,8) NOT NULL,
  available_pyusd NUMERIC(30,8) NOT NULL,
  fee_pct NUMERIC(10,6) NOT NULL DEFAULT 0.0,
  est_latency_ms INTEGER NOT NULL DEFAULT 10000,
  supports_swap BOOLEAN NOT NULL DEFAULT TRUE,
  upi_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(16) NOT NULL DEFAULT 'active', -- active / paused / cancelled / expired
  nonce BIGINT NOT NULL,
  expiry_timestamp TIMESTAMP WITH TIME ZONE,
  signature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_offers_rate ON offers(rate_pyusd_per_inr);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_chain_token ON offers(chain, token);
```

Notes:

- `signature` is the ECDSA signature over a canonical serialization of the offer JSON (see Document 5 for canonical format).
- `nonce` prevents replay. Sellers must increment their nonce on every update.

---

# Document 4 — Orderbook Implementation (Node + Express)

This document is dedicated to the Orderbook endpoints, request/response shapes, signature verification logic, DB operations, and examples for Codex automation. Use this as the authoritative implementation guide.

## Project layout (minimal)

```
/orderbook-service
  /src
    app.js           # express app
    server.js        # starts server
    db.js            # Postgres pool
    routes/
      offers.js      # offer endpoints
    services/
      offersService.js
      signature.js   # canonicalization + verify
    migrations/
  package.json
  docker-compose.yml (optional)  # if run alongside db
```

## Dependencies (suggested)

- express
- pg (node-postgres)
- dotenv
- ethers (for signature verification / canonical hashing)
- ajv (optional) for JSON schema validation
- knex or node-pg-migrate (optional) for migrations

Install: `npm i express pg dotenv ethers ajv`

## Canonical offer payload (ordering matters)

Canonical JSON fields and order for the signature (important for deterministic signing):

```
[ seller_pubkey, chain, token, rate_pyusd_per_inr, min_pyusd, max_pyusd, available_pyusd, fee_pct, est_latency_ms, supports_swap, upi_enabled, nonce, expiry_timestamp ]
```

When verifying signature, JSON stringify must use this exact order and numeric formatting.

## Signature verification (ethers)

`signature.js` responsibilities:

- Construct canonical message (string)
- Compute hash: `ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message))`
- Recover address from SIG: `ethers.utils.recoverAddress(hash, signature)`
- Compare recovered address (lowercased) to `seller_pubkey` (lowercased)

Edge cases:

- Accept both `0x`-prefixed and non-prefixed pubkeys normalized via `ethers.utils.getAddress`.

## Offers endpoints (Express)

1. `POST /offers` — create or update an offer (idempotent by signature + nonce)

- Request body: canonical offer JSON + `signature` (hex)
- Behavior:

  - Validate required fields and numeric ranges.
  - Verify signature and nonce is > latest nonce for seller pubkey (prevent replay).
  - Upsert into `offers` table: if existing id/nonce lower, reject; otherwise insert or update `available_pyusd`, `rate`, `expiry`, `status='active'`.

- Response: `201 Created` with stored offer record.

2. `GET /offers` — fetch orderbook snapshot

- Query params: `chain=polygon`, `token=PYUSD`, `min_amount`, `max_amount`, `limit`, `sort` (by `rate` or `latency`)
- Behavior:

  - Return active offers with `available_pyusd > 0` and `expiry_timestamp > now()`.
  - Optionally aggregate small offers (configurable) or return raw list.

- Response: `200 OK` with list of offers (excluding `signature` field by default for privacy).

3. `GET /offers/:id` — fetch single offer
4. `POST /offers/:id/cancel` — seller cancels offer (must sign cancel message). Optionally `PATCH` to update available amount.

## DB interactions (offersService.js)

- `createOrUpdateOffer(offerObj, signature)`:

  - Begin tx: select latest nonce for seller_pubkey FOR UPDATE; ensure incoming nonce > latest; insert/update row; commit.

- `getOffers(filters)` — simple SELECT with WHERE filters and ORDER BY.
- `decrementAvailable(offer_id, amount)` — atomic update used by Router execution (later), with `RETURNING available_pyusd` to detect insufficient liquidity.

## Example: `POST /offers` request

```json
{
  "seller_pubkey": "0xAbC...",
  "chain": "polygon",
  "token": "PYUSD",
  "rate_pyusd_per_inr": "0.01234",
  "min_pyusd": "10",
  "max_pyusd": "1000",
  "available_pyusd": "500",
  "fee_pct": "0.002",
  "est_latency_ms": 12000,
  "supports_swap": true,
  "upi_enabled": true,
  "nonce": 7,
  "expiry_timestamp": "2025-10-01T00:00:00Z",
  "signature": "0x..."
}
```

## Security notes for endpoints

- Rate-limit `POST /offers` to prevent spam.
- Require `seller_pubkey` field matches recovered signature.
- Use HTTPS in production; for local dev, document ngrok steps if exposing locally.

---

# Document 5 — Orderbook Canonicalization, Signing & Verification (detailed)

## Canonical serialization rules

- Use the exact field order listed in Document 4.
- Numeric fields must be normalized to string form with fixed decimal places for deterministic signing (e.g., `rate_pyusd_per_inr` use 18 decimals; `available_pyusd` use 8 decimals).
- `expiry_timestamp` must be in ISO-8601 UTC.

## Signing example (seller side)

Using ethers.js `wallet.signMessage` over the keccak hash of the UTF-8 bytes of canonical string:

```js
const { ethers } = require("ethers");
const canonical = buildCanonicalString(offerObject); // follow ordering & formatting
const hashBytes = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(canonical));
const sig = await wallet.signMessage(ethers.utils.arrayify(hashBytes));
```

## Verification (server-side)

- Rebuild canonical string, keccak hash, recover address via `ethers.utils.verifyMessage` / `recoverAddress` and compare.

---

# Document 6 — Seed Scripts & Codex Automation Helpers

Provide ready-to-run Node scripts for Codex/local automation:

- `scripts/seed_offers.js` — reads `seed_offers.json` and posts to `POST /offers` with proper signing using local seller private keys (for simulation).
- `scripts/list_offers.js` — polls `GET /offers` and writes snapshot to `snapshots/` for router to consume.
- `fixtures/seed_offers.json` — a set of 10 seller offers with varying rates, latencies, and available balances.

Example `seed_offers.json` entry format follows the `POST /offers` example in Document 4.

---

# Document 7 — Tests & Validation

Unit & integration tests to include (suggested):

- Signature verification unit tests: valid signature accepted; invalid signature rejected.
- Nonce logic tests: older nonce rejected.
- Offer lifecycle: create → fetch → cancel → ensure status changes.
- Concurrent decrement test: simulate two router executions decrementing the same offer; ensure atomic behavior with transactions.

Suggested tools: jest + supertest for API testing, and testcontainers or the Docker compose DB for integration tests.

---

# Document 8 — Next steps & work items for you / Codex agent

Priority items to implement now:

1. Create Postgres Docker (compose) and run migrations.
2. Implement `signature.js` (canonicalization + verify).
3. Implement `POST /offers` + `GET /offers` endpoints and unit tests.
4. Create `scripts/seed_offers.js` to auto-populate the book for the demo.

Optional but recommended:

- Implement `decrementAvailable` endpoint for router to reserve funds atomically.
- Implement `POST /offers/:id/cancel` with signed cancellation message.
- Add pagination & caching for `GET /offers` snapshots.
