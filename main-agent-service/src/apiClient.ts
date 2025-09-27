import axios, { AxiosResponse } from 'axios';
import { config } from './config';
import { logger } from './logger';
import { MainAgentResponse, OrderRequest } from './types';

/**
 * API client for calling the Pyrex main agent endpoint
 */
export class MainAgentApiClient {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    this.baseUrl = config.mainAgentUrl;
    this.maxRetries = config.maxRetries;
    this.retryDelay = config.retryDelay;
  }

  /**
   * Calls the main agent endpoint to route a USD order
   */
  async routeOrder(orderRequest: OrderRequest): Promise<MainAgentResponse> {
    logger.info({ orderRequest }, 'Initiating order routing request');

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info({ attempt, maxRetries: this.maxRetries }, 'Attempting to call main agent');

        const response: AxiosResponse<MainAgentResponse> = await axios.post(
          this.baseUrl,
          orderRequest,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 second timeout
          }
        );

        if (response.status === 200 && response.data) {
          logger.info(
            { 
              auditId: response.data.audit_id,
              matchedOffersCount: response.data.matched_offers.length,
              totalPyusd: response.data.totals.total_pyusd,
              totalInr: response.data.totals.total_inr_estimated
            },
            'Successfully received response from main agent'
          );
          return response.data;
        } else {
          throw new Error(`Invalid response status: ${response.status}`);
        }
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          { 
            attempt, 
            maxRetries: this.maxRetries, 
            error: lastError.message 
          },
          'Failed to call main agent, retrying...'
        );

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    logger.error({ error: lastError }, 'All attempts to call main agent failed');
    throw new Error(`Failed to route order after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Utility method to add delay between retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => global.setTimeout(resolve, ms));
  }

  /**
   * Health check for the main agent endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple GET request to check if the service is reachable
      const healthUrl = this.baseUrl.replace('/route', '/health');
      const response = await axios.get(healthUrl, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.warn({ error }, 'Main agent health check failed');
      return false;
    }
  }
}
