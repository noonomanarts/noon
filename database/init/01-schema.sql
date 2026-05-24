-- Noon Database Schema
-- PostgreSQL 16
-- This file runs automatically on first database creation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'TRAINER', 'CUSTOMER', 'EMPLOYEE', 'SOCIAL_MEDIA_ADMIN', 'PHOTOGRAPHER', 'WORKER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE preferred_language AS ENUM ('ENGLISH', 'ARABIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE class_category AS ENUM ('COOKING', 'ARTS_CRAFTS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE class_sub_category AS ENUM (
      'APPETIZERS_SNACKS',
      'MAIN_DISHES',
      'DESSERTS_BAKING',
      'MOM_AND_KID',
      'SUMMER_CAMP',
      'PAINTING',
      'POTTERY',
      'CRAFTS',
      'MIXED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE class_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('COOKING_COMPETITION', 'PRIVATE_CLASS', 'BIRTHDAY_PARTY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM (
      'NEW',
      'IN_PROGRESS',
      'PENDING_CLIENT_CONFIRMATION',
      'CLIENT_CONFIRMED',
      'PENDING_PAYMENT',
      'COMPLETED',
      'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE package_type AS ENUM ('STANDARD', 'PREMIUM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('ONLINE', 'BANK_TRANSFER', 'CASH', 'WALLET');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contact_message_status AS ENUM ('NEW', 'READ');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE calendar_event_type AS ENUM (
      'CLASS',
      'PRIVATE_SESSION',
      'COMPETITION',
      'BIRTHDAY_PARTY',
      'BLOCKED',
      'CLEANING',
      'APPOINTMENT',
      'SCHEDULER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  status user_status NOT NULL DEFAULT 'ACTIVE',
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  date_of_birth DATE,
  gender gender,
  preferred_language preferred_language NOT NULL DEFAULT 'ENGLISH',
  profile_image VARCHAR(500),
  whatsapp_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- WhatsApp OTP verification codes (login/register)
CREATE TABLE IF NOT EXISTS whatsapp_verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(50) NOT NULL,
  phone_digits VARCHAR(30) NOT NULL,
  purpose VARCHAR(20) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  requested_ip VARCHAR(120),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_verification_codes_purpose_check CHECK (purpose IN ('LOGIN', 'REGISTER'))
);

-- Trainer profiles (additional info for trainers)
CREATE TABLE IF NOT EXISTS trainer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  expertise TEXT[] DEFAULT '{}',
  experience INTEGER,
  social_links JSONB,
  featured_media_type VARCHAR(20) NOT NULL DEFAULT 'IMAGE',
  featured_media_url VARCHAR(500),
  manual_upcoming_courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Classes (class templates)
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_ar VARCHAR(255),
  description TEXT NOT NULL,
  description_ar TEXT,
  category class_category NOT NULL,
  sub_category class_sub_category NOT NULL,
  image VARCHAR(500),
  images TEXT[] DEFAULT '{}',
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  price DECIMAL(10, 3) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  seats_total INTEGER NOT NULL DEFAULT 12,
  seats_available INTEGER NOT NULL DEFAULT 12,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  status class_status NOT NULL DEFAULT 'DRAFT',
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Trainer suggested workshops
CREATE TABLE IF NOT EXISTS trainer_workshop_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  title_ar VARCHAR(255),
  brief TEXT,
  recipe TEXT,
  recipe_pdf VARCHAR(500),
  notes TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  admin_notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW'
    CHECK (status IN ('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED')),
  live_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Class sessions (specific dates for a class)
CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  start_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  seats_total INTEGER,
  seats_booked INTEGER NOT NULL DEFAULT 0,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT,
  recipe_submitted BOOLEAN NOT NULL DEFAULT false,
  recipe_pdf VARCHAR(500),
  grocery_list TEXT,
  workshop_brief TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Bookings (class bookings by customers)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE RESTRICT,
  participants JSONB NOT NULL DEFAULT '[]',
  number_of_participants INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 3) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  status booking_status NOT NULL DEFAULT 'PENDING',
  payment_method payment_method,
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMP WITH TIME ZONE,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Event bookings (competitions, private classes, birthday parties)
CREATE TABLE IF NOT EXISTS event_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type event_type NOT NULL,
  selected_date DATE NOT NULL,
  selected_time VARCHAR(20) NOT NULL,
  package_type package_type,
  number_of_participants INTEGER NOT NULL,
  number_of_groups INTEGER,
  gifts JSONB,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  company_or_group_name VARCHAR(255),
  preferred_dish VARCHAR(255),
  special_requests TEXT,
  discount_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  status event_status NOT NULL DEFAULT 'NEW',
  client_confirmed BOOLEAN NOT NULL DEFAULT false,
  client_confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmation_token VARCHAR(120) UNIQUE,
  confirmation_token_expires_at TIMESTAMP WITH TIME ZONE,
  digital_signature TEXT,
  agreement_accepted BOOLEAN NOT NULL DEFAULT false,
  total_amount DECIMAL(10, 3),
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  payment_gateway VARCHAR(50),
  payment_reference VARCHAR(120),
  payment_gateway_order_id BIGINT,
  payment_method payment_method,
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_proof VARCHAR(500),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_expense_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_booking_id UUID NOT NULL REFERENCES event_bookings(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 3) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_expense_items_event_booking_id ON event_expense_items(event_booking_id);

CREATE TABLE IF NOT EXISTS event_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_booking_id UUID NOT NULL UNIQUE REFERENCES event_bookings(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CLOSED')),
  gross_revenue DECIMAL(10, 3) NOT NULL DEFAULT 0,
  materials_cost_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  total_costs_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  net_profit_amount DECIMAL(10, 3) NOT NULL DEFAULT 0,
  notes TEXT,
  settled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_settlements_event_booking_id ON event_settlements(event_booking_id);

-- Calendar events (timetable: classes, blocked times, cleaning blocks)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type calendar_event_type NOT NULL,
  start_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
  event_booking_id UUID REFERENCES event_bookings(id) ON DELETE CASCADE,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  internal_notes TEXT,
  visible_to_trainers BOOLEAN NOT NULL DEFAULT false,
  visible_trainer_ids UUID[] DEFAULT '{}',
  appointment_contact_name TEXT,
  appointment_contact_phone VARCHAR(50),
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_minutes_before INTEGER,
  notify_at_start BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  start_notification_sent_at TIMESTAMP WITH TIME ZONE,
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Wallets (credit balance for customers)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 3) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(10, 3) NOT NULL,
  type VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Loyalty cards
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  stamps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status contact_message_status NOT NULL DEFAULT 'NEW',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES (create if not exists)
-- =====================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Trainer profiles
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_user_id ON trainer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_is_active ON trainer_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_trainer_workshop_suggestions_trainer_id ON trainer_workshop_suggestions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_workshop_suggestions_status ON trainer_workshop_suggestions(status);

-- Classes
CREATE INDEX IF NOT EXISTS idx_classes_slug ON classes(slug);
CREATE INDEX IF NOT EXISTS idx_classes_category ON classes(category);
CREATE INDEX IF NOT EXISTS idx_classes_sub_category ON classes(sub_category);
CREATE INDEX IF NOT EXISTS idx_classes_trainer_id ON classes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);

