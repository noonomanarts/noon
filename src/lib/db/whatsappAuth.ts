import * as bcrypt from 'bcryptjs';
import { query } from './pool';

export type WhatsAppVerificationPurpose = 'LOGIN' | 'REGISTER';

export type VerificationValidationResult =
  | { ok: true; verificationId: string; phoneDigits: string; purpose: WhatsAppVerificationPurpose }
  | {
      ok: false;
      reason: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED' | 'ATTEMPTS_EXCEEDED' | 'MISMATCH' | 'INVALID_CODE';
    };

let whatsappAuthTableReady = false;

export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.length === 8) {
    digits = `968${digits}`;
  }
  return digits;
}

export function normalizePhoneForStorage(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return '';
  return `+${digits}`;
}

function generateSixDigitCode(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

async function ensureWhatsAppAuthTables(): Promise<void> {
  if (whatsappAuthTableReady) return;

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMP WITH TIME ZONE
  `);

  await query(`
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
    )
  `);

  await query(
    `CREATE INDEX IF NOT EXISTS idx_wa_verify_phone_purpose ON whatsapp_verification_codes(phone_digits, purpose, created_at DESC)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_wa_verify_active ON whatsapp_verification_codes(phone_digits, purpose, expires_at DESC)
     WHERE consumed_at IS NULL`
  );

  whatsappAuthTableReady = true;
}

export async function issueWhatsAppVerificationCode(input: {
  phoneNumber: string;
  purpose: WhatsAppVerificationPurpose;
  ttlMinutes?: number;
  maxAttempts?: number;
  requestedIp?: string;
}): Promise<{ verificationId: string; code: string; expiresAt: Date }> {
  await ensureWhatsAppAuthTables();

  const phoneDigits = normalizePhoneDigits(input.phoneNumber);
  if (phoneDigits.length < 8) {
    throw new Error('Invalid phone number.');
  }

  const phoneNumber = normalizePhoneForStorage(input.phoneNumber);
  const ttlMinutes = Math.min(15, Math.max(3, input.ttlMinutes ?? 10));
  const maxAttempts = Math.min(8, Math.max(3, input.maxAttempts ?? 5));

  const recentResult = await query<{
    id: string;
    created_at: string;
  }>(
    `SELECT id, created_at
     FROM whatsapp_verification_codes
     WHERE phone_digits = $1
       AND purpose = $2
       AND consumed_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phoneDigits, input.purpose]
  );

  if (recentResult.rows[0]) {
    const createdAt = new Date(recentResult.rows[0].created_at).getTime();
    const elapsed = Date.now() - createdAt;
    if (elapsed < 45_000) {
      throw new Error('Please wait before requesting another code.');
    }
  }

  await query(
    `UPDATE whatsapp_verification_codes
     SET consumed_at = NOW(), updated_at = NOW()
     WHERE phone_digits = $1
       AND purpose = $2
       AND consumed_at IS NULL`,
    [phoneDigits, input.purpose]
  );

  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, 10);

  const result = await query<{
    id: string;
    expires_at: string;
  }>(
    `INSERT INTO whatsapp_verification_codes (
      phone_number,
      phone_digits,
      purpose,
      code_hash,
      max_attempts,
      expires_at,
      requested_ip
    ) VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      NOW() + ($6::int * INTERVAL '1 minute'),
      $7
    )
    RETURNING id, expires_at`,
    [phoneNumber, phoneDigits, input.purpose, codeHash, maxAttempts, ttlMinutes, input.requestedIp ?? null]
  );

  return {
    verificationId: result.rows[0].id,
    code,
    expiresAt: new Date(result.rows[0].expires_at),
  };
}

export async function validateWhatsAppVerificationCode(input: {
  verificationId: string;
  code: string;
  purpose: WhatsAppVerificationPurpose;
  phoneNumber: string;
}): Promise<VerificationValidationResult> {
  await ensureWhatsAppAuthTables();

  const phoneDigits = normalizePhoneDigits(input.phoneNumber);
  if (phoneDigits.length < 8) {
    return { ok: false, reason: 'MISMATCH' };
  }

  const result = await query<{
    id: string;
    phone_digits: string;
    purpose: string;
    code_hash: string;
    attempts: number;
    max_attempts: number;
    expires_at: string;
    consumed_at: string | null;
  }>(
    `SELECT id, phone_digits, purpose, code_hash, attempts, max_attempts, expires_at, consumed_at
     FROM whatsapp_verification_codes
     WHERE id = $1
     LIMIT 1`,
    [input.verificationId]
  );

  const row = result.rows[0];
  if (!row) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  if (row.purpose !== input.purpose) {
    return { ok: false, reason: 'MISMATCH' };
  }

  if (row.phone_digits !== phoneDigits) {
    return { ok: false, reason: 'MISMATCH' };
  }

  if (row.consumed_at) {
    return { ok: false, reason: 'ALREADY_USED' };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await query(
      `UPDATE whatsapp_verification_codes
       SET consumed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [row.id]
    );
    return { ok: false, reason: 'EXPIRED' };
  }

  if (row.attempts >= row.max_attempts) {
    await query(
      `UPDATE whatsapp_verification_codes
       SET consumed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [row.id]
    );
    return { ok: false, reason: 'ATTEMPTS_EXCEEDED' };
  }

  const matches = await bcrypt.compare(input.code.trim(), row.code_hash);
  if (!matches) {
    const shouldConsume = row.attempts + 1 >= row.max_attempts;
    await query(
      `UPDATE whatsapp_verification_codes
       SET attempts = attempts + 1,
           consumed_at = CASE WHEN $2::boolean THEN NOW() ELSE consumed_at END,
           updated_at = NOW()
       WHERE id = $1`,
      [row.id, shouldConsume]
    );
    return { ok: false, reason: shouldConsume ? 'ATTEMPTS_EXCEEDED' : 'INVALID_CODE' };
  }

  await query(
    `UPDATE whatsapp_verification_codes
     SET consumed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [row.id]
  );

  return {
    ok: true,
    verificationId: row.id,
    phoneDigits,
    purpose: input.purpose,
  };
}
