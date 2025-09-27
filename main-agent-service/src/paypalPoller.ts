import { logger } from './logger';
import { OrderService } from './orderService';
import { TriggerRequest } from './types';

interface PaypalTransaction {
  txnId: string;
  status: 'progress' | 'completed' | 'failed';
  paypalOrderId?: string;
  amount?: number;
  currency?: string;
  merchantId?: string;
  customerEmail?: string;
  paypalTransactionId?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Service to poll PayPal kvstore for progress orders and trigger main-agent orders
 */
export class PaypalPoller {
  private orderService: OrderService;
  private kvstoreUrl: string;
  private pollInterval: number;
  private isPolling: boolean;
  private pollTimer?: NodeJS.Timeout;
  private processedTransactions: Set<string>;

  constructor(orderService: OrderService, kvstoreUrl: string = 'http://localhost:3031', pollInterval: number = 1000) {
    this.orderService = orderService;
    this.kvstoreUrl = kvstoreUrl;
    this.pollInterval = pollInterval;
    this.isPolling = false;
    this.processedTransactions = new Set();
  }

  /**
   * Start polling for PayPal progress orders
   */
  start(): void {
    if (this.isPolling) {
      logger.warn('PayPal poller is already running');
      return;
    }

    this.isPolling = true;
    logger.info({ 
      kvstoreUrl: this.kvstoreUrl, 
      pollInterval: this.pollInterval 
    }, 'Starting PayPal poller');

    this.poll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isPolling) {
      logger.warn('PayPal poller is not running');
      return;
    }

    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }

    logger.info('PayPal poller stopped');
  }

  /**
   * Main polling loop
   */
  private async poll(): Promise<void> {
    if (!this.isPolling) {
      return;
    }

    try {
      await this.checkProgressOrders();
    } catch (error) {
      logger.error({ error }, 'Error during PayPal polling');
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => {
      this.poll();
    }, this.pollInterval);
  }

  /**
   * Check for PayPal orders with progress status
   */
  private async checkProgressOrders(): Promise<void> {
    try {
      const response = await fetch(`${this.kvstoreUrl}/paypal/transactions?status=progress`);
      
      if (!response.ok) {
        logger.error({ 
          status: response.status, 
          statusText: response.statusText 
        }, 'Failed to fetch PayPal progress orders');
        return;
      }

      const transactions = await response.json() as PaypalTransaction[];
      
      if (transactions.length === 0) {
        // No progress orders found, continue polling
        return;
      }

      logger.info({ 
        count: transactions.length 
      }, 'Found PayPal progress orders');

      // Process each progress transaction
      for (const transaction of transactions) {
        await this.processProgressTransaction(transaction);
      }

    } catch (error) {
      logger.error({ error }, 'Failed to check PayPal progress orders');
    }
  }

  /**
   * Process a single progress transaction
   */
  private async processProgressTransaction(transaction: PaypalTransaction): Promise<void> {
    try {
      // Skip if we've already processed this transaction
      if (this.processedTransactions.has(transaction.txnId)) {
        return;
      }

      logger.info({ 
        txnId: transaction.txnId,
        amount: transaction.amount,
        currency: transaction.currency,
        customerEmail: transaction.customerEmail
      }, 'Processing PayPal progress transaction');

      // Extract target_pyusd from the transaction amount
      let targetPyusd: string;
      
      if (transaction.amount && transaction.currency) {
        // Convert to PYUSD if needed (assuming USD to PYUSD 1:1 for now)
        if (transaction.currency.toLowerCase() === 'usd') {
          targetPyusd = transaction.amount.toString();
        } else {
          // For other currencies, you might need conversion logic
          logger.warn({ 
            currency: transaction.currency, 
            amount: transaction.amount 
          }, 'Non-USD currency detected, using amount as-is');
          targetPyusd = transaction.amount.toString();
        }
      } else {
        logger.error({ 
          txnId: transaction.txnId 
        }, 'Transaction missing amount or currency');
        return;
      }

      // Create trigger request
      const triggerRequest: TriggerRequest = {
        target_pyusd: targetPyusd,
        vendor_upi: transaction.customerEmail || `paypal_${transaction.txnId}` // Use email as UPI or generate one
      };

      // Trigger the order
      const orderTrigger = await this.orderService.triggerOrder(triggerRequest);
      
      logger.info({ 
        txnId: transaction.txnId,
        orderId: orderTrigger.id,
        targetPyusd: triggerRequest.target_pyusd
      }, 'Successfully triggered order for PayPal transaction');

      // Mark transaction as processed
      this.processedTransactions.add(transaction.txnId);

      // Update the PayPal transaction status to completed in kvstore
      await this.updatePaypalTransactionStatus(transaction.txnId, 'completed');

    } catch (error) {
      logger.error({ 
        error, 
        txnId: transaction.txnId 
      }, 'Failed to process PayPal progress transaction');

      // Mark transaction as failed in kvstore
      try {
        await this.updatePaypalTransactionStatus(transaction.txnId, 'failed');
      } catch (updateError) {
        logger.error({ 
          error: updateError, 
          txnId: transaction.txnId 
        }, 'Failed to update PayPal transaction status to failed');
      }
    }
  }

  /**
   * Update PayPal transaction status in kvstore
   */
  private async updatePaypalTransactionStatus(txnId: string, status: 'completed' | 'failed'): Promise<void> {
    try {
      const response = await fetch(`${this.kvstoreUrl}/paypal/transactions/${txnId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info({ 
        txnId, 
        status 
      }, 'Updated PayPal transaction status in kvstore');

    } catch (error) {
      logger.error({ 
        error, 
        txnId, 
        status 
      }, 'Failed to update PayPal transaction status in kvstore');
      throw error;
    }
  }

  /**
   * Get polling status
   */
  getStatus(): { isPolling: boolean; processedCount: number; kvstoreUrl: string; pollInterval: number } {
    return {
      isPolling: this.isPolling,
      processedCount: this.processedTransactions.size,
      kvstoreUrl: this.kvstoreUrl,
      pollInterval: this.pollInterval
    };
  }

  /**
   * Clear processed transactions (useful for testing)
   */
  clearProcessedTransactions(): void {
    this.processedTransactions.clear();
    logger.info('Cleared processed transactions cache');
  }
}
