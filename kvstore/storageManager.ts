import { UpiStorage } from './upiStorage';
import { PaypalStorage } from './paypalStorage';
import { UpiTransaction, PaypalTransaction, TransactionStatus, StorageConfig } from './types';

export class StorageManager {
  private upiStorage: UpiStorage;
  private paypalStorage: PaypalStorage;

  constructor(upiConfig?: StorageConfig, paypalConfig?: StorageConfig) {
    this.upiStorage = new UpiStorage(upiConfig);
    this.paypalStorage = new PaypalStorage(paypalConfig);
  }

  // UPI Storage Methods
  async createUpiTransaction(
    txnId: string,
    initialData?: Partial<Omit<UpiTransaction, 'txnId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UpiTransaction> {
    return await this.upiStorage.createTransaction(txnId, initialData);
  }

  async getUpiTransaction(txnId: string): Promise<UpiTransaction | null> {
    return await this.upiStorage.getTransaction(txnId);
  }

  async updateUpiStatus(txnId: string, status: TransactionStatus): Promise<UpiTransaction | null> {
    return await this.upiStorage.updateStatus(txnId, status);
  }

  async updateUpiTransaction(
    txnId: string,
    updates: Partial<Omit<UpiTransaction, 'txnId' | 'createdAt' | 'updatedAt'>>
  ): Promise<UpiTransaction | null> {
    return await this.upiStorage.updateTransaction(txnId, updates);
  }

  async markUpiCompleted(txnId: string): Promise<UpiTransaction | null> {
    return await this.upiStorage.markCompleted(txnId);
  }

  async markUpiFailed(txnId: string): Promise<UpiTransaction | null> {
    return await this.upiStorage.markFailed(txnId);
  }

  async deleteUpiTransaction(txnId: string): Promise<boolean> {
    return await this.upiStorage.deleteTransaction(txnId);
  }

  async getUpiTransactionsByStatus(status: TransactionStatus): Promise<UpiTransaction[]> {
    return await this.upiStorage.getTransactionsByStatus(status);
  }

  // PayPal Storage Methods
  async createPaypalTransaction(
    txnId: string,
    initialData?: Partial<Omit<PaypalTransaction, 'txnId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PaypalTransaction> {
    return await this.paypalStorage.createTransaction(txnId, initialData);
  }

  async getPaypalTransaction(txnId: string): Promise<PaypalTransaction | null> {
    return await this.paypalStorage.getTransaction(txnId);
  }

  async updatePaypalStatus(txnId: string, status: TransactionStatus): Promise<PaypalTransaction | null> {
    return await this.paypalStorage.updateStatus(txnId, status);
  }

  async updatePaypalTransaction(
    txnId: string,
    updates: Partial<Omit<PaypalTransaction, 'txnId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PaypalTransaction | null> {
    return await this.paypalStorage.updateTransaction(txnId, updates);
  }

  async markPaypalCompleted(txnId: string): Promise<PaypalTransaction | null> {
    return await this.paypalStorage.markCompleted(txnId);
  }

  async markPaypalFailed(txnId: string): Promise<PaypalTransaction | null> {
    return await this.paypalStorage.markFailed(txnId);
  }

  async deletePaypalTransaction(txnId: string): Promise<boolean> {
    return await this.paypalStorage.deleteTransaction(txnId);
  }

  async getPaypalTransactionsByStatus(status: TransactionStatus): Promise<PaypalTransaction[]> {
    return await this.paypalStorage.getTransactionsByStatus(status);
  }

  async getPaypalTransactionByOrderId(paypalOrderId: string): Promise<PaypalTransaction | null> {
    return await this.paypalStorage.getTransactionByPaypalOrderId(paypalOrderId);
  }

  async getPaypalTransactionByTransactionId(paypalTransactionId: string): Promise<PaypalTransaction | null> {
    return await this.paypalStorage.getTransactionByPaypalTransactionId(paypalTransactionId);
  }

  // Combined Operations
  async getAllTransactionsByStatus(status: TransactionStatus): Promise<{
    upi: UpiTransaction[];
    paypal: PaypalTransaction[];
  }> {
    const [upiTransactions, paypalTransactions] = await Promise.all([
      this.upiStorage.getTransactionsByStatus(status),
      this.paypalStorage.getTransactionsByStatus(status)
    ]);

    return {
      upi: upiTransactions,
      paypal: paypalTransactions
    };
  }

  async getTransactionCounts(): Promise<{
    upi: Record<TransactionStatus, number>;
    paypal: Record<TransactionStatus, number>;
  }> {
    const [upiCounts, paypalCounts] = await Promise.all([
      this.upiStorage.getStatusCounts(),
      this.paypalStorage.getStatusCounts()
    ]);

    return {
      upi: upiCounts,
      paypal: paypalCounts
    };
  }

  async clearAllTransactions(): Promise<void> {
    await Promise.all([
      this.upiStorage.clearAll(),
      this.paypalStorage.clearAll()
    ]);
  }

  // Statistics and Monitoring
  getStorageStats(): {
    upi: ReturnType<UpiStorage['getStats']>;
    paypal: ReturnType<PaypalStorage['getStats']>;
  } {
    return {
      upi: this.upiStorage.getStats(),
      paypal: this.paypalStorage.getStats()
    };
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    upi: { status: string; count: number };
    paypal: { status: string; count: number };
  }> {
    try {
      const upiStats = this.upiStorage.getStats();
      const paypalStats = this.paypalStorage.getStats();

      return {
        status: 'healthy',
        upi: {
          status: 'operational',
          count: upiStats.size
        },
        paypal: {
          status: 'operational',
          count: paypalStats.size
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        upi: {
          status: 'error',
          count: 0
        },
        paypal: {
          status: 'error',
          count: 0
        }
      };
    }
  }
}
