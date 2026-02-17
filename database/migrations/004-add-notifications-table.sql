-- Migration: Add app notifications table
-- Version: 004
-- Description: Stores in-app notifications for users/admins with read state

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_role user_role,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT app_notifications_target_check CHECK (
    recipient_user_id IS NOT NULL OR recipient_role IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
  ON app_notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_notifications_role_created
  ON app_notifications(recipient_role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_notifications_read
  ON app_notifications(is_read, created_at DESC);