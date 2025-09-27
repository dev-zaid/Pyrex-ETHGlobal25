import { pool } from './client';

export interface ReservationRecord {
  id: string;
  offer_id: string;
  amount_pyusd: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const ELIGIBLE_STATUSES = ['active', 'pending'];

export async function findReservationById(orderId: string): Promise<ReservationRecord | null> {
  const placeholders = ELIGIBLE_STATUSES.map((_, idx) => `$${idx + 2}`).join(',');
  const query = `
    SELECT id, offer_id, amount_pyusd, status, created_at, updated_at
    FROM reservations
    WHERE id = $1 AND status IN (${placeholders})
    LIMIT 1
  `;
  const params = [orderId, ...ELIGIBLE_STATUSES];
  const result = await pool.query<ReservationRecord>(query, params);
  return result.rows[0] ?? null;
}
