/**
 * Birthday greeting dispatcher.
 *
 * Runs daily (driven by the cron tick). For each user whose date of birth
 * matches today (month + day) in the site timezone, we:
 *   1. Create or reuse a unique single-use promo code `BDAY-{userId}-{year}`.
 *   2. Enqueue a WhatsApp + email birthday message with the code.
 *
 * Idempotency: the outbox dedupe_key includes userId + year, so even if the
 * cron runs multiple times per day the same user receives at most one
 * greeting per year per channel.
 */

import { query } from '@/lib/db/pool';
import { enqueueNotification } from './outbox';
import { getUserById } from '@/lib/db/users';
import { resolveUserLocale, renderTemplate } from './locale';
import {
  defaultEmailTransactionTemplatesSettings,
  defaultWhatsAppTransactionTemplatesSettings,
  sanitizeEmailTransactionTemplatesSettings,
  sanitizeWhatsAppTransactionTemplatesSettings,
  type EmailTransactionTemplatesSettings,
  type WhatsAppTransactionTemplatesSettings,
} from '@/lib/adminSettings';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import { getEmailLayout } from '@/lib/email/emailLayout';

const TZ = process.env.NOON_TIMEZONE || 'Asia/Muscat';
const DEFAULT_DISCOUNT_PERCENT = 10;

type BirthdayUserRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  preferred_language: string | null;
};

async function listTodaysBirthdayUsers(limit = 200): Promise<BirthdayUserRow[]> {
  const result = await query<BirthdayUserRow>(
    `SELECT id, full_name, email, phone_number, preferred_language
       FROM users
      WHERE date_of_birth IS NOT NULL
        AND status = 'ACTIVE'
        AND to_char(date_of_birth::date, 'MM-DD') =
            to_char((NOW() AT TIME ZONE $1)::date, 'MM-DD')
      ORDER BY full_name ASC
      LIMIT $2`,
    [TZ, limit]
  );
  return result.rows;
}

async function ensureBirthdayPromoCode(userId: string, year: number, discountPercent: number): Promise<{
  code: string;
  validUntil: string;
}> {
  const shortId = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const code = `BDAY-${shortId}-${year}`;
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  const validUntil = expires.toISOString().slice(0, 10);

  await query(
    `CREATE TABLE IF NOT EXISTS promo_codes (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       code VARCHAR(50) NOT NULL,
       discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
       discount_value NUMERIC(10, 3) NOT NULL DEFAULT 0,
       max_uses INTEGER DEFAULT NULL,
       times_used INTEGER NOT NULL DEFAULT 0,
       min_order_amount NUMERIC(10, 3) NOT NULL DEFAULT 0,
       starts_at TIMESTAMPTZ DEFAULT NULL,
       expires_at TIMESTAMPTZ DEFAULT NULL,
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`
  );
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_unique ON promo_codes (UPPER(code))`);

  await query(
    `INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, expires_at)
       VALUES ($1, 'PERCENTAGE', $2, 1, $3)
     ON CONFLICT ((UPPER(code))) DO NOTHING`,
    [code, discountPercent, expires.toISOString()]
  );

  return { code, validUntil };
}

export type BirthdayRunResult = {
  scanned: number;
  emailsQueued: number;
  whatsappQueued: number;
};

export async function dispatchBirthdayGreetings(limit = 200): Promise<BirthdayRunResult> {
  const users = await listTodaysBirthdayUsers(limit);
  const year = new Date().getUTCFullYear();

  let emailsQueued = 0;
  let whatsappQueued = 0;

  const emailSettings = sanitizeEmailTransactionTemplatesSettings(
    (await getAdminSettingsByKey<EmailTransactionTemplatesSettings>('email-transaction-templates')) ??
      defaultEmailTransactionTemplatesSettings
  );
  const waSettings = sanitizeWhatsAppTransactionTemplatesSettings(
    (await getAdminSettingsByKey<WhatsAppTransactionTemplatesSettings>('whatsapp-transaction-templates')) ??
      defaultWhatsAppTransactionTemplatesSettings
  );

  for (const row of users) {
    const user = await getUserById(row.id);
    if (!user) continue;

    const { code, validUntil } = await ensureBirthdayPromoCode(row.id, year, DEFAULT_DISCOUNT_PERCENT);
    const locale = await resolveUserLocale(user.preferredLanguage);
    const vars = {
      name: user.fullName,
      couponCode: code,
      discountPercent: DEFAULT_DISCOUNT_PERCENT,
      validUntil,
    };

    // Email
    if (emailSettings.enabled && emailSettings.templates.birthday_greeting?.enabled && row.email) {
      const tpl = emailSettings.templates.birthday_greeting;
      const isArabic = locale === 'ar';
      const subject = renderTemplate(isArabic ? tpl.subjectAr : tpl.subjectEn, vars).trim();
      const bodyContent = renderTemplate(isArabic ? tpl.bodyAr : tpl.bodyEn, vars).trim();
      if (subject && bodyContent) {
        const html = await getEmailLayout({ content: bodyContent, isArabic });
        const row2 = await enqueueNotification({
          channel: 'EMAIL',
          userId: row.id,
          templateKey: 'birthday_greeting',
          title: subject,
          body: html,
          vars: vars as Record<string, unknown>,
          data: { to: row.email, text: bodyContent.replace(/<[^>]*>/g, '') },
          dedupeKey: `birthday:email:${row.id}:${year}`,
        });
        if (row2) emailsQueued += 1;
      }
    }

    // WhatsApp
    if (waSettings.enabled && waSettings.templates.birthday_greeting?.enabled && row.phone_number) {
      const tpl = waSettings.templates.birthday_greeting;
      const body = renderTemplate(locale === 'ar' ? tpl.ar : tpl.en, vars).trim();
      if (body) {
        const row3 = await enqueueNotification({
          channel: 'WHATSAPP',
          userId: row.id,
          templateKey: 'birthday_greeting',
          title: null,
          body,
          vars: vars as Record<string, unknown>,
          data: { phoneNumber: row.phone_number },
          dedupeKey: `birthday:whatsapp:${row.id}:${year}`,
        });
        if (row3) whatsappQueued += 1;
      }
    }
  }

  return { scanned: users.length, emailsQueued, whatsappQueued };
}
