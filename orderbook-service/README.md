# FX Bridge Orderbook Service

Node.js + Express microservice providing a cryptographically verifiable seller orderbook backed by PostgreSQL. Sellers POST signed PYUSD offers, consumers fetch filtered orderbook snapshots, and routers can reserve liquidity atomically.

## Requirements
- Node.js 18+ (LTS) and npm
- Docker & Docker Compose
- Local Postgres connection available at `postgres://fxbridge:fxbridge_pass@localhost:5432/fxbridge_db`

## 1. Boot the database
```bash
cd database
docker compose up -d
# apply migrations
PGPASSWORD=fxbridge_pass psql -h localhost -U fxbridge -d fxbridge_db \
  -f migrations/001_create_orderbook.sql
PGPASSWORD=fxbridge_pass psql -h localhost -U fxbridge -d fxbridge_db \
  -f migrations/002_create_reservations.sql
```

## 2. Install & run the service
```bash
cd ../orderbook-service
npm install
# start in dev mode with auto-reload
npm run dev
# or production style
database_url=postgres://fxbridge:fxbridge_pass@localhost:5432/fxbridge_db npm start
```

The API listens on `http://localhost:3000` by default. Request/response logs are emitted via `morgan` (muted during tests).

## 3. Seed sample offers (optional)
```bash
# in orderbook-service/
node scripts/seed_offers.js --count 10 --url http://localhost:3000
# snapshot written to snapshots/offers_snapshot.json
```

## 4. Run the test suite
```bash
npm test
```
Tests cover signature verification, nonce rules, offer lifecycle, reservation flows, concurrency safety, metrics reporting, and admin endpoints.

## API reference

### Endpoint summary
| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET`  | `/health` | Liveness probe |
| `POST` | `/offers` | Create or update a signed seller offer (nonce enforced) |
| `GET`  | `/offers` | Filterable snapshot of active offers |
| `GET`  | `/offers/:id` | Fetch a single offer |
| `PATCH` | `/offers/:id` | Signed update of available liquidity |
| `POST` | `/offers/:id/cancel` | Signed cancellation message |
| `POST` | `/offers/:id/reserve` | Atomically reserve liquidity |
| `POST` | `/reservations/:id/commit` | Mark a reservation as committed |
| `POST` | `/reservations/:id/release` | Release reservation and restore availability |
| `GET`  | `/reservations/:id` | Fetch reservation details by id |
| `GET`  | `/admin/metrics` | Aggregate counters for monitoring |

### Detailed examples

#### `GET /health`
```bash
curl http://localhost:3000/health
```

#### `POST /offers`
Payload must be signed using the canonical ordering defined in `src/services/signature.js`.
```bash
curl -X POST http://localhost:3000/offers \
  -H 'Content-Type: application/json' \
  -d @demo/post_offer_request.json
```

#### `GET /offers`
```bash
curl 'http://localhost:3000/offers?chain=polygon&token=PYUSD&limit=20&sort=rate_desc' \
  | jq '.'
```

#### `GET /offers/:id`
```bash
curl http://localhost:3000/offers/<offer_id> | jq '.'
```

#### `PATCH /offers/:id`
```bash
curl -X PATCH http://localhost:3000/offers/<offer_id> \
  -H 'Content-Type: application/json' \
  -d '{
        "seller_pubkey": "0x...",
        "available_pyusd": "350",
        "nonce": "5",
        "signature": "0x..."
      }'
```

#### `POST /offers/:id/cancel`
```bash
curl -X POST http://localhost:3000/offers/<offer_id>/cancel \
  -H 'Content-Type: application/json' \
  -d '{
        "seller_pubkey": "0x...",
        "nonce": "6",
        "signature": "0x..."
      }'
```

#### `POST /offers/:id/reserve`
```bash
curl -X POST http://localhost:3000/offers/<offer_id>/reserve \
  -H 'Content-Type: application/json' \
  -d '{"amount_pyusd": "75"}'
```
Successful responses include a `reservation_id` and the remaining liquidity.

#### `GET /reservations/:id`
```bash
curl http://localhost:3000/reservations/<reservation_id>
```
Returns the reservation record (`status`, `amount_pyusd`, timestamps) so downstream agents can validate a hold without database access.

#### `POST /reservations/:id/commit`
```bash
curl -X POST http://localhost:3000/reservations/<reservation_id>/commit
```

#### `POST /reservations/:id/release`
```bash
curl -X POST http://localhost:3000/reservations/<reservation_id>/release
```

#### `GET /admin/metrics`
```bash
curl http://localhost:3000/admin/metrics | jq '.'
```

## Settlement orchestration (external service)

The orderbook now treats reservation and fulfilment as a two-phase flow. The router locks liquidity by calling `POST /offers/:id/reserve` and returns the resulting `reservation_id` to an **external settlement service**. That companion service should:

1. **Inspect the route response** – for each `matched_offers[]` entry take the `reservation_id`, `reserved_pyusd`, and seller metadata.
2. **Perform settlement** – execute the actual PYUSD transfer (or other business logic) and any payout/UPI workflows. This is intentionally decoupled from the orderbook to keep on-chain handling isolated.
3. **On success** – call `POST /reservations/:id/commit` to mark the hold as committed.
4. **On failure / timeout** – call `POST /reservations/:id/release` so the liquidity returns to the orderbook.
5. **Monitor** – use `/admin/metrics` to track pending reservations and build alerting if a reservation stays pending for too long (indicative of a stuck settlement flow).

By keeping settlement in a separate service you can swap implementations (mock, testnet, production) without modifying the orderbook core. This README documents the orderbook responsibilities; place settlement service specifics—webhooks, RPC requirements, retry policy—in that service’s repository.

## Configuration
| Variable | Default | Notes |
| -------- | ------- | ----- |
| `DATABASE_URL` | `postgres://fxbridge:fxbridge_pass@localhost:5432/fxbridge_db` | pg connection string |
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Enables logging & rate limiting (bypassed during tests) |
| `ORDERBOOK_URL` | `http://localhost:3000` | Used by `scripts/seed_offers.js` |

## Project layout
```
orderbook-service/
├── src/
│   ├── app.js                # Express app + middleware
│   ├── server.js             # Server bootstrap
│   ├── db.js                 # pg Pool helper
│   ├── middleware/rateLimiter.js
│   ├── routes/
│   │   ├── offers.js
│   │   ├── reservations.js
│   │   └── admin.js
│   ├── services/
│   │   ├── offersService.js
│   │   └── signature.js
│   └── validators/offerValidator.js
├── scripts/seed_offers.js
├── fixtures/seed_offers.json
├── snapshots/offers_snapshot.json
├── tests/
└── package.json
```

## Operational notes
- Rate limiting guards mutating endpoints (`POST`, `PATCH`) outside of test runs.
- Offer signatures follow the canonical ordering defined in the planning pack; verification uses `ethers`.
- Reservations reduce `available_pyusd` within a transaction and can be committed or released for router workflows.
- `/admin/metrics` surfaces aggregate counts for dashboards or Prometheus exporters.

## Next steps
- Add authentication/authorization for seller and router identities.
- Integrate structured logging + metrics export (e.g., Prometheus) for production usage.
- Extend router logic to consume the seeded offers snapshot and simulate allocations.
