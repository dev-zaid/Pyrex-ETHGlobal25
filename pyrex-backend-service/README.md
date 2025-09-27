# Pyrex Backend Service

Express + PostgreSQL microservice that maintains the canonical records for Pyrex sellers, users, and fiat settlement transactions. It complements the orderbook-service by providing CRUD APIs and status tracking for back-office tooling.

## Requirements
- Node.js 18+
- npm
- Docker & docker compose (optional, for local Postgres)

## Setup
```bash
cd pyrex-backend-service
cp .env.example .env
npm install
```

### Start the service
```bash
npm run dev        # auto-reload mode
# or
npm start          # production style
```

By default the API listens on `http://localhost:8080`.

### Database
Reuse the shared Postgres database shipped with the repository:
```bash
cd ../database
npm install # if scripts are provided
# ensure docker compose stack is running
```
Apply migrations after review (see `database/migrations/003_create_backend_core.sql` and `004_create_seller_agents.sql`).

## API Outline
| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Liveness probe |
| `GET` | `/sellers` | List sellers (filterable) |
| `POST` | `/sellers` | Create seller |
| `GET` | `/sellers/:id` | Fetch seller |
| `PATCH` | `/sellers/:id` | Update seller fields |
| `GET` | `/users` | List users |
| `POST` | `/users` | Create user |
| `GET` | `/users/:id` | Fetch user |
| `PATCH` | `/users/:id` | Update user |
| `GET` | `/transactions` | List transactions (filterable) |
| `POST` | `/transactions` | Create transaction record |
| `GET` | `/transactions/:id` | Fetch transaction |
| `PATCH` | `/transactions/:id` | Update transaction |
| `GET` | `/agents` | List seller agents |
| `POST` | `/agents` | Register seller agent |
| `GET` | `/agents/:id` | Fetch seller agent |
| `PATCH` | `/agents/:id` | Update seller agent |

### POST payloads

#### `POST /sellers`
```json
{
  "seller_pubkey": "0xabc...",
  "display_name": "Pyrex Liquidity Desk",
  "upi_vpa": "pyrex@upi",
  "status": "pending",
  "kyc_status": "unverified",
  "risk_tier": "standard",
  "metadata": {
    "wallet": "0xabc...",
    "region": "IN"
  }
}
```
- `seller_pubkey` (string, required): On-chain address advertised in the orderbook.
- `display_name` (string, required): Back-office label shown in admin tools.
- `upi_vpa` (string, optional): UPI handle for payouts.
- `status` / `kyc_status` / `risk_tier` (string enums, optional): Defaults to `pending` / `unverified` / `standard` when omitted.
- `metadata` (object, optional): Arbitrary JSON for wallet routing, auth config, etc.

#### `POST /users`
```json
{
  "display_name": "Alice Singh",
  "email": "alice@example.com",
  "phone": "+919999999999",
  "country_code": "IN",
  "status": "invited",
  "kyc_status": "unverified",
  "risk_tier": "standard",
  "metadata": {
    "crm_id": "crm_123"
  }
}
```
- `display_name` (string, required): User name used in dashboards.
- `email` / `phone` (string, optional): One or both may be supplied; uniqueness enforced across the table.
- `country_code` (string, optional): ISO-3166 alpha-2, defaults to `IN`.
- `status` / `kyc_status` / `risk_tier` (string enums, optional) manage lifecycle and risk flags.
- `metadata` (object, optional): Additional attributes such as CRM identifiers or payout limits.

#### `POST /transactions`
```json
{
  "reservation_id": "16c8d6c0-6fc8-4baf-8e7a-8fe7b2b73322",
  "offer_id": "6d5f9c7d-18bb-4a76-8db4-1a690f5ab0dd",
  "seller_id": "f0b88916-3d0d-4f83-8b91-0350dfd157cb",
  "user_id": "7f9e71b0-50f8-4c84-8d26-b1195ef35a7c",
  "source_currency": "USD",
  "destination_currency": "INR",
  "amount_source": 1000.25,
  "amount_destination": 83124.75,
  "bridge_token_symbol": "PYUSD",
  "bridge_token_amount": 1000.25,
  "fx_rate": 83.12475,
  "status": "pending",
  "settlement_reference": "UPI:123456",
  "tx_hash": "0xabcd...",
  "metadata": {
    "channel": "cashfree"
  },
  "completed_at": null
}
```
- `source_currency` / `destination_currency` (string, required): ISO currency codes for inbound and outbound legs.
- `amount_source` (number, required) and `amount_destination` (optional): Fiat amounts in the respective currencies.
- `bridge_token_symbol` / `bridge_token_amount` (optional): PYUSD bridge leg details; symbol defaults to `PYUSD`.
- `reservation_id` / `offer_id` / `seller_id` / `user_id` (UUID, optional): Linkages into the orderbook and directory tables.
- `status` (string enum, optional): Defaults to `pending`; transitions tracked via PATCH.
- `settlement_reference`, `tx_hash`, `metadata`, `completed_at`, and `failure_reason` capture audit trace details.

#### `POST /agents`
```json
{
  "seller_id": "f0b88916-3d0d-4f83-8b91-0350dfd157cb",
  "agent_uid": "desk-bot-01",
  "endpoint_url": "https://agents.pyrex.dev/hooks/liquidity",
  "status": "inactive",
  "auth_token": "secret-token",
  "metadata": {
    "ip_allowlist": ["198.51.100.0/24"]
  },
  "last_seen_at": null
}
```
- `seller_id` (UUID, required): Parent seller this agent represents.
- `agent_uid` (string, required): Unique identifier enforced across all agents.
- `endpoint_url` (string, required): HTTPS endpoint the platform calls.
- `status` (string enum, optional): Defaults to `inactive` until automation is enabled.
- `auth_token` (string, optional): Shared secret or credential; stored verbatim.
- `metadata` (object, optional): Structured settings such as allowlists or capabilities.
- `last_seen_at` (ISO datetime, optional): Updated on successful callbacks to monitor freshness.

Requests are validated with JSON Schema (Ajv). All records expose `created_at`/`updated_at` timestamps. See `src/routes/*.js` for details.

## Development notes
- Keep migrations idempotent; `gen_random_uuid()` requires the `pgcrypto` extension (enabled by earlier migrations).
- Status updates are soft state; there is no `deleted_at`. Set `status='disabled'` / `archived` to retire records.

Contact the orderbook-service when you need offer/reservation data; IDs in transactions align with that schema.
