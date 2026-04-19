-- Migration 038: Unified notification outbox + web push subscriptions
--
-- This migration adds two tables:
--   1. notification_outbox: durable queue for outgoing notifications across
--      all channels (EMAIL, WHATSAPP, PUSH, IN_APP). Worker picks up PENDING
--      rows with FOR UPDATE SKIP LOCKED, attempts delivery, and applies
--      exponential backoff on failure up to max_attempts, then marks DEAD.
--
--   2. push_subscriptions: Web Push subscription endpoints (VAPID) per user.

-- Outbox --------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel VARCHAR(20) NOT NULL,                 -- EMAIL | WHATSAPP | PUSH | IN_APP
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_key VARCHAR(80),                     -- key inside transactional template settings
  title TEXT,                                   -- resolved subject / title (for audit)
  body TEXT,                                    -- resolved text (for audit)
  vars JSONB,                                   -- original template variables
  data JSONB,                                   -- additional metadata (push click URL, etc.)
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',-- PENDING | SENT | FAILED | DEAD | SKIPPED
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_error TEXT,
  provider_message_id TEXT,
  dedupe_key VARCHAR(200),                      -- optional idempotency key
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT notification_outbox_channel_check
    CHECK (channel IN ('EMAIL','WHATSAPP','PUSH','IN_APP')),
  CONSTRAINT notification_outbox_status_check
    CHECK (status IN ('PENDING','SENT','FAILED','DEAD','SKIPPED'))
);

-- The worker picks rows in this order; this index is the critical one.
CREATE INDEX IF NOT EXISTS idx_notification_outbox_due
  ON notification_outbox(status, next_attempt_at)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_notification_outbox_user
  ON notification_outbox(user_id, created_at DESC);

-- Idempotency: if a dedupe_key is provided, no two rows with the same key
-- can be PENDING or SENT. DEAD/FAILED/SKIPPED may be retried with the same key.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_outbox_dedupe_active
  ON notification_outbox(dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('PENDING','SENT');

-- Push subscriptions --------------------------------------------------

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);

-- Updated-at trigger --------------------------------------------------

CREATE OR REPLACE FUNCTION set_notification_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_outbox_updated_at ON notification_outbox;
CREATE TRIGGER trg_notification_outbox_updated_at
BEFORE UPDATE ON notification_outbox
FOR EACH ROW
EXECUTE FUNCTION set_notification_outbox_updated_at();
