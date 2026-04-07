import 'server-only';

import { pool } from './pool';
import { defaultFooterAdminSettings } from '@/lib/adminSettings';

export {
  defaultClassFinanceAdminSettings,
  defaultFooterAdminSettings,
  defaultGeneralAdminSettings,
  defaultLoyaltyAdminSettings,
  defaultWhatsAppAdminSettings,
  defaultWhatsAppFloatingButtonSettings,
  defaultWhatsAppTransactionTemplatesSettings,
  sanitizeFooterAdminSettings,
  sanitizeWhatsAppTransactionTemplatesSettings,
  type ClassFinanceAdminSettings,
  type ClassFinanceCategorySettings,
  type FooterAdminLink,
  type FooterAdminSettings,
  type FooterAdminSocialIcon,
  type FooterAdminSocialLink,
  type GeneralAdminSettings,
  type LoyaltyAdminSettings,
  type TrainerParticipantShareTier,
  type WhatsAppAdminSettings,
  type WhatsAppFloatingButtonIcon,
  type WhatsAppFloatingButtonSettings,
  type WhatsAppTransactionTemplateItem,
  type WhatsAppTransactionTemplateKey,
  type WhatsAppTransactionTemplatesSettings,
} from '@/lib/adminSettings';

let adminSettingsTableReady = false;

async function ensureAdminSettingsTable(): Promise<void> {
  if (adminSettingsTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key VARCHAR(80) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_at ON admin_settings(updated_at DESC)`);

  adminSettingsTableReady = true;
}

export async function getAdminSettingsByKey<T>(key: string): Promise<T | null> {
  await ensureAdminSettingsTable();

  const result = await pool.query(
    `SELECT value
     FROM admin_settings
     WHERE key = $1
     LIMIT 1`,
    [key]
  );

  if (!result.rows[0]) return null;
  return result.rows[0].value as T;
}

export async function getAdminSettingsByPrefix<T>(prefix: string): Promise<Record<string, T>> {
  await ensureAdminSettingsTable();

  const result = await pool.query(
    `SELECT key, value
     FROM admin_settings
     WHERE key LIKE $1`,
    [`${prefix}%`]
  );

  const mapped: Record<string, T> = {};
  for (const row of result.rows) {
    mapped[row.key as string] = row.value as T;
  }

  return mapped;
}

export async function upsertAdminSettings<T>(input: {
  key: string;
  value: T;
  updatedByUserId?: string;
}): Promise<void> {
  await ensureAdminSettingsTable();

  await pool.query(
    `INSERT INTO admin_settings (key, value, updated_by_user_id, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (key)
     DO UPDATE SET
       value = EXCLUDED.value,
       updated_by_user_id = EXCLUDED.updated_by_user_id,
       updated_at = NOW()`,
    [input.key, JSON.stringify(input.value), input.updatedByUserId ?? null]
  );
}
