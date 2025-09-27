import { fulfillOrder } from '../src/services/fulfillmentService';
import { CashfreeApiError, CashfreeFulfillmentError } from '../src/errors';

jest.mock('../src/clients/orderbook', () => ({
  fetchReservation: jest.fn(),
}));

jest.mock('../src/clients/cashfree', () => ({
  createDirectTransfer: jest.fn(),
}));

const { fetchReservation } = require('../src/clients/orderbook');
const { createDirectTransfer } = require('../src/clients/cashfree');

describe('fulfillmentService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('throws when reservation not found', async () => {
    fetchReservation.mockResolvedValue(null);
    await expect(fulfillOrder({ orderId: 'res-1' })).rejects.toThrow('Reservation res-1 not found or inactive');
  });

  it('throws when reservation is not pending', async () => {
    fetchReservation.mockResolvedValue({ id: 'res-1', amount_pyusd: '10', status: 'committed' });
    await expect(fulfillOrder({ orderId: 'res-1' })).rejects.toThrow('Reservation res-1 is not pending');
  });

  it('throws when expected amount mismatches reservation', async () => {
    fetchReservation.mockResolvedValue({ id: 'res-1', amount_pyusd: '5', status: 'pending' });
    await expect(
      fulfillOrder({ orderId: 'res-1', expectedAmount: 10 }),
    ).rejects.toThrow('Requested amount (10) does not match reserved liquidity (5)');
  });

  it('returns Cashfree response using reservation amount', async () => {
    fetchReservation.mockResolvedValue({ id: 'res-1', amount_pyusd: '10', status: 'pending' });
    createDirectTransfer.mockResolvedValue({ referenceId: 'payout_123', status: 'SUCCESS', amount: 10 });

    const result = await fulfillOrder({ orderId: 'res-1' });

    expect(createDirectTransfer).toHaveBeenCalledWith({
      transferMode: 'upi',
      amount: 10,
      transferId: 'res-1',
      beneDetails: {
        name: 'Hackathon Seller',
        phone: '9999999999',
        email: 'johndoe_1@cashfree.com',
        address1: 'Becharam Chatterjee Road',
        vpa: 'success@upi',
      },
    });
    expect(result).toEqual({
      reservationId: 'res-1',
      amount: 10,
      cashfree: { reference_id: 'payout_123', status: 'SUCCESS' },
    });
  });

  it('wraps Cashfree API errors with details', async () => {
    fetchReservation.mockResolvedValue({ id: 'res-1', amount_pyusd: '10', status: 'pending' });
    createDirectTransfer.mockRejectedValue(
      new CashfreeApiError('Token is not valid', {
        provider_status: 'ERROR',
        provider_sub_code: '403',
        provider_message: 'Token is not valid',
      }),
    );

    await expect(fulfillOrder({ orderId: 'res-1' })).rejects.toMatchObject({
      message: 'Cashfree transaction failed',
      details: {
        provider_status: 'ERROR',
        provider_sub_code: '403',
        provider_message: 'Token is not valid',
      },
    });
  });

  it('throws user-friendly error when Cashfree unexpectedly fails', async () => {
    fetchReservation.mockResolvedValue({ id: 'res-1', amount_pyusd: '10', status: 'pending' });
    createDirectTransfer.mockRejectedValue(new Error('network error'));

    const promise = fulfillOrder({ orderId: 'res-1' });

    await expect(promise).rejects.toBeInstanceOf(CashfreeFulfillmentError);
    await expect(promise).rejects.toMatchObject({
      message: 'Cashfree transaction failed',
      details: {},
    });
  });
});
