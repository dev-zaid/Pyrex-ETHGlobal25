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
Tests cover signature verification, nonce rules, offer lifecycle, reservation flows, concurrency safety, and metrics reporting.

## Key endpoints
| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET`  | `/health` | Liveness probe |
| `POST` | `/offers` | Create/update a signed seller offer (nonce enforced) |
| `GET`  | `/offers` | Filterable snapshot of active offers |
| `GET`  | `/offers/:id` | Fetch single offer |
| `PATCH` | `/offers/:id` | Signed update to available liquidity |
| `POST` | `/offers/:id/cancel` | Signed cancellation message |
| `POST` | `/offers/:id/reserve` | Atomically reserve liquidity |
| `POST` | `/reservations/:id/commit` | Mark reservation as committed |
| `POST` | `/reservations/:id/release` | Release reservation and restore availability |
| `GET` | `/admin/metrics` | Orderbook/reservation counters and timestamps |

### Sample requests
```bash
# Health
curl http://localhost:3000/health

# Create an offer (payload must be signed)
curl -X POST http://localhost:3000/offers \
  -H 'Content-Type: application/json' \
  -d @fixtures/sample_offer.json

# Fetch offers sorted by best rate
curl 'http://localhost:3000/offers?limit=20&sort=rate_desc'

# Reserve 50 PYUSD on an offer
curl -X POST http://localhost:3000/offers/<offer_id>/reserve \
  -H 'Content-Type: application/json' \
  -d '{"amount_pyusd": "50"}'

# Inspect metrics
curl http://localhost:3000/admin/metrics
```

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
