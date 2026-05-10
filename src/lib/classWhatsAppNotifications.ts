import { query } from '@/lib/db/pool';
import { buildPublicSiteUrl } from '@/lib/publicSiteUrl';
import { sendUserTransactionWhatsApp } from '@/lib/whatsapp/transactionNotifications';

let classWhatsAppNotificationSchemaReady: Promise<void> | null = null;
const NOON_TIME_ZONE = process.env.NOON_TIMEZONE || 'Asia/Muscat';

type DueWorkshopNotificationRow = {
  booking_id: string;
  user_id: string;
  title: string;
  title_ar: string | null;
  slug: string;
  start_date_time: string | null;
  end_date_time: string | null;
  preferred_language: string | null;
};

function normalizeLanguage(preferredLanguage: string | null | undefined): 'en' | 'ar' {
  return preferredLanguage?.toUpperCase().startsWith('AR') ? 'ar' : 'en';
}

function formatClassDate(value: string, language: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: NOON_TIME_ZONE,
  }).format(new Date(value));
}

function formatClassTime(value: string, language: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: NOON_TIME_ZONE,
  }).format(new Date(value));
}

async function ensureClassWhatsAppNotificationSchema(): Promise<void> {
  if (classWhatsAppNotificationSchemaReady) {
    return classWhatsAppNotificationSchemaReady;
  }

  classWhatsAppNotificationSchemaReady = (async () => {
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp_class_reminder_sent_at TIMESTAMP WITH TIME ZONE`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp_class_review_sent_at TIMESTAMP WITH TIME ZONE`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bookings_whatsapp_class_reminder_sent_at ON bookings(whatsapp_class_reminder_sent_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_bookings_whatsapp_class_review_sent_at ON bookings(whatsapp_class_review_sent_at)`);
  })();

  return classWhatsAppNotificationSchemaReady;
}

async function listDueWorkshopReminders(limit: number): Promise<DueWorkshopNotificationRow[]> {
  await ensureClassWhatsAppNotificationSchema();

  const result = await query<DueWorkshopNotificationRow>(
    `SELECT
       b.id AS booking_id,
       b.user_id,
       c.title,
       c.title_ar,
       c.slug,
       c.start_date_time,
       c.end_date_time,
       u.preferred_language
     FROM bookings b
     INNER JOIN classes c ON c.id = b.class_id
     INNER JOIN users u ON u.id = b.user_id
     WHERE b.status = 'CONFIRMED'
       AND b.payment_status = 'PAID'
       AND c.start_date_time IS NOT NULL
       AND b.whatsapp_class_reminder_sent_at IS NULL
       AND COALESCE(NULLIF(TRIM(u.phone_number), ''), '') <> ''
       AND NOW() >= c.start_date_time - INTERVAL '24 hours'
       AND NOW() < c.start_date_time
     ORDER BY c.start_date_time ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

async function listDueWorkshopReviewRequests(limit: number): Promise<DueWorkshopNotificationRow[]> {
  await ensureClassWhatsAppNotificationSchema();

  const result = await query<DueWorkshopNotificationRow>(
    `SELECT
       b.id AS booking_id,
       b.user_id,
       c.title,
       c.title_ar,
       c.slug,
       c.start_date_time,
       c.end_date_time,
       u.preferred_language
     FROM bookings b
     INNER JOIN classes c ON c.id = b.class_id
     INNER JOIN users u ON u.id = b.user_id
     LEFT JOIN reviews r
       ON r.class_id = b.class_id
      AND r.user_id = b.user_id
     WHERE b.status = 'CONFIRMED'
       AND b.payment_status = 'PAID'
       AND b.whatsapp_class_review_sent_at IS NULL
       AND r.id IS NULL
       AND COALESCE(NULLIF(TRIM(u.phone_number), ''), '') <> ''
       AND COALESCE(c.end_date_time, c.start_date_time) IS NOT NULL
       AND NOW() >= COALESCE(c.end_date_time, c.start_date_time)
     ORDER BY COALESCE(c.end_date_time, c.start_date_time) ASC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

export async function dispatchDueClassWhatsAppNotifications(limit = 200): Promise<{
  scannedReminders: number;
  reminderSent: number;
  scannedReviewRequests: number;
  reviewSent: number;
}> {
  await ensureClassWhatsAppNotificationSchema();

  const [dueReminders, dueReviewRequests] = await Promise.all([
    listDueWorkshopReminders(limit),
    listDueWorkshopReviewRequests(limit),
  ]);

  let reminderSent = 0;
  let reviewSent = 0;
  for (const row of dueReminders) {
    if (!row.start_date_time) continue;

    const language = normalizeLanguage(row.preferred_language);
    const sent = await sendUserTransactionWhatsApp({
      userId: row.user_id,
      key: 'class_reminder',
      vars: {
        classTitle: row.title_ar?.trim() || row.title,
        classDate: formatClassDate(row.start_date_time, language),
        classTime: formatClassTime(row.start_date_time, language),
        classUrl: buildPublicSiteUrl(`/${language}/classes/${row.slug}`),
      },
    });

    if (!sent) continue;

    await query(
      `UPDATE bookings
       SET whatsapp_class_reminder_sent_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [row.booking_id]
    );
    reminderSent += 1;
  }

  for (const row of dueReviewRequests) {
    const dateSource = row.end_date_time || row.start_date_time;
    const language = normalizeLanguage(row.preferred_language);
    const sent = await sendUserTransactionWhatsApp({
      userId: row.user_id,
      key: 'class_review_request',
      vars: {
        classTitle: row.title_ar?.trim() || row.title,
        classDate: dateSource ? formatClassDate(dateSource, language) : '',
        classTime: dateSource ? formatClassTime(dateSource, language) : '',
        classUrl: buildPublicSiteUrl(`/${language}/classes/${row.slug}`),
      },
    });

    if (!sent) continue;

    await query(
      `UPDATE bookings
       SET whatsapp_class_review_sent_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [row.booking_id]
    );
    reviewSent += 1;
  }

  return {
    scannedReminders: dueReminders.length,
    reminderSent,
    scannedReviewRequests: dueReviewRequests.length,
    reviewSent,
  };
}
