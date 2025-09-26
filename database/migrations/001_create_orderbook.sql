-- Migration: create offers table for orderbook
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_pubkey VARCHAR(66) NOT NULL,
  chain VARCHAR(32) NOT NULL DEFAULT 'polygon',
  token VARCHAR(32) NOT NULL DEFAULT 'PYUSD',
  rate_pyusd_per_inr NUMERIC(30,18) NOT NULL,
  min_pyusd NUMERIC(30,8) NOT NULL,
  max_pyusd NUMERIC(30,8) NOT NULL,
  available_pyusd NUMERIC(30,8) NOT NULL,
  fee_pct NUMERIC(10,6) NOT NULL DEFAULT 0.0,
  est_latency_ms INTEGER NOT NULL DEFAULT 10000,
  supports_swap BOOLEAN NOT NULL DEFAULT TRUE,
  upi_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  nonce BIGINT NOT NULL,
  expiry_timestamp TIMESTAMP WITH TIME ZONE,
  signature TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_rate ON offers(rate_pyusd_per_inr);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_chain_token ON offers(chain, token);
