-- Add WhatsApp verification metadata to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMP WITH TIME ZONE;

-- OTP verification codes for WhatsApp login/register
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

CREATE INDEX IF NOT EXISTS idx_wa_verify_phone_purpose ON whatsapp_verification_codes(phone_digits, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_verify_active ON whatsapp_verification_codes(phone_digits, purpose, expires_at DESC)
WHERE consumed_at IS NULL;
