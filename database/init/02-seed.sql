-- Noon Database Seed Data
-- This file creates initial admin and sample trainer users

-- =====================================================
-- SEED DATA: Default admin user
-- =====================================================

-- Create default admin user (password: admin123 - should be changed)
-- Password is hashed with bcrypt
INSERT INTO users (email, password, role, status, full_name, phone_number, preferred_language)
VALUES (
  'admin@noonomanarts.com',
  '$2b$10$wOKDS2UzfkxQVObM.WLtseI1xcKpp8pAiCpNjOzqvlw9VmODoai/O',
  'ADMIN',
  'ACTIVE',
  'Admin User',
  '+968 1234 5678',
  'ENGLISH'
)
ON CONFLICT (email) DO NOTHING;

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
)
ON CONFLICT (email) DO NOTHING;

-- Create trainer profile (only if user exists and profile doesn't)
INSERT INTO trainer_profiles (user_id, bio, expertise, experience, is_active)
SELECT 
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Professional chef with over 15 years of experience in Middle Eastern and international cuisine. Passionate about teaching and sharing culinary traditions.',
  ARRAY['Middle Eastern Cuisine', 'Baking', 'Traditional Omani Dishes'],
  15,
  true
WHERE EXISTS (SELECT 1 FROM users WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
AND NOT EXISTS (SELECT 1 FROM trainer_profiles WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479');

-- Record this migration
INSERT INTO schema_migrations (version) VALUES ('002_seed_data')
ON CONFLICT (version) DO NOTHING;
