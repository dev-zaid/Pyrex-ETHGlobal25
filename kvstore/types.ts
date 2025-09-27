// Transaction status types
export type TransactionStatus = 'progress' | 'completed' | 'failed';

// Base transaction interface
export interface BaseTransaction {
  txnId: string;
  status: TransactionStatus;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

// UPI specific transaction
export interface UpiTransaction extends BaseTransaction {
  upiId?: string;
  amount?: number;
  currency?: string;
  merchantRefId?: string;
  customerVpa?: string;
}

// PayPal specific transaction
export interface PaypalTransaction extends BaseTransaction {
  paypalOrderId?: string;
  amount?: number;
  currency?: string;
  merchantId?: string;
  customerEmail?: string;
  paypalTransactionId?: string;
}

// Storage interface
export interface StorageInterface<T> {
  set(key: string, value: T): Promise<void>;
  get(key: string): Promise<T | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  list(): Promise<string[]>;
  clear(): Promise<void>;
}

// Storage configuration
export interface StorageConfig {
  maxEntries?: number;
  ttl?: number; // Time to live in milliseconds
  persistence?: boolean;
}
