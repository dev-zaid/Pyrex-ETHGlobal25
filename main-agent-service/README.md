# Main Agent Service

A service that triggers USD orders by calling the Pyrex main agent endpoint at `https://pyrex-main-agent.onrender.com/route`.

## Features

- **Order Triggering**: Trigger USD orders via REST API
- **Retry Logic**: Automatic retries with exponential backoff
- **Order Tracking**: Track order status and history
- **Health Monitoring**: Health checks for the service and main agent
- **Order Management**: Query orders by status and cleanup old orders

## API Endpoints

### POST /trigger-order
Triggers a USD order by calling the main agent endpoint.

**Request Body:**
```json
{
  "target_pyusd": "250",
  "constraints": {
    "max_latency_ms": 20000,
    "max_fee_pct": 0.03
  },
  "payment_context": {
    "chain": "polygon",
    "payer": "0x1234567890abcdef...",
    "tx_hash": "0x1234567890abcdef..."
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "target_pyusd": "250",
  "payer": "0x1234567890abcdef...",
  "tx_hash": "0x1234567890abcdef...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "status": "completed",
  "response": {
    "audit_id": "7b6c315a-b9b5-4301-aaa7-e17a3e44ae5e",
    "matched_offers": [...],
    "totals": {...},
    "onchain_transfers": [],
    "seller_payouts": []
  }
}
```

### GET /order/:orderId
Get the status of a specific order.

### GET /orders
Get all orders, optionally filtered by status.
- Query parameter: `?status=pending|processing|completed|failed`

### GET /health
Health check endpoint that returns service status and main agent connectivity.

### POST /cleanup
Clean up old completed/failed orders.
- Body: `{"hoursOld": 24}` (optional, defaults to 24 hours)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

## Development

```bash
# Start in development mode
npm run dev

# Build the project
npm run build

# Start production server
npm start

# Run tests
npm test
```

## Configuration

Environment variables:

- `MAIN_AGENT_URL`: URL of the Pyrex main agent endpoint (default: https://pyrex-main-agent.onrender.com/route)
- `PORT`: Server port (default: 3001)
- `LOG_LEVEL`: Logging level (default: info)
- `MAX_RETRIES`: Maximum retry attempts (default: 3)
- `RETRY_DELAY`: Base delay between retries in ms (default: 1000)

## Usage Example

```bash
# Trigger a USD order
curl -X POST http://localhost:3001/trigger-order \
  -H "Content-Type: application/json" \
  -d '{
    "target_pyusd": "250",
    "constraints": {
      "max_latency_ms": 20000,
      "max_fee_pct": 0.03
    },
    "payment_context": {
      "chain": "polygon",
      "payer": "0x1234567890abcdef1234567890abcdef12345678",
      "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
    }
  }'

# Check order status
curl http://localhost:3001/order/{order-id}

# Get all orders
curl http://localhost:3001/orders

# Health check
curl http://localhost:3001/health
```

## Architecture

- **API Client**: Handles HTTP requests to the main agent with retry logic
- **Order Service**: Manages order lifecycle and tracking
- **Express Server**: REST API endpoints for order management
- **TypeScript**: Full type safety with interfaces for all data structures

The service automatically handles:
- Retries with exponential backoff
- Order status tracking
- Error handling and logging
- Health monitoring
- Order cleanup
