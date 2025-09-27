import type { FulfillmentResult } from '../src/services/fulfillmentService';

describe('orderProcessor concurrency', () => {
  const originalEnv = process.env.MAX_CONCURRENT_FULFILLMENTS;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    if (originalEnv === undefined) {
      delete process.env.MAX_CONCURRENT_FULFILLMENTS;
    } else {
      process.env.MAX_CONCURRENT_FULFILLMENTS = originalEnv;
    }
  });

  it('serializes fulfillment for the same reservation id', async () => {
    jest.resetModules();
    process.env.MAX_CONCURRENT_FULFILLMENTS = '3';

    const activeByOrder = new Map<string, number>();
    const results: FulfillmentResult = {
      reservationId: 'res-1',
      amount: 5,
      cashfree: { reference_id: 'ref', status: 'SUCCESS' },
    };

    const fulfillOrderMock = jest.fn(async ({ orderId }: { orderId: string }) => {
      const current = activeByOrder.get(orderId) ?? 0;
      activeByOrder.set(orderId, current + 1);
      if (current > 0) {
        throw new Error('Concurrent execution detected for same reservation');
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      activeByOrder.set(orderId, current);
      return { ...results, reservationId: orderId };
    });

    jest.doMock('../src/services/fulfillmentService', () => ({
      fulfillOrder: fulfillOrderMock,
    }));

    const { scheduleFulfillment } = await import('../src/services/orderProcessor');

    const first = scheduleFulfillment({ orderId: 'res-1', expectedAmount: 5 });
    const second = scheduleFulfillment({ orderId: 'res-1', expectedAmount: 2 });

    const settled = await Promise.all([first, second]);

    expect(settled).toHaveLength(2);
    expect(fulfillOrderMock).toHaveBeenCalledTimes(2);
    expect(activeByOrder.get('res-1')).toBe(0);
  });

  it('limits overall concurrency according to configuration', async () => {
    jest.resetModules();
    process.env.MAX_CONCURRENT_FULFILLMENTS = '2';

    let active = 0;
    let peak = 0;
    const fulfillOrderMock = jest.fn(async ({ orderId }: { orderId: string }) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return {
        reservationId: orderId,
        amount: 1,
        cashfree: { reference_id: `ref-${orderId}`, status: 'SUCCESS' },
      } as FulfillmentResult;
    });

    jest.doMock('../src/services/fulfillmentService', () => ({
      fulfillOrder: fulfillOrderMock,
    }));

    const { scheduleFulfillment } = await import('../src/services/orderProcessor');

    const tasks = ['res-a', 'res-b', 'res-c', 'res-d'].map((id) =>
      scheduleFulfillment({ orderId: id, expectedAmount: 1 }),
    );

    await Promise.all(tasks);

    expect(peak).toBeLessThanOrEqual(2);
    expect(fulfillOrderMock).toHaveBeenCalledTimes(4);
  });
});
