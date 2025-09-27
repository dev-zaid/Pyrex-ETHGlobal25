import request from 'supertest';
import app from '../src/index';

jest.mock('../src/services/fulfillmentService', () => ({
  fulfillOrder: jest.fn(),
}));

const { fulfillOrder } = require('../src/services/fulfillmentService');

describe('POST /fulfill-order', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 400 when order_id missing', async () => {
    const res = await request(app).post('/fulfill-order').send({ amount: 10 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when amount invalid', async () => {
    const res = await request(app).post('/fulfill-order').send({ order_id: 'res-1', amount: 'abc' });
    expect(res.status).toBe(400);
  });

  it('returns fulfillment result on success', async () => {
    fulfillOrder.mockResolvedValue({
      reservationId: 'res-1',
      amount: 10,
      razorpay: { payment_id: 'pay_123', status: 'captured' },
    });

    const res = await request(app).post('/fulfill-order').send({ order_id: 'res-1', amount: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      audit_id: 'order-res-1',
      reservation_id: 'res-1',
      requested_amount: 10,
      razorpay: { payment_id: 'pay_123', status: 'captured' },
    });
  });

  it('propagates fulfillment errors with proper status code', async () => {
    fulfillOrder.mockRejectedValue(new Error('Razorpay transaction failed'));
    const res = await request(app).post('/fulfill-order').send({ order_id: 'res-1', amount: 10 });
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Razorpay transaction failed' });
  });
});
