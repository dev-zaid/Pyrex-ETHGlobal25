export interface Offer {
  id: string;
  seller_pubkey: string;
  chain: string;
  token: string;
  rate_pyusd_per_inr: string;
  min_pyusd: string;
  max_pyusd: string;
  available_pyusd: string;
  fee_pct: string;
  est_latency_ms: number;
  supports_swap: boolean;
  upi_enabled: boolean;
  status: string;
  nonce: string;
  expiry_timestamp: string | null;
}

export interface ReservationResponse {
  reservation_id: string;
  offer_id: string;
  amount_pyusd: string;
  status: string;
  remaining_available_pyusd: string;
}

export interface RouteRequest {
  target_pyusd?: string;
  target_inr?: string;
  constraints?: {
    max_latency_ms?: number;
    max_fee_pct?: number;
    allow_non_pyusd?: boolean;
  };
  payment_context: {
    chain: string;
    payer: string;
    tx_hash: string;
  };
}

export interface MatchedOffer {
  offer_id: string;
  seller_pubkey: string;
  token: string;
  chain: string;
  rate: number;
  fee_pct: number;
  reserved_pyusd: number;
  expected_inr: number;
  reservation_id: string;
  est_latency_ms: number;
}

export interface RouteResponse {
  audit_id: string;
  matched_offers: MatchedOffer[];
  totals: {
    total_pyusd: number;
    total_inr_estimated: number;
    weighted_latency_ms: number;
  };
  onchain_transfers: Array<{ to: string; amount_pyusd: number; tx_hash: string }>;
  seller_payouts: Array<{ seller_pubkey: string; reservation_id: string; payout_reference: string }>;
}
