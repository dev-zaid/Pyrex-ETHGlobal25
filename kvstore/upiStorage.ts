import { UpiTransaction, TransactionStatus, StorageConfig } from './types';
import { MemoryStorage } from './memoryStorage';

export class UpiStorage {
  private storage: MemoryStorage<UpiTransaction>;

  constructor(config: StorageConfig = {}) {
    this.storage = new MemoryStorage<UpiTransaction>({
      maxEntries: 5000,
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days for UPI transactions
      ...config
    });
  }

  /**
   * Create a new UPI transaction
   */
  async createTransaction(
    txnId: string,
    initialData: Partial<Omit<UpiTransaction, 'txnId' | 'createdAt' | 'updatedAt'>> = {}
  ): Promise<UpiTransaction> {
    const now = Date.now();
    const transaction: UpiTransaction = {
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
   * Get UPI transaction by ID
   */
  async getTransaction(txnId: string): Promise<UpiTransaction | null> {
    return await this.storage.get(txnId);
  }

  /**
   * Update transaction status
   */
  async updateStatus(txnId: string, status: TransactionStatus): Promise<UpiTransaction | null> {
    const transaction = await this.storage.get(txnId);
    if (!transaction) {
      return null;
    }

    const updatedTransaction: UpiTransaction = {
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
    updates: Partial<Omit<UpiTransaction, 'txnId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UpiTransaction | null> {
    const transaction = await this.storage.get(txnId);
    if (!transaction) {
      return null;
    }

    const updatedTransaction: UpiTransaction = {
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
  async markCompleted(txnId: string): Promise<UpiTransaction | null> {
    return await this.updateStatus(txnId, 'completed');
  }

  /**
   * Mark transaction as failed
   */
  async markFailed(txnId: string): Promise<UpiTransaction | null> {
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
  async getTransactionsByStatus(status: TransactionStatus): Promise<UpiTransaction[]> {
    const allIds = await this.storage.list();
    const transactions: UpiTransaction[] = [];

    for (const id of allIds) {
      const transaction = await this.storage.get(id);
      if (transaction && transaction.status === status) {
        transactions.push(transaction);
      }
    }

    return transactions;
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