-- Class sessions
CREATE INDEX IF NOT EXISTS idx_class_sessions_class_id ON class_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_start_date_time ON class_sessions(start_date_time);
CREATE INDEX IF NOT EXISTS idx_class_sessions_is_cancelled ON class_sessions(is_cancelled);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_class_id ON bookings(class_id);
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Event bookings
CREATE INDEX IF NOT EXISTS idx_event_bookings_booking_number ON event_bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_event_bookings_user_id ON event_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_event_type ON event_bookings(event_type);
CREATE INDEX IF NOT EXISTS idx_event_bookings_status ON event_bookings(status);
CREATE INDEX IF NOT EXISTS idx_event_bookings_selected_date ON event_bookings(selected_date);

-- Calendar events
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date_time ON calendar_events(start_date_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_class_session_id ON calendar_events(class_session_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_booking_id ON calendar_events(event_booking_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_class_id ON reviews(class_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_visible ON reviews(is_visible);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trainer_profiles_updated_at ON trainer_profiles;
CREATE TRIGGER update_trainer_profiles_updated_at
  BEFORE UPDATE ON trainer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_class_sessions_updated_at ON class_sessions;
CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON class_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_bookings_updated_at ON event_bookings;
CREATE TRIGGER update_event_bookings_updated_at
  BEFORE UPDATE ON event_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_loyalty_cards_updated_at ON loyalty_cards;
CREATE TRIGGER update_loyalty_cards_updated_at
  BEFORE UPDATE ON loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== Inventory Tables =====

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(180) NOT NULL,
  sku VARCHAR(100),
  unit VARCHAR(40) NOT NULL DEFAULT 'unit',
  reorder_level DECIMAL(12, 3) NOT NULL DEFAULT 0,
  current_stock DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  average_unit_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (average_unit_cost >= 0),
  total_purchase_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_purchase_cost >= 0),
  total_consumed_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_consumed_cost >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  allows_manual_cost BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_sku_unique ON inventory_items((LOWER(sku))) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);

CREATE TABLE IF NOT EXISTS inventory_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_name VARCHAR(255),
  invoice_number VARCHAR(120),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  total_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_purchases_occurred_at ON inventory_purchases(occurred_at DESC);

CREATE TABLE IF NOT EXISTS inventory_purchase_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES inventory_purchases(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12, 3) NOT NULL CHECK (unit_cost >= 0),
  total_cost DECIMAL(12, 3) NOT NULL CHECK (total_cost >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_purchase_lines_purchase_id ON inventory_purchase_lines(purchase_id);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_lines_item_id ON inventory_purchase_lines(inventory_item_id);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('PURCHASE', 'WORKSHOP_USAGE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12, 3) NOT NULL CHECK (unit_cost >= 0),
  total_cost DECIMAL(12, 3) NOT NULL CHECK (total_cost >= 0),
  reference_type VARCHAR(50),
  reference_id UUID,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  event_booking_id UUID REFERENCES event_bookings(id) ON DELETE SET NULL,
  notes TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_class_id ON inventory_movements(class_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_event_booking_id ON inventory_movements(event_booking_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_occurred_at ON inventory_movements(occurred_at DESC);

CREATE TABLE IF NOT EXISTS class_inventory_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  manual_cost_amount DECIMAL(12, 3),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'POSTED')),
  posted_movement_id UUID REFERENCES inventory_movements(id) ON DELETE SET NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_class_id ON class_inventory_usages(class_id);
CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_item_id ON class_inventory_usages(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_class_inventory_usages_status ON class_inventory_usages(status);

CREATE TABLE IF NOT EXISTS event_inventory_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_booking_id UUID NOT NULL REFERENCES event_bookings(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost DECIMAL(12, 3) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  manual_cost_amount DECIMAL(12, 3),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'POSTED')),
  posted_movement_id UUID REFERENCES inventory_movements(id) ON DELETE SET NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_event_booking_id ON event_inventory_usages(event_booking_id);
CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_item_id ON event_inventory_usages(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_event_inventory_usages_status ON event_inventory_usages(status);

-- Record this migration
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;
