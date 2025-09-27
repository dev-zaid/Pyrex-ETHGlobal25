import { findReservationById } from '../db/reservations';
import { logger } from '../utils/logger';

export interface FulfillmentRequest {
  orderId: string;
  amount: number;
}

export interface ReservationCheck {
  reservationId: string;
  amountAvailable: number;
}

export async function validateReservation({ orderId, amount }: FulfillmentRequest): Promise<ReservationCheck> {
  const record = await findReservationById(orderId);
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
