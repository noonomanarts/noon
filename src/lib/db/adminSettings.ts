import { pool } from './pool';

let adminSettingsTableReady = false;

export type GeneralAdminSettings = {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  defaultLocale: 'en' | 'ar';
  timezone: string;
  currency: string;
  maintenanceMode: boolean;
  whatsappEnabled: boolean;
  bookingAutoConfirm: boolean;
  customerReminderHours: number;
  trainerReminderHours: number;
};

export type WhatsAppAdminSettings = {
  sendApiUrl: string;
  activeSession: string;
  apiCode: string;
};

export type TrainerParticipantShareTier = {
  minParticipants: number;
  maxParticipants: number | null;
  percent: number;
};

export type ClassFinanceCategorySettings = {
  kitchenUsageRatePerHour: number;
  workshopContentRatePerParticipant: number;
};

export type ClassFinanceAdminSettings = {
  cooking: ClassFinanceCategorySettings;
  artsCrafts: ClassFinanceCategorySettings;
  defaultTrainerShareTiers: TrainerParticipantShareTier[];
};

export const defaultGeneralAdminSettings: GeneralAdminSettings = {
  siteName: 'Noon',
  supportEmail: 'support@noonomanarts.com',
  supportPhone: '+96800000000',
  defaultLocale: 'en',
  timezone: 'Asia/Muscat',
  currency: 'OMR',
  maintenanceMode: false,
  whatsappEnabled: true,
  bookingAutoConfirm: false,
  customerReminderHours: 6,
  trainerReminderHours: 24,
};

export const defaultWhatsAppAdminSettings: WhatsAppAdminSettings = {
  sendApiUrl: 'https://whatsapp.noonomanarts.com/',
  activeSession: 'default',
  apiCode: '',
};

export const defaultClassFinanceAdminSettings: ClassFinanceAdminSettings = {
  cooking: {
    kitchenUsageRatePerHour: 2.8,
    workshopContentRatePerParticipant: 0.2,
  },
  artsCrafts: {
    kitchenUsageRatePerHour: 0,
    workshopContentRatePerParticipant: 0.2,
  },
  defaultTrainerShareTiers: [
    {
      minParticipants: 0,
      maxParticipants: 11,
      percent: 25,
    },
    {
      minParticipants: 12,
      maxParticipants: null,
      percent: 30,
    },
  ],
};

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
