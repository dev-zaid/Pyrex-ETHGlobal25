import { fetchReservation } from '../clients/orderbook';
import { logger } from '../utils/logger';
import { createDirectTransfer } from '../clients/cashfree';

export interface FulfillmentRequest {
  orderId: string;
  amount: number;
}

export interface ReservationCheck {
  reservationId: string;
  amountAvailable: number;
}

export interface FulfillmentResult {
  reservationId: string;
  amount: number;
  cashfree: {
    reference_id: string;
    status: string;
  };
}

export async function validateReservation({ orderId, amount }: FulfillmentRequest): Promise<ReservationCheck> {
  const record = await fetchReservation(orderId);
  if (!record) {
    throw new Error(`Reservation ${orderId} not found or inactive`);
  }

  const available = Number(record.amount_pyusd);
  if (Number.isNaN(available)) {
    logger.warn({ record }, 'Reservation amount is NaN');
    throw new Error('Reservation amount invalid');
  }

  if (amount > available + 1e-8) {
    throw new Error(`Requested amount exceeds reserved liquidity (${available})`);
  }

  return { reservationId: record.id, amountAvailable: available };
}

export async function fulfillOrder(request: FulfillmentRequest): Promise<FulfillmentResult> {
  const { reservationId } = await validateReservation(request);

  const transferId = reservationId;
  let transferResponse;
  try {
    transferResponse = await createDirectTransfer({
      transferMode: 'upi',
      amount: request.amount,
      transferId,
      beneDetails: {
        name: 'Hackathon Seller',
        phone: '9999999999',
        email: 'johndoe_1@cashfree.com',
        address1: 'Becharam Chatterjee Road',
        vpa: 'success@upi',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Cashfree transfer failed');
    throw new Error('Cashfree transaction failed');
  }

  return {
    reservationId,
    amount: request.amount,
    cashfree: {
      reference_id: transferResponse.referenceId,
      status: transferResponse.status,
    },
  };
}
