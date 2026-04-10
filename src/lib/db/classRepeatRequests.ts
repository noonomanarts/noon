import { query } from './pool';
import { findUniqueClass } from './classes';
import { notifyUser } from '@/lib/notificationService';
import { getUserById } from './users';
import { sendWhatsAppText } from '@/lib/whatsappClient';

let classRepeatRequestsReady: Promise<void> | null = null;

async function ensureClassRepeatRequestsTable(): Promise<void> {
  if (classRepeatRequestsReady) return classRepeatRequestsReady;

  classRepeatRequestsReady = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS class_repeat_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fulfilled_by_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
        notified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT class_repeat_requests_unique UNIQUE (class_id, user_id)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_class_repeat_requests_class_id ON class_repeat_requests(class_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_class_repeat_requests_user_id ON class_repeat_requests(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_class_repeat_requests_fulfilled_by ON class_repeat_requests(fulfilled_by_class_id)`);
  })();

  return classRepeatRequestsReady;
}

export type ClassRepeatRequestSummary = {
  classId: string;
  requestsCount: number;
  requestedByCurrentUser: boolean;
};

export async function getClassRepeatRequestSummaries(
  classIds: string[],
  currentUserId?: string | null
): Promise<Record<string, ClassRepeatRequestSummary>> {
  await ensureClassRepeatRequestsTable();

  const uniqueClassIds = Array.from(new Set(classIds.filter(Boolean)));
  if (uniqueClassIds.length === 0) return {};

  const result = await query<{
    class_id: string;
    requests_count: number;
    requested_by_current_user: boolean;
  }>(
    `SELECT
       crr.class_id,
       COUNT(*)::int AS requests_count,
       BOOL_OR(crr.user_id = $2) AS requested_by_current_user
     FROM class_repeat_requests crr
     WHERE crr.class_id = ANY($1::uuid[])
     GROUP BY crr.class_id`,
    [uniqueClassIds, currentUserId ?? null]
  );

  const summaryMap: Record<string, ClassRepeatRequestSummary> = {};
  for (const classId of uniqueClassIds) {
    summaryMap[classId] = {
      classId,
      requestsCount: 0,
      requestedByCurrentUser: false,
    };
  }

  for (const row of result.rows) {
    summaryMap[row.class_id] = {
      classId: row.class_id,
      requestsCount: Number(row.requests_count || 0),
      requestedByCurrentUser: Boolean(row.requested_by_current_user),
    };
  }

  return summaryMap;
}

function isEndedClassForRepeatRequest(classItem: {
  status?: unknown;
  endDateTime?: unknown;
} | null): boolean {
  if (!classItem) return false;
  if (classItem.status === 'COMPLETED') return true;
  if (classItem.endDateTime instanceof Date) return classItem.endDateTime.getTime() < Date.now();
  if (typeof classItem.endDateTime === 'string') return new Date(classItem.endDateTime).getTime() < Date.now();
  return false;
}

export async function createClassRepeatRequest(input: {
  classId: string;
  userId: string;
}): Promise<{ created: boolean; requestsCount: number; requestedByCurrentUser: boolean }> {
  await ensureClassRepeatRequestsTable();

  const classItem = await findUniqueClass({ id: input.classId });
  if (!isEndedClassForRepeatRequest(classItem)) {
    throw new Error('Repeat requests are only available for ended workshops.');
  }

  const insertResult = await query(
    `INSERT INTO class_repeat_requests (class_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (class_id, user_id) DO NOTHING`,
    [input.classId, input.userId]
  );

  const summary = await getClassRepeatRequestSummaries([input.classId], input.userId);
  return {
    created: (insertResult.rowCount ?? 0) > 0,
    requestsCount: summary[input.classId]?.requestsCount ?? 0,
    requestedByCurrentUser: true,
  };
}

async function sendRepeatAvailableWhatsApp(input: {
  userId: string;
  classTitle: string;
  classUrl: string;
}): Promise<void> {
  const user = await getUserById(input.userId);
  if (!user?.phoneNumber) return;

  const isArabic = user.preferredLanguage?.toUpperCase().startsWith('AR');
  const text = isArabic
    ? `الورشة التي طلبتِ/طلبتَ إعادتها متاحة الآن: ${input.classTitle}\nيمكنك الحجز من هنا:\n${input.classUrl}`
    : `The workshop you asked us to repeat is now available: ${input.classTitle}\nYou can book it here:\n${input.classUrl}`;

  await sendWhatsAppText({
    phoneNumber: user.phoneNumber,
    text,
  });
}

export async function notifyRepeatRequestersForPublishedClass(input: {
  classId: string;
  locale?: string;
}): Promise<number> {
  await ensureClassRepeatRequestsTable();

  const classItem = await findUniqueClass({ id: input.classId });
  if (!classItem) return 0;

  const result = await query<{
    request_id: string;
    user_id: string;
  }>(
    `SELECT DISTINCT ON (crr.user_id)
        crr.id AS request_id,
        crr.user_id
     FROM class_repeat_requests crr
     JOIN classes source_class ON source_class.id = crr.class_id
     JOIN classes target_class ON target_class.id = $1
     WHERE crr.fulfilled_by_class_id IS NULL
       AND source_class.id <> target_class.id
       AND source_class.category = target_class.category
       AND COALESCE(source_class.sub_category, '') = COALESCE(target_class.sub_category, '')
       AND LOWER(TRIM(source_class.title)) = LOWER(TRIM(target_class.title))
       AND (
         source_class.status = 'COMPLETED'
         OR (source_class.end_date_time IS NOT NULL AND source_class.end_date_time < NOW())
       )
     ORDER BY crr.user_id, crr.created_at DESC`,
    [input.classId]
  );

  if (result.rows.length === 0) return 0;

  const title =
    input.locale === 'ar' && typeof classItem.titleAr === 'string' && classItem.titleAr.trim()
      ? classItem.titleAr
      : typeof classItem.title === 'string'
        ? classItem.title
        : 'Workshop';
  const slug = typeof classItem.slug === 'string' ? classItem.slug : '';
  const classUrl = `/${input.locale === 'ar' ? 'ar' : 'en'}/classes/${slug}`;

  await Promise.all(
    result.rows.map(async (row) => {
      await notifyUser(row.user_id, {
        type: 'class_repeat_available',
        title: 'Workshop Available Again',
        message: `"${classItem.title}" is available again for booking.`,
        data: {
          classId: classItem.id,
          classSlug: classItem.slug,
          classTitle: classItem.title,
        },
      }).catch(() => {});

      await sendRepeatAvailableWhatsApp({
        userId: row.user_id,
        classTitle: title,
        classUrl,
      }).catch(() => {});
    })
  );

  await query(
    `UPDATE class_repeat_requests
     SET fulfilled_by_class_id = $1,
         notified_at = NOW(),
         updated_at = NOW()
     WHERE id = ANY($2::uuid[])`,
    [input.classId, result.rows.map((row) => row.request_id)]
  );

  return result.rows.length;
}
