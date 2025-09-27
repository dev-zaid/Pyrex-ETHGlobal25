import request from 'supertest';
import app from '../src/index';

jest.mock('../src/services/orderProcessor', () => ({
  scheduleFulfillment: jest.fn(),
}));

const { scheduleFulfillment } = require('../src/services/orderProcessor');

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
    scheduleFulfillment.mockResolvedValue({
      reservationId: 'res-1',
      amount: 10,
      cashfree: { reference_id: 'payout_123', status: 'SUCCESS' },
    });

    const res = await request(app).post('/fulfill-order').send({ order_id: 'res-1', amount: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      audit_id: 'order-res-1',
      reservation_id: 'res-1',
      requested_amount: 10,
      cashfree: { reference_id: 'payout_123', status: 'SUCCESS' },
    });
  });

  it('propagates fulfillment errors with proper status code', async () => {
    scheduleFulfillment.mockRejectedValue(new Error('Cashfree transaction failed'));
    const res = await request(app).post('/fulfill-order').send({ order_id: 'res-1', amount: 10 });
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Cashfree transaction failed' });
  });
});
