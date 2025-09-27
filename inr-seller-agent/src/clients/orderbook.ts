import axios from 'axios';
import { getEnv } from '../config/env';

const ORDERBOOK_BASE_URL = getEnv('ORDERBOOK_SERVICE_URL', 'http://localhost:3000');

const client = axios.create({
  baseURL: ORDERBOOK_BASE_URL,
  timeout: 10000,
});

export interface ReservationDto {
  id: string;
  offer_id: string;
  amount_pyusd: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function fetchReservation(reservationId: string): Promise<ReservationDto | null> {
  try {
    const { data } = await client.get<ReservationDto>(`/reservations/${reservationId}`);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function releaseReservation(reservationId: string): Promise<void> {
  await client.post(`/reservations/${reservationId}/release`);
}
