# INR Seller Agent

A lightweight Express service that handles individual seller payout requests. Given a reservation (order) it validates available liquidity via the orderbook-service API, triggers a Cashfree UPI payout (hardcoded to `success@upi` for the hackathon), and returns the Cashfree response to the caller. Reservation status updates are performed by downstream services after settlement.

## Features
- `POST /fulfill-order` endpoint accepting `{ order_id }` (optional `amount` for sanity checks)
- Validates reservation by calling the orderbook-service REST API
- Calls Cashfree payout APIs with configured credentials
- Returns success/failure responses with audit info
- Structured logging with Pino

## Getting started
```bash
cd inr-seller-agent
npm install
npm run dev
```

## Environment
Copy `.env.example` to `.env` and set values:
```
PORT=5000
ORDERBOOK_SERVICE_URL=http://localhost:3000
CASHFREE_BASE_URL=https://payout-gamma.cashfree.com
CASHFREE_AUTH_TOKEN=token
MAX_CONCURRENT_FULFILLMENTS=4
```
UPI VPA is fixed to `success@upi` for the hackathon.

## API
```
POST /fulfill-order
{
  "order_id": "<reservation_uuid>"
}
```

Response (success):
```
{
  "audit_id": "order-<reservation_uuid>",
  "reservation_id": "<reservation_uuid>",
  "fulfilled_amount": 150,
  "cashfree": {
    "reference_id": "payout_abc123",
    "status": "SUCCESS"
  }
}
```

Errors return HTTP 400 (validation) or 502 (Cashfree failure) with `{ "error": "message" }`.

## Concurrency & scaling
- Incoming requests are scheduled through a keyed mutex that serializes work per reservation ID, preventing double-spends on the same lock of liquidity.
- A semaphore (default concurrency `MAX_CONCURRENT_FULFILLMENTS`) bounds the number of in-flight payouts so the agent can handle bursts without overloading Cashfree or the orderbook service.
- Different reservations can therefore execute in parallel up to the configured limit, while duplicate requests for the same reservation queue behind the active one.

## Docker
Build and run:
```bash
docker build -t inr-seller-agent .
docker run -p 5000:5000 --env-file .env inr-seller-agent
```

## Testing
```bash
npm test
```
(Tests cover reservation validation and Cashfree integration mocks.)

## Notes
- The agent only reserves and executes payouts; reservation status updates are handled by another coordinating service.
- All order/reservation CRUD goes through the orderbook-service HTTP endpoints—no direct database access.
- Monitor reservations via the orderbook service to ensure unsettled orders are committed or released.
- Each seller can run an isolated container; the service is stateless and supports concurrent requests by validating and dispatching Cashfree transfers per order.
