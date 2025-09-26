# Pyrex - Orderbook Service

A Node.js microservice for managing seller orderbooks in the Pyrex ecosystem. This service handles PYUSD to INR offers with cryptographic signature verification and PostgreSQL persistence.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- Docker and Docker Compose
- PostgreSQL 15+

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd pyrex/orderbook-service
   npm install
   ```

2. **Start the database**
   ```bash
   cd ../database
   docker compose up -d
   ```

3. **Run migrations**
   ```bash
   psql postgres://pyrex:pyrex_pass@localhost:5432/pyrex_db -f migrations/001_create_orderbook.sql
   ```

4. **Start the service**
   ```bash
   cd ../orderbook-service
   npm start
   ```

The service will be available at `http://localhost:3000`

## 📋 API Endpoints

### POST /offers
Create or update a seller offer.

**Request Body:**
```json
{
  "seller_pubkey": "0x742d35Cc6634C0532925a3b8D0C0C1b2C3D4E5F6",
  "chain": "polygon",
  "token": "PYUSD",
  "rate_pyusd_per_inr": "0.01234",
  "min_pyusd": "10.0",
  "max_pyusd": "1000.0",
  "available_pyusd": "500.0",
  "fee_pct": "0.002",
  "est_latency_ms": 12000,
  "supports_swap": true,
  "upi_enabled": true,
  "nonce": 1,
  "expiry_timestamp": "2025-06-01T00:00:00Z",
  "signature": "0x1234..."
}
```

**Response:** `201 Created` with the stored offer record.

### GET /offers
Fetch orderbook snapshot with optional filters.

**Query Parameters:**
- `chain` - Blockchain (default: polygon)
- `token` - Token symbol (default: PYUSD)
- `min_amount` - Minimum PYUSD amount
- `max_amount` - Maximum PYUSD amount
- `limit` - Maximum number of offers
- `sort` - Sort by `rate` or `latency`

**Response:** `200 OK` with offers array and count.

### GET /offers/:id
Fetch a single offer by ID.

**Response:** `200 OK` with offer details or `404 Not Found`.

### POST /offers/:id/cancel
Cancel an offer (requires signature verification).

**Request Body:**
```json
{
  "signature": "0x1234..."
}
```

## 🔐 Signature Verification

All offers must be cryptographically signed by the seller. The service uses ECDSA signatures over a canonical JSON representation.

### Canonical Format
Fields must be ordered as:
```
[seller_pubkey, chain, token, rate_pyusd_per_inr, min_pyusd, max_pyusd, available_pyusd, fee_pct, est_latency_ms, supports_swap, upi_enabled, nonce, expiry_timestamp]
```

### Signing Process
1. Create canonical JSON string with exact field ordering
2. Compute Keccak256 hash of UTF-8 bytes
3. Sign the hash with seller's private key
4. Include signature in offer payload

## 🗄️ Database Schema

### Offers Table
- `id` - UUID primary key
- `seller_pubkey` - Seller's public key (66 chars)
- `chain` - Blockchain identifier
- `token` - Token symbol
- `rate_pyusd_per_inr` - Exchange rate (18 decimals)
- `min_pyusd` - Minimum trade size (8 decimals)
- `max_pyusd` - Maximum trade size (8 decimals)
- `available_pyusd` - Available liquidity (8 decimals)
- `fee_pct` - Fee percentage (6 decimals)
- `est_latency_ms` - Estimated settlement time
- `supports_swap` - Whether swap is supported
- `upi_enabled` - Whether UPI is enabled
- `status` - Offer status (active/paused/cancelled/expired)
- `nonce` - Replay protection counter
- `expiry_timestamp` - Offer expiration
- `signature` - Cryptographic signature
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Tests include:
- Signature verification (valid/invalid)
- Nonce replay protection
- Offer lifecycle (create/fetch/cancel)
- API endpoint validation
- Database operations

## 🌱 Seeding Data

Populate the orderbook with test data:

```bash
# Seed offers
node scripts/seed_offers.js seed

# List current offers
node scripts/seed_offers.js list
```

## 🔧 Configuration

Environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## 📊 Monitoring

The service includes:
- Rate limiting on POST endpoints
- Comprehensive error handling
- Request/response logging
- Database connection pooling

## 🏗️ Architecture

```
orderbook-service/
├── src/
│   ├── app.js              # Express app setup
│   ├── server.js           # Server startup
│   ├── db.js               # Database connection
│   ├── routes/
│   │   └── offers.js       # API endpoints
│   ├── services/
│   │   ├── offersService.js # Database operations
│   │   └── signature.js    # Signature verification
│   ├── middleware/
│   │   └── rateLimiter.js  # Rate limiting
│   └── validators/
│       └── offerValidator.js # Input validation
├── tests/                  # Test suite
├── scripts/                # Utility scripts
├── fixtures/               # Test data
└── package.json
```

## 🚀 Deployment

### Docker
```bash
docker build -t pyrex-orderbook .
docker run -p 3000:3000 --env-file .env pyrex-orderbook
```

### Production Considerations
- Use HTTPS in production
- Configure proper CORS policies
- Set up database connection pooling
- Implement health checks
- Add metrics and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the test suite for usage examples
- Review the API documentation above
- Open an issue in the repository
