# PayPal API Server

A comprehensive PayPal integration API server that provides both REST API endpoints and CLI functionality for PayPal operations including orders, payments, and vault management.

## Features

- **REST API Server**: Full HTTP API for all PayPal operations
- **CLI Support**: Original command-line interface still available
- **Vault Management**: Store and reuse payment methods
- **Event-driven Charging**: Automatic charging based on events
- **TypeScript**: Full type safety and modern development experience

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Variables

Create a `.env` file with your PayPal credentials:

```env
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
MERCHANT_CUSTOMER_ID=user_123
PORT=3000
```

### 3. Run the Server

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run start

# CLI mode (original functionality)
bun run cli
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Orders
- `POST /orders` - Create a new order
- `POST /orders/:id/capture` - Capture an order
- `GET /orders/:id` - Get order details
- `GET /captures/:id` - Get capture details

### Vault Management
- `POST /vault/setup-tokens` - Create setup token for vaulting
- `GET /vault/setup-tokens/:id` - Get setup token details
- `POST /vault/payment-tokens` - Create payment token from setup token
- `POST /vault/charge` - Charge using vaulted payment token

### Events
- `POST /events/on` - Set up event listener for automatic charging
- `POST /events/emit` - Emit an event to trigger charging

## API Usage Examples

### Create an Order
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"value": "25.00", "currency": "USD"}'
```

### Capture an Order
```bash
curl -X POST http://localhost:3000/orders/ORDER_ID/capture
```

### Vault Setup Flow
```bash
# 1. Create setup token
curl -X POST http://localhost:3000/vault/setup-tokens

# 2. After approval, create payment token
curl -X POST http://localhost:3000/vault/payment-tokens \
  -H "Content-Type: application/json" \
  -d '{"setupTokenId": "SETUP_TOKEN_ID"}'

# 3. Charge using vaulted token
curl -X POST http://localhost:3000/vault/charge \
  -H "Content-Type: application/json" \
  -d '{"paymentTokenId": "PAYMENT_TOKEN_ID", "amount": "15.00", "currency": "USD"}'
```

### Event-driven Charging
```bash
# Set up event listener
curl -X POST http://localhost:3000/events/on \
  -H "Content-Type: application/json" \
  -d '{"eventName": "monthly-charge", "paymentTokenId": "PAYMENT_TOKEN_ID", "amount": "50.00"}'

# Emit event to trigger charge
curl -X POST http://localhost:3000/events/emit \
  -H "Content-Type: application/json" \
  -d '{"eventName": "monthly-charge", "payload": {"userId": "123"}}'
```

## CLI Usage

The original CLI functionality is still available:

```bash
# Basic orders
bun run cli create 20.00 USD
bun run cli capture ORDER_ID
bun run cli order ORDER_ID
bun run cli capture-status CAPTURE_ID

# Vault operations
bun run cli setup-token
bun run cli vault-finalize SETUP_TOKEN_ID
bun run cli charge PAYMENT_TOKEN_ID 2.00 USD

# Event operations
bun run cli on monthly-charge PAYMENT_TOKEN_ID 50.00
bun run cli emit monthly-charge '{"userId": "123"}'
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "error": "Error message if failed"
}
```

## Error Handling

The API includes comprehensive error handling with appropriate HTTP status codes:
- `400` - Bad Request (missing required parameters)
- `500` - Internal Server Error (PayPal API errors, etc.)
- `404` - Not Found (invalid endpoints)

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
