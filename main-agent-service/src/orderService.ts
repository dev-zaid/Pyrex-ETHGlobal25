import { v4 as uuidv4 } from 'uuid';
import { MainAgentApiClient } from './apiClient';
import { logger } from './logger';
import { OrderRequest, TriggerRequest, OrderTrigger, MainAgentResponse, PaymentResult } from './types';
import { startPayment } from './payment/src';

/**
 * Service to handle USD order triggers and coordinate with the main agent
 */
export class OrderService {
  private apiClient: MainAgentApiClient;
  private activeOrders: Map<string, OrderTrigger>;

  constructor() {
    this.apiClient = new MainAgentApiClient();
    this.activeOrders = new Map();
  }

  /**
   * Transforms a trigger request into the format expected by the main agent
   */
  private transformTriggerRequest(triggerRequest: TriggerRequest): OrderRequest {
    return {
      target_pyusd: triggerRequest.target_pyusd,
      constraints: {
        max_latency_ms: 20000,
        max_fee_pct: 0.03
      },
      payment_context: {
        chain: "polygon",
        payer: "0x1234567890abcdef1234567890abcdef12345678",
        tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12"
      }
    };
  }

  /**
   * Triggers an order for USD amount
   */
  async triggerOrder(triggerRequest: TriggerRequest): Promise<OrderTrigger> {
    const orderId = uuidv4();
    
    const orderTrigger: OrderTrigger = {
      id: orderId,
      target_pyusd: triggerRequest.target_pyusd,
      vendor_upi: triggerRequest.vendor_upi,
      payer: "0x1234567890abcdef1234567890abcdef12345678",
      tx_hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
      timestamp: new Date(),
      status: 'pending',
    };

    this.activeOrders.set(orderId, orderTrigger);

    logger.info(
      { 
        orderId, 
        targetPyusd: triggerRequest.target_pyusd, 
        vendorUpi: triggerRequest.vendor_upi
      },
      'Order trigger initiated'
    );

    try {
      // Update status to processing
      orderTrigger.status = 'processing';
      this.activeOrders.set(orderId, orderTrigger);

      // Transform trigger request to order request format
      const orderRequest = this.transformTriggerRequest(triggerRequest);
      
      // Call the main agent API
      const response: MainAgentResponse = await this.apiClient.routeOrder(orderRequest);

      // Process payments for each matched offer individually
      let paymentResults: PaymentResult[] = [];
      if (response.matched_offers && response.matched_offers.length > 0) {
        logger.info(
          { 
            orderId, 
            matchedOffersCount: response.matched_offers.length 
          },
          'Starting payment processing for matched offers'
        );
        for (const matchedOffer of response.matched_offers) {
          try {
            logger.info(
              { 
                orderId, 
                offerId: matchedOffer.offer_id,
                sellerPubkey: matchedOffer.seller_pubkey,
                reservedPyusd: matchedOffer.reserved_pyusd
              },
              'Processing payment for matched offer'
            );

            // Convert PYUSD amount to wei (assuming 6 decimals for PYUSD)
            const amountInWei = (matchedOffer.reserved_pyusd * 1e6).toString();
            
            await startPayment(amountInWei);
            
            paymentResults.push({
              offerId: matchedOffer.offer_id,
              success: true,
              amount: matchedOffer.reserved_pyusd
            });

            logger.info(
              { 
                orderId, 
                offerId: matchedOffer.offer_id,
                amount: matchedOffer.reserved_pyusd
              },
              'Payment completed successfully for offer'
            );

          } catch (error) {
            logger.error(
              { 
                orderId, 
                offerId: matchedOffer.offer_id,
                error: (error as Error).message 
              },
              'Payment failed for offer'
            );

            paymentResults.push({
              offerId: matchedOffer.offer_id,
              success: false,
              error: (error as Error).message,
              amount: matchedOffer.reserved_pyusd
            });
          }
        }

        const successfulPayments = paymentResults.filter(p => p.success).length;
        logger.info(
          { 
            orderId, 
            totalPayments: paymentResults.length,
            successfulPayments,
            failedPayments: paymentResults.length - successfulPayments
          },
          'Payment processing completed for all offers'
        );
      }
      
      // Update order with successful response and payment results
      orderTrigger.status = 'completed';
      orderTrigger.response = response;
      orderTrigger.paymentResults = paymentResults;
      this.activeOrders.set(orderId, orderTrigger);

      logger.info(
        { 
          orderId, 
          auditId: response.audit_id,
          matchedOffersCount: response.matched_offers.length,
          totalPyusd: response.totals.total_pyusd
        },
        'Order completed successfully'
      );

      return orderTrigger;

    } catch (error) {
      // Update order with error
      orderTrigger.status = 'failed';
      orderTrigger.error = (error as Error).message;
      this.activeOrders.set(orderId, orderTrigger);

      logger.error(
        { 
          orderId, 
          error: (error as Error).message 
        },
        'Order failed'
      );

      throw error;
    }
  }

  /**
   * Gets the status of an order by ID
   */
  getOrderStatus(orderId: string): OrderTrigger | null {
    return this.activeOrders.get(orderId) || null;
  }

  /**
   * Gets all active orders
   */
  getAllOrders(): OrderTrigger[] {
    return Array.from(this.activeOrders.values());
  }

  /**
   * Gets orders by status
   */
  getOrdersByStatus(status: OrderTrigger['status']): OrderTrigger[] {
    return Array.from(this.activeOrders.values()).filter(order => order.status === status);
  }

  /**
   * Cleans up completed/failed orders older than specified hours
   */
  cleanupOldOrders(hoursOld: number = 24): void {
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [orderId, order] of this.activeOrders.entries()) {
      if (
        (order.status === 'completed' || order.status === 'failed') &&
        order.timestamp < cutoffTime
      ) {
        this.activeOrders.delete(orderId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info({ cleanedCount }, 'Cleaned up old orders');
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; mainAgentHealth: boolean; activeOrders: number }> {
    const mainAgentHealth = await this.apiClient.healthCheck();
    const activeOrdersCount = this.activeOrders.size;

    return {
      status: 'ok',
      mainAgentHealth,
      activeOrders: activeOrdersCount,
    };
  }
}
