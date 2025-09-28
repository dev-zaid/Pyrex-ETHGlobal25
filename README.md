## Pyrex (ETHGlobal) — FX Bridge and Agent Platform

Pyrex is a fiat‑to‑fiat cross‑border payments provider that uses PYUSD as the medium to fulfill transactions. It routes USD funds (PYUSD on Polygon) to destination fiat (e.g., INR) via a verifiable seller orderbook and pluggable settlement services. The system is composed of focused microservices and demo apps that cooperate through HTTP APIs and signed messages.

### Key capabilities

- **Order discovery and reservation**: Ranked offer selection and atomic liquidity holds via an orderbook API.
- **Smart order routing**: Weighted scoring (rate, fee, latency) and greedy allocation across multiple sellers.
- **Settlement and payouts**: Pluggable downstream services (e.g., UPI payouts, PayPal flows) coordinated off the reservation IDs.
- **Back-office records**: Canonical CRUD for sellers, users, and transactions.
- **Demos and apps**: Web landing, mobile app, A2A x402 demo, and a Self verification playground.

### How it works (end‑to‑end)

1. **Order trigger**: A client (e.g., `main-agent-service` or a UI) requests liquidity in PYUSD or a target INR amount.
2. **Offer ranking**: `main-seller-agent` fetches current offers from `orderbook-service`, ranks by configurable weights, and computes allocations.
3. **Atomic reservation**: The router calls `POST /offers/:id/reserve` for each slice. Failures roll back prior holds.
4. **Settlement & payouts**: A downstream service executes the actual transfers (e.g., on‑chain PYUSD, UPI payout via `inr-seller-agent`) and then commits or releases each reservation.
5. **Record keeping**: `pyrex-backend-service` persists sellers, users, transactions, and agent registrations; optional in‑memory `kvstore` provides fast transaction state.

### Repository structure

- `orderbook-service/`: Verifiable orderbook (Node.js + Express + PostgreSQL). Offers, snapshots, and reservation lifecycle. See its README for API and migrations.
- `main-seller-agent/`: Smart order router. Pulls offers, ranks, allocates, and reserves liquidity; exposes `/route`.
- `inr-seller-agent/`: Executes INR payouts for a reservation (mocked UPI flow for hackathon). Validates with orderbook first.
- `pyrex-backend-service/`: Back‑office API for sellers, users, transactions, and seller agents; complements the orderbook.
- `kvstore/`: TypeScript in‑memory storage helpers for UPI/PayPal transaction status and health.
- `paypal/`: PayPal API server (REST + CLI) used for vaulting and charge flows (bun runtime).
- `main-agent-service/`: Helper API to trigger Pyrex routing requests and track order status.
- `HeroPage/`: Vite + React landing/UX app for the project.
- `pyrex_app/`: Expo React Native app skeleton.
- `self/`: Self verification playground (Next.js) to experiment with selective disclosure flows.
- `demo/a2a/`: Agent‑to‑Agent x402 Amoy demo (facilitator, resource server, service agent, client agent).
- `database/`: Docker Compose for a local Postgres + Adminer stack and SQL migrations used by services.
- `planning/`: Design notes and planning docs.

### Quick start (local)

- **Prerequisites**: Node.js 18+, npm, Docker, and optionally bun (for `paypal/`).

1. **Start Postgres**

```bash
cd database
docker compose up -d
```

2. **Run core services in separate terminals**

- Orderbook

```bash
cd orderbook-service
npm install
npm run dev
```

- Main seller agent (router)

```bash
cd main-seller-agent
npm install
npm run dev
```

- INR seller agent (payout executor)

```bash
cd inr-seller-agent
npm install
npm run dev
```

- Back‑office API

```bash
cd pyrex-backend-service
npm install
npm run dev
```

3. **Optional services**

- PayPal API server (bun)

```bash
cd paypal
bun install
bun run dev
```

- Order trigger helper

```bash
cd main-agent-service
npm install
npm run dev
```

4. **Seed or simulate offers (optional)**
   Use the orderbook tooling to seed demo offers; see `orderbook-service/README.md` for scripts and examples.

5. **Run apps and demos (optional)**

- Web landing

```bash
cd HeroPage
npm install
npm run dev
```

- Mobile app (Expo)

```bash
cd pyrex_app
npx expo start
```

- A2A x402 demo

```bash
bash demo/scripts/start-all.sh
```

### Configuration

- **Environment files**: Each service documents its own `.env` keys (ports, URLs, RPCs, weights, tokens). Start by copying the provided examples in each directory.
- **Ports**: Defaults may overlap across services (e.g., `3000`). Adjust via environment variables as needed.
- **Database**: Review and apply SQL in `database/migrations/` as required by each service’s README.

### Testing

- Run tests inside each service directory, for example:

```bash
cd main-seller-agent && npm test
```

Refer to individual READMEs for coverage and scenarios.

### Operational notes

- Router reservations are short‑lived; downstream settlement must `commit` or `release` promptly.
- The system is designed for horizontal scaling of stateless services; orderbook enforces transactional consistency for reservations.
- Logging and metrics are service‑specific; consult subproject READMEs for details.

### Screenshots

Place screenshots under `docs/screenshots/` and link them here.

### Architecture diagram

Add your diagram to `docs/architecture.png` (or `.svg`) and embed it here.

---

For detailed APIs, configuration, and examples, see the READMEs inside each subproject.
