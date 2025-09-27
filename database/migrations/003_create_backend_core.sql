-- Migration: core tables for pyrex-backend-service

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_pubkey VARCHAR(66) NOT NULL UNIQUE,
  display_name VARCHAR(128) NOT NULL,
  upi_vpa VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  kyc_status VARCHAR(32) NOT NULL DEFAULT 'unverified',
  risk_tier VARCHAR(32) NOT NULL DEFAULT 'standard',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_kyc_status ON sellers(kyc_status);
CREATE INDEX IF NOT EXISTS idx_sellers_pubkey ON sellers(seller_pubkey);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(256) NOT NULL,
  email VARCHAR(320) UNIQUE,
  phone VARCHAR(32) UNIQUE,
  country_code CHAR(2) NOT NULL DEFAULT 'IN',
  status VARCHAR(32) NOT NULL DEFAULT 'invited',
  kyc_status VARCHAR(32) NOT NULL DEFAULT 'unverified',
  risk_tier VARCHAR(32) NOT NULL DEFAULT 'standard',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID UNIQUE REFERENCES reservations(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source_currency CHAR(3) NOT NULL,
  destination_currency CHAR(3) NOT NULL,
  amount_source NUMERIC(30,2) NOT NULL,
  amount_destination NUMERIC(30,2),
  bridge_token_symbol VARCHAR(16) NOT NULL DEFAULT 'PYUSD',
  bridge_token_amount NUMERIC(30,8),
  fx_rate NUMERIC(30,18),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  settlement_reference VARCHAR(128),
  tx_hash VARCHAR(128),
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_initiated_at ON transactions(initiated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_source_dest ON transactions(source_currency, destination_currency);
