import { orderbookClient } from './client';
import { Offer } from '../core/types';

interface OffersResponse {
  offers: Offer[];
  count: number;
}

export async function fetchOffers(constraints?: {
  max_latency_ms?: number;
  max_fee_pct?: number;
  allow_non_pyusd?: boolean;
}): Promise<Offer[]> {
  const params: Record<string, string | number> = {
    chain: 'polygon',
    token: 'PYUSD',
    limit: 100,
  };

  if (constraints?.max_latency_ms !== undefined) {
    params.max_latency_ms = constraints.max_latency_ms;
  }
  if (constraints?.max_fee_pct !== undefined) {
    params.max_fee_pct = constraints.max_fee_pct;
  }
  if (constraints?.allow_non_pyusd) {
    delete params.token;
  }

  const response = await orderbookClient.get<OffersResponse>('/offers', { params });
  return response.data.offers;
}
