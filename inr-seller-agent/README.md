# INR Seller Agent

A lightweight Express service that handles individual seller payout requests. Given a reservation (order) it validates available liquidity, triggers a Razorpay UPI payment (hardcoded to `success@upi` for the hackathon), and returns the Razorpay response to the caller. Reservation status updates are performed by downstream services after settlement.

## Features
- `POST /fulfill-order` endpoint accepting `{ order_id, amount }`
- Validates reservation via the shared Postgres orderbook database
- Calls Razorpay APIs with configured credentials
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
DATABASE_URL=postgres://user:pass@host:5432/dbname
RAZORPAY_BASE_URL=https://api.razorpay.com/v1
RAZORPAY_KEY_ID=rzp_test_123
RAZORPAY_KEY_SECRET=secret
```
UPI VPA is fixed to `success@upi` for the hackathon.

## API
```
POST /fulfill-order
{
  "order_id": "<reservation_uuid>",
  "amount": 150
}
```

Response (success):
```
{
  "audit_id": "order-<reservation_uuid>",
  "reservation_id": "<reservation_uuid>",
  "requested_amount": 150,
  "razorpay": {
    "payment_id": "pay_abc123",
    "status": "captured"
  }
}
```

Errors return HTTP 400 (validation) or 502 (Razorpay failure) with `{ "error": "message" }`.

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
(Tests added in later steps cover reservation validation and Razorpay integration.)

## Notes
- The agent only reserves and executes payouts; reservation status updates are handled by another coordinating service.
- Monitor reservations via the orderbook service to ensure unsettled orders are committed or released.
