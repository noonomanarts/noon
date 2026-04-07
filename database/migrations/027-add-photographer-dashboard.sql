-- Migration 027: Add Photographer Dashboard
-- Adds PHOTOGRAPHER role and photographer_tasks table

-- 1. Add PHOTOGRAPHER to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PHOTOGRAPHER';

-- 2. Create photographer_tasks table
CREATE TABLE IF NOT EXISTS photographer_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photographer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  title_ar VARCHAR(500),
  description TEXT,
  description_ar TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  notes_ar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photographer_tasks_photographer ON photographer_tasks(photographer_user_id);
CREATE INDEX IF NOT EXISTS idx_photographer_tasks_status ON photographer_tasks(status);
CREATE INDEX IF NOT EXISTS idx_photographer_tasks_due_date ON photographer_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_photographer_tasks_priority ON photographer_tasks(priority);
