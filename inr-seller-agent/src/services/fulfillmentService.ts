import { findReservationById } from '../db/reservations';
import { logger } from '../utils/logger';
import { createUpiPayment } from '../clients/razorpay';

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
  razorpay: {
    payment_id: string;
    status: string;
  };
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

export async function fulfillOrder(request: FulfillmentRequest): Promise<FulfillmentResult> {
  const { reservationId } = await validateReservation(request);

  const amountInPaise = Math.round(request.amount * 100);
  let razorpayResponse;
  try {
    razorpayResponse = await createUpiPayment({
      amount: amountInPaise,
      currency: 'INR',
      upi: { vpa: 'success@upi' },
      reference_id: reservationId,
    });
  } catch (error) {
    logger.error({ error }, 'Razorpay payment failed');
    throw new Error('Razorpay transaction failed');
  }

  return {
    reservationId,
    amount: request.amount,
    razorpay: {
      payment_id: razorpayResponse.id,
      status: razorpayResponse.status,
    },
  };
}
