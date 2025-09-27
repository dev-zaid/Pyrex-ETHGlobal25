import { fulfillOrder } from '../src/services/fulfillmentService';

jest.mock('../src/db/reservations', () => ({
  findReservationById: jest.fn(),
}));

jest.mock('../src/clients/razorpay', () => ({
  createUpiPayment: jest.fn(),
}));

const { findReservationById } = require('../src/db/reservations');
const { createUpiPayment } = require('../src/clients/razorpay');

describe('fulfillmentService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('throws when reservation not found', async () => {
    findReservationById.mockResolvedValue(null);
    await expect(fulfillOrder({ orderId: 'res-1', amount: 10 })).rejects.toThrow('Reservation res-1 not found or inactive');
  });

  it('throws when amount exceeds available', async () => {
    findReservationById.mockResolvedValue({ id: 'res-1', amount_pyusd: '5', status: 'pending' });
    await expect(fulfillOrder({ orderId: 'res-1', amount: 10 })).rejects.toThrow('Requested amount exceeds reserved liquidity (5)');
  });

  it('returns Razorpay response on success', async () => {
    findReservationById.mockResolvedValue({ id: 'res-1', amount_pyusd: '10', status: 'pending' });
    createUpiPayment.mockResolvedValue({ id: 'pay_123', status: 'captured', amount: 1000, currency: 'INR' });

    const result = await fulfillOrder({ orderId: 'res-1', amount: 10 });

    expect(createUpiPayment).toHaveBeenCalledWith({
      amount: 1000,
      currency: 'INR',
      upi: { vpa: 'success@upi' },
      reference_id: 'res-1',
    });
    expect(result).toEqual({
      reservationId: 'res-1',
      amount: 10,
      razorpay: { payment_id: 'pay_123', status: 'captured' },
    });
  });

  it('throws user-friendly error when Razorpay fails', async () => {
    findReservationById.mockResolvedValue({ id: 'res-1', amount_pyusd: '10', status: 'pending' });
    createUpiPayment.mockRejectedValue(new Error('network error'));

    await expect(fulfillOrder({ orderId: 'res-1', amount: 10 })).rejects.toThrow('Razorpay transaction failed');
  });
});
