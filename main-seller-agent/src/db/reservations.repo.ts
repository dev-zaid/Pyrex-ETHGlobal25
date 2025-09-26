import { orderbookClient } from './client';
import { ReservationResponse } from '../core/types';

export async function reserveOffer(offerId: string, amountPyusd: number): Promise<ReservationResponse> {
  const { data } = await orderbookClient.post<ReservationResponse>(`/offers/${offerId}/reserve`, {
    amount_pyusd: amountPyusd.toFixed(8),
  });
  return data;
}

export async function commitReservation(reservationId: string): Promise<void> {
  await orderbookClient.post(`/reservations/${reservationId}/commit`);
}

export async function releaseReservation(reservationId: string): Promise<void> {
  await orderbookClient.post(`/reservations/${reservationId}/release`);
}
