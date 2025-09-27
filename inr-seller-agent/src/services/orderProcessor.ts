import { logger } from '../utils/logger';
import { KeyedMutex } from '../utils/keyedMutex';
import { Semaphore } from '../utils/semaphore';
import { fulfillOrder, FulfillmentRequest, FulfillmentResult } from './fulfillmentService';

const DEFAULT_CONCURRENCY = 4;

function resolveConcurrency(): number {
  const raw = process.env.MAX_CONCURRENT_FULFILLMENTS;
  if (!raw) {
    return DEFAULT_CONCURRENCY;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn({ raw }, 'Invalid MAX_CONCURRENT_FULFILLMENTS; falling back to default');
    return DEFAULT_CONCURRENCY;
  }
  return Math.floor(parsed);
}

const semaphore = new Semaphore(resolveConcurrency());
const reservationMutex = new KeyedMutex();

export async function scheduleFulfillment(request: FulfillmentRequest): Promise<FulfillmentResult> {
  const release = await semaphore.acquire();
  try {
    return await reservationMutex.runExclusive(request.orderId, async () => {
      logger.debug({ orderId: request.orderId }, 'Executing fulfillment request');
      return fulfillOrder(request);
    });
  } finally {
    release();
  }
}
