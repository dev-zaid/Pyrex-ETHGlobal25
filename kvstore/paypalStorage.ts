import { PaypalTransaction, TransactionStatus, StorageConfig } from './types';
import { MemoryStorage } from './memoryStorage';

export class PaypalStorage {
  private storage: MemoryStorage<PaypalTransaction>;

  constructor(config: StorageConfig = {}) {
    this.storage = new MemoryStorage<PaypalTransaction>({
      maxEntries: 5000,
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days for PayPal transactions (longer retention)
      ...config
    });
  }

  /**
   * Create a new PayPal transaction
   */
  async createTransaction(
    txnId: string,
    initialData: Partial<Omit<PaypalTransaction, 'txnId' | 'createdAt' | 'updatedAt'>> = {}
  ): Promise<PaypalTransaction> {
    const now = Date.now();
    const transaction: PaypalTransaction = {
      txnId,
      status: 'progress',
      createdAt: now,
      updatedAt: now,
      ...initialData
    };

    await this.storage.set(txnId, transaction);
    return transaction;
  }

  /**
   * Get PayPal transaction by ID
   */
  async getTransaction(txnId: string): Promise<PaypalTransaction | null> {
    return await this.storage.get(txnId);
  }

  /**
   * Update transaction status
   */
  async updateStatus(txnId: string, status: TransactionStatus): Promise<PaypalTransaction | null> {
    const transaction = await this.storage.get(txnId);
    if (!transaction) {
      return null;
    }

    const updatedTransaction: PaypalTransaction = {
      ...transaction,
      status,
      updatedAt: Date.now()
    };

    await this.storage.set(txnId, updatedTransaction);
    return updatedTransaction;
  }

  /**
   * Update transaction with additional data
   */
  async updateTransaction(
    txnId: string,
    updates: Partial<Omit<PaypalTransaction, 'txnId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PaypalTransaction | null> {
    const transaction = await this.storage.get(txnId);
    if (!transaction) {
      return null;
    }

    const updatedTransaction: PaypalTransaction = {
      ...transaction,
      ...updates,
      updatedAt: Date.now()
    };

    await this.storage.set(txnId, updatedTransaction);
    return updatedTransaction;
  }

  /**
   * Mark transaction as completed
   */
  async markCompleted(txnId: string): Promise<PaypalTransaction | null> {
    return await this.updateStatus(txnId, 'completed');
  }

  /**
   * Mark transaction as failed
   */
  async markFailed(txnId: string): Promise<PaypalTransaction | null> {
    return await this.updateStatus(txnId, 'failed');
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(txnId: string): Promise<boolean> {
    return await this.storage.delete(txnId);
  }

  /**
   * Check if transaction exists
   */
  async hasTransaction(txnId: string): Promise<boolean> {
    return await this.storage.exists(txnId);
  }

  /**
   * Get all transaction IDs
   */
  async getAllTransactionIds(): Promise<string[]> {
    return await this.storage.list();
  }

  /**
   * Get transactions by status
   */
  async getTransactionsByStatus(status: TransactionStatus): Promise<PaypalTransaction[]> {
    const allIds = await this.storage.list();
    const transactions: PaypalTransaction[] = [];

    for (const id of allIds) {
      const transaction = await this.storage.get(id);
      if (transaction && transaction.status === status) {
        transactions.push(transaction);
      }
    }

    return transactions;
  }

  /**
   * Get transactions by PayPal Order ID
   */
  async getTransactionByPaypalOrderId(paypalOrderId: string): Promise<PaypalTransaction | null> {
    const allIds = await this.storage.list();
    
    for (const id of allIds) {
      const transaction = await this.storage.get(id);
      if (transaction && transaction.paypalOrderId === paypalOrderId) {
        return transaction;
      }
    }

    return null;
  }

  /**
   * Get transactions by PayPal Transaction ID
   */
  async getTransactionByPaypalTransactionId(paypalTransactionId: string): Promise<PaypalTransaction | null> {
    const allIds = await this.storage.list();
    
    for (const id of allIds) {
      const transaction = await this.storage.get(id);
      if (transaction && transaction.paypalTransactionId === paypalTransactionId) {
        return transaction;
      }
    }

    return null;
  }

  /**
   * Clear all transactions
   */
  async clearAll(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return this.storage.getStats();
  }

  /**
   * Get count of transactions by status
   */
  async getStatusCounts(): Promise<Record<TransactionStatus, number>> {
    const allIds = await this.storage.list();
    const counts: Record<TransactionStatus, number> = {
      progress: 0,
      completed: 0,
      failed: 0
    };

    for (const id of allIds) {
      const transaction = await this.storage.get(id);
      if (transaction) {
        counts[transaction.status]++;
      }
    }

    return counts;
  }
}
