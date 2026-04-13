-- Noon Database Schema
-- PostgreSQL 16

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'TRAINER', 'CUSTOMER', 'EMPLOYEE', 'SOCIAL_MEDIA_ADMIN', 'PHOTOGRAPHER', 'WORKER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE preferred_language AS ENUM ('ENGLISH', 'ARABIC');
CREATE TYPE class_category AS ENUM ('COOKING', 'ARTS_CRAFTS');
CREATE TYPE class_sub_category AS ENUM (
  'APPETIZERS_SNACKS',
  'MAIN_DISHES',
  'DESSERTS_BAKING',
  'MOM_AND_KID',
  'PAINTING',
  'POTTERY',
  'CRAFTS',
  'MIXED'
);
CREATE TYPE class_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE event_type AS ENUM ('COOKING_COMPETITION', 'PRIVATE_CLASS', 'BIRTHDAY_PARTY');
CREATE TYPE event_status AS ENUM (
  'NEW',
  'IN_PROGRESS',
  'PENDING_CLIENT_CONFIRMATION',
  'CLIENT_CONFIRMED',
  'PENDING_PAYMENT',
  'COMPLETED',
  'CANCELLED'
);
CREATE TYPE package_type AS ENUM ('STANDARD', 'PREMIUM');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
CREATE TYPE payment_method AS ENUM ('ONLINE', 'BANK_TRANSFER', 'CASH', 'WALLET');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');
CREATE TYPE contact_message_status AS ENUM ('NEW', 'READ');
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

-- =====================================================
-- TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Trainer profiles (additional info for trainers)
CREATE TABLE trainer_profiles (
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
CREATE TABLE classes (
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
CREATE TABLE trainer_workshop_suggestions (
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
CREATE TABLE class_sessions (
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
CREATE TABLE bookings (
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
CREATE TABLE event_bookings (
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
  status event_status NOT NULL DEFAULT 'NEW',
  client_confirmed BOOLEAN NOT NULL DEFAULT false,
  client_confirmed_at TIMESTAMP WITH TIME ZONE,
  digital_signature TEXT,
  agreement_accepted BOOLEAN NOT NULL DEFAULT false,
  total_amount DECIMAL(10, 3),
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  payment_method payment_method,
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_proof VARCHAR(500),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Calendar events (timetable: classes, blocked times, cleaning blocks)
CREATE TABLE calendar_events (
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
CREATE TABLE reviews (
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
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 3) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'OMR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Wallet transactions
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(10, 3) NOT NULL,
  type VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Loyalty cards
CREATE TABLE loyalty_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  stamps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Contact messages
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status contact_message_status NOT NULL DEFAULT 'NEW',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Trainer profiles
CREATE INDEX idx_trainer_profiles_user_id ON trainer_profiles(user_id);
CREATE INDEX idx_trainer_profiles_is_active ON trainer_profiles(is_active);
CREATE INDEX idx_trainer_workshop_suggestions_trainer_id ON trainer_workshop_suggestions(trainer_id);
CREATE INDEX idx_trainer_workshop_suggestions_status ON trainer_workshop_suggestions(status);

-- Classes
CREATE INDEX idx_classes_slug ON classes(slug);
CREATE INDEX idx_classes_category ON classes(category);
CREATE INDEX idx_classes_sub_category ON classes(sub_category);
CREATE INDEX idx_classes_trainer_id ON classes(trainer_id);
CREATE INDEX idx_classes_status ON classes(status);

-- Class sessions
CREATE INDEX idx_class_sessions_class_id ON class_sessions(class_id);
CREATE INDEX idx_class_sessions_start_date_time ON class_sessions(start_date_time);
CREATE INDEX idx_class_sessions_is_cancelled ON class_sessions(is_cancelled);

-- Bookings
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_class_id ON bookings(class_id);
CREATE INDEX idx_bookings_session_id ON bookings(session_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);

-- Event bookings
CREATE INDEX idx_event_bookings_booking_number ON event_bookings(booking_number);
CREATE INDEX idx_event_bookings_user_id ON event_bookings(user_id);
CREATE INDEX idx_event_bookings_event_type ON event_bookings(event_type);
CREATE INDEX idx_event_bookings_status ON event_bookings(status);
CREATE INDEX idx_event_bookings_selected_date ON event_bookings(selected_date);

-- Calendar events
CREATE INDEX idx_calendar_events_type ON calendar_events(type);
CREATE INDEX idx_calendar_events_start_date_time ON calendar_events(start_date_time);
CREATE INDEX idx_calendar_events_class_session_id ON calendar_events(class_session_id);
CREATE INDEX idx_calendar_events_event_booking_id ON calendar_events(event_booking_id);

-- Reviews
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_class_id ON reviews(class_id);
CREATE INDEX idx_reviews_is_visible ON reviews(is_visible);

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

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_profiles_updated_at
  BEFORE UPDATE ON trainer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON class_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_bookings_updated_at
  BEFORE UPDATE ON event_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_cards_updated_at
  BEFORE UPDATE ON loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: Default admin user
-- =====================================================

-- Create default admin user (password: admin123 - should be changed)
-- Password is hashed with bcrypt
INSERT INTO users (email, password, role, status, full_name, phone_number, preferred_language)
VALUES (
  'admin@noonomanarts.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4ELQdYBGJHPqOqBm',
  'ADMIN',
  'ACTIVE',
  'Admin User',
  '+968 1234 5678',
  'ENGLISH'
);

-- Create a sample trainer user
INSERT INTO users (id, email, password, role, status, full_name, phone_number, preferred_language, profile_image)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'chef@noonomanarts.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4ELQdYBGJHPqOqBm',
  'TRAINER',
  'ACTIVE',
  'Chef Ahmad',
  '+968 9876 5432',
  'ARABIC',
  '/uploads/profiles/chef-ahmad.jpg'
);

-- Create trainer profile
INSERT INTO trainer_profiles (user_id, bio, expertise, experience, is_active)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Professional chef with over 15 years of experience in Middle Eastern and international cuisine. Passionate about teaching and sharing culinary traditions.',
  ARRAY['Middle Eastern Cuisine', 'Baking', 'Traditional Omani Dishes'],
  15,
  true
);
