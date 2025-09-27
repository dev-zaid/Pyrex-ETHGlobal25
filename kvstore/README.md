# Pyrex KVStore

A TypeScript-based key-value storage system designed for tracking UPI and PayPal transactions with status management.

## Features

- **Dual Storage Systems**: Separate storage for UPI and PayPal transactions
- **Transaction Status Tracking**: Support for `progress`, `completed`, and `failed` statuses
- **Memory-based Storage**: Fast in-memory storage with automatic cleanup
- **TypeScript Support**: Full type safety and IntelliSense support
- **Configurable TTL**: Automatic expiration of old transactions
- **Statistics & Monitoring**: Built-in health checks and statistics

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Setup

```typescript
import { StorageManager } from './kvstore';

// Create storage manager with default config
const storage = new StorageManager();

// Or with custom configuration
const storage = new StorageManager(
  { maxEntries: 1000, ttl: 86400000 }, // UPI config
  { maxEntries: 2000, ttl: 2592000000 } // PayPal config (30 days)
);
```

### UPI Transactions

```typescript
// Create a new UPI transaction
const upiTransaction = await storage.createUpiTransaction('TXN_123456', {
  upiId: 'user@paytm',
  amount: 1000,
  currency: 'INR',
  merchantRefId: 'MERCHANT_REF_123'
});

// Update transaction status
await storage.updateUpiStatus('TXN_123456', 'completed');

// Or use convenience methods
await storage.markUpiCompleted('TXN_123456');
await storage.markUpiFailed('TXN_789012');

// Get transaction
const transaction = await storage.getUpiTransaction('TXN_123456');

// Get transactions by status
const completedTransactions = await storage.getUpiTransactionsByStatus('completed');
```

### PayPal Transactions

```typescript
// Create a new PayPal transaction
const paypalTransaction = await storage.createPaypalTransaction('PAYPAL_TXN_123', {
  paypalOrderId: 'ORDER_123456789',
  amount: 50.00,
  currency: 'USD',
  customerEmail: 'customer@example.com'
});

// Update transaction
await storage.updatePaypalTransaction('PAYPAL_TXN_123', {
  paypalTransactionId: 'TXN_987654321',
  status: 'completed'
});

// Find by PayPal Order ID
const transaction = await storage.getPaypalTransactionByOrderId('ORDER_123456789');

// Find by PayPal Transaction ID
const transaction = await storage.getPaypalTransactionByTransactionId('TXN_987654321');
```

### Combined Operations

```typescript
// Get all transactions by status across both storage systems
const allCompleted = await storage.getAllTransactionsByStatus('completed');
console.log('UPI completed:', allCompleted.upi.length);
console.log('PayPal completed:', allCompleted.paypal.length);

// Get transaction counts
const counts = await storage.getTransactionCounts();
console.log('UPI counts:', counts.upi);
console.log('PayPal counts:', counts.paypal);

// Storage statistics
const stats = storage.getStorageStats();
console.log('Storage stats:', stats);

// Health check
const health = await storage.healthCheck();
console.log('Health status:', health.status);
```

### Individual Storage Classes

You can also use individual storage classes directly:

```typescript
import { UpiStorage, PaypalStorage } from './kvstore';

const upiStorage = new UpiStorage();
const paypalStorage = new PaypalStorage();

// Use them independently...
```

## Configuration Options

### StorageConfig

```typescript
interface StorageConfig {
  maxEntries?: number;    // Maximum number of entries (default: 10000)
  ttl?: number;          // Time to live in milliseconds
  persistence?: boolean; // Future: persistent storage support
}
```

## Transaction Types

### UpiTransaction

```typescript
interface UpiTransaction {
  txnId: string;
  status: TransactionStatus;
  createdAt: number;
  updatedAt: number;
  upiId?: string;
  amount?: number;
  currency?: string;
  merchantRefId?: string;
  customerVpa?: string;
  metadata?: Record<string, any>;
}
```

### PaypalTransaction

```typescript
interface PaypalTransaction {
  txnId: string;
  status: TransactionStatus;
  createdAt: number;
  updatedAt: number;
  paypalOrderId?: string;
  amount?: number;
  currency?: string;
  merchantId?: string;
  customerEmail?: string;
  paypalTransactionId?: string;
  metadata?: Record<string, any>;
}
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Clean build artifacts
npm run clean
```

## Architecture

- **MemoryStorage**: Base in-memory storage with TTL and cleanup
- **UpiStorage**: Specialized storage for UPI transactions
- **PaypalStorage**: Specialized storage for PayPal transactions  
- **StorageManager**: Unified interface for both storage types

## Performance

- In-memory storage for fast access
- Automatic cleanup of expired entries
- Configurable limits to prevent memory leaks
- Efficient batch operations where possible

## License

MIT
