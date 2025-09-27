-- Migration: seller agents metadata for automated services

CREATE TABLE IF NOT EXISTS seller_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  agent_uid VARCHAR(64) NOT NULL UNIQUE,
  endpoint_url TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'inactive',
  auth_token TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_agents_status ON seller_agents(status);
CREATE INDEX IF NOT EXISTS idx_seller_agents_seller ON seller_agents(seller_id);
