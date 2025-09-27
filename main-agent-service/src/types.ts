/**
 * Types for the main agent service
 */

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

export interface Totals {
  total_pyusd: number;
  total_inr_estimated: number;
  weighted_latency_ms: number;
}

export interface OnchainTransfer {
  from: string;
  to: string;
  token: string;
  amount: number;
  chain: string;
  tx_hash?: string;
}

export interface SellerPayout {
  seller_pubkey: string;
  amount: number;
  token: string;
  method: string;
  reference_id?: string;
}

export interface MainAgentResponse {
  audit_id: string;
  matched_offers: MatchedOffer[];
  totals: Totals;
  onchain_transfers: OnchainTransfer[];
  seller_payouts: SellerPayout[];
}

export interface OrderRequest {
  target_pyusd: string;
  constraints: {
    max_latency_ms: number;
    max_fee_pct: number;
  };
  payment_context: {
    chain: string;
    payer: string;
    tx_hash: string;
  };
}

export interface TriggerRequest {
  target_pyusd: string;
  vendor_upi: string;
}

export interface OrderTrigger {
  id: string;
  target_pyusd: string;
  vendor_upi: string;
  payer: string;
  tx_hash: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  response?: MainAgentResponse;
  error?: string;
}

export interface ServiceConfig {
  mainAgentUrl: string;
  port: number;
  logLevel: string;
  maxRetries: number;
  retryDelay: number;
}
