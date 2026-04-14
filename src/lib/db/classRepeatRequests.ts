import { query } from './pool';
import { findUniqueClass } from './classes';
import { notifyRole, notifyUser } from '@/lib/notificationService';
import { getUserById } from './users';
import { sendEmail } from '@/lib/email/emailClient';
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

export type AdminClassRepeatRequestItem = {
  classId: string;
  slug: string;
  title: string;
  titleAr: string | null;
  image: string | null;
  category: string;
  subCategory: string | null;
  status: string;
  endDateTime: Date | null;
  requestsCount: number;
  pendingRequestsCount: number;
  fulfilledRequestsCount: number;
  requestersCount: number;
  lastRequestedAt: Date | null;
  lastPendingRequestedAt: Date | null;
  lastNotifiedAt: Date | null;
};

export type AdminClassRepeatRequestSummaryStats = {
  totalRequests: number;
  pendingRequests: number;
  fulfilledRequests: number;
  workshopsWithRequests: number;
  workshopsAwaitingScheduling: number;
  maxRequestsCount: number;
  latestRequestedAt: Date | null;
};

export type AdminClassRepeatRequestsView = {
  items: AdminClassRepeatRequestItem[];
  stats: AdminClassRepeatRequestSummaryStats;
};

type PendingRepeatRequester = {
  requestId: string;
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  fullName: string | null;
  preferredLanguage: string | null;
};

function getRepeatRequestStats(items: AdminClassRepeatRequestItem[]): AdminClassRepeatRequestSummaryStats {
  return items.reduce<AdminClassRepeatRequestSummaryStats>(
    (acc, item) => {
      acc.totalRequests += item.requestsCount;
      acc.pendingRequests += item.pendingRequestsCount;
      acc.fulfilledRequests += item.fulfilledRequestsCount;
      acc.workshopsWithRequests += 1;
      if (item.pendingRequestsCount > 0) {
        acc.workshopsAwaitingScheduling += 1;
      }
      if (item.requestsCount > acc.maxRequestsCount) {
        acc.maxRequestsCount = item.requestsCount;
      }
      if (!acc.latestRequestedAt || (item.lastRequestedAt && item.lastRequestedAt > acc.latestRequestedAt)) {
        acc.latestRequestedAt = item.lastRequestedAt;
      }
      return acc;
    },
    {
      totalRequests: 0,
      pendingRequests: 0,
      fulfilledRequests: 0,
      workshopsWithRequests: 0,
      workshopsAwaitingScheduling: 0,
      maxRequestsCount: 0,
      latestRequestedAt: null,
    }
  );
}

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

export async function countPendingClassRepeatRequestGroups(): Promise<number> {
  await ensureClassRepeatRequestsTable();

  const result = await query<{ count: number }>(
    `SELECT COUNT(DISTINCT class_id)::int AS count
     FROM class_repeat_requests
     WHERE fulfilled_by_class_id IS NULL`
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function getAdminClassRepeatRequests(options?: {
  search?: string;
  category?: string;
  state?: 'pending' | 'fulfilled' | 'all';
  sort?: 'demand' | 'latest';
}): Promise<AdminClassRepeatRequestsView> {
  await ensureClassRepeatRequestsTable();

  const values: unknown[] = [];
  const whereClauses: string[] = [];
  let parameterIndex = 1;

  const search = options?.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    whereClauses.push(`(
      cls.title ILIKE $${parameterIndex}
      OR COALESCE(cls.title_ar, '') ILIKE $${parameterIndex + 1}
    )`);
    values.push(pattern, pattern);
    parameterIndex += 2;
  }

  if (options?.category && options.category !== 'ALL') {
    whereClauses.push(`cls.category = $${parameterIndex}`);
    values.push(options.category);
    parameterIndex += 1;
  }

  const havingClauses: string[] = [];
  if (options?.state === 'pending') {
    havingClauses.push(`COUNT(*) FILTER (WHERE crr.fulfilled_by_class_id IS NULL) > 0`);
  }
  if (options?.state === 'fulfilled') {
    havingClauses.push(`COUNT(*) FILTER (WHERE crr.fulfilled_by_class_id IS NULL) = 0`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const havingSql = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : '';
  const orderSql =
    options?.sort === 'latest'
      ? 'ORDER BY last_requested_at DESC NULLS LAST, pending_requests_count DESC, requests_count DESC'
      : 'ORDER BY pending_requests_count DESC, requests_count DESC, last_requested_at DESC NULLS LAST';

  const result = await query<{
    class_id: string;
    slug: string;
    title: string;
    title_ar: string | null;
    image: string | null;
    category: string;
    sub_category: string | null;
    status: string;
    end_date_time: Date | null;
    requests_count: number;
    pending_requests_count: number;
    fulfilled_requests_count: number;
    requesters_count: number;
    last_requested_at: Date | null;
    last_pending_requested_at: Date | null;
    last_notified_at: Date | null;
  }>(
    `SELECT
       crr.class_id,
       cls.slug,
       cls.title,
       cls.title_ar,
       cls.image,
       cls.category,
       cls.sub_category,
       cls.status,
       cls.end_date_time,
       COUNT(*)::int AS requests_count,
       COUNT(*) FILTER (WHERE crr.fulfilled_by_class_id IS NULL)::int AS pending_requests_count,
       COUNT(*) FILTER (WHERE crr.fulfilled_by_class_id IS NOT NULL)::int AS fulfilled_requests_count,
       COUNT(DISTINCT crr.user_id)::int AS requesters_count,
       MAX(crr.created_at) AS last_requested_at,
       MAX(crr.created_at) FILTER (WHERE crr.fulfilled_by_class_id IS NULL) AS last_pending_requested_at,
       MAX(crr.notified_at) AS last_notified_at
     FROM class_repeat_requests crr
     INNER JOIN classes cls ON cls.id = crr.class_id
     ${whereSql}
     GROUP BY
       crr.class_id,
       cls.slug,
       cls.title,
       cls.title_ar,
       cls.image,
       cls.category,
       cls.sub_category,
       cls.status,
       cls.end_date_time
     ${havingSql}
     ${orderSql}`,
    values
  );

  const items: AdminClassRepeatRequestItem[] = result.rows.map((row) => ({
    classId: row.class_id,
    slug: row.slug,
    title: row.title,
    titleAr: row.title_ar,
    image: row.image,
    category: row.category,
    subCategory: row.sub_category,
    status: row.status,
    endDateTime: row.end_date_time,
    requestsCount: Number(row.requests_count ?? 0),
    pendingRequestsCount: Number(row.pending_requests_count ?? 0),
    fulfilledRequestsCount: Number(row.fulfilled_requests_count ?? 0),
    requestersCount: Number(row.requesters_count ?? 0),
    lastRequestedAt: row.last_requested_at,
    lastPendingRequestedAt: row.last_pending_requested_at,
    lastNotifiedAt: row.last_notified_at,
  }));

  return {
    items,
    stats: getRepeatRequestStats(items),
  };
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

  if ((insertResult.rowCount ?? 0) > 0) {
    const classTitle = typeof classItem.title === 'string' ? classItem.title : 'Workshop';
    const classTitleAr = typeof classItem.titleAr === 'string' ? classItem.titleAr : null;
    const classSlug = typeof classItem.slug === 'string' ? classItem.slug : null;
    const requestsCount = summary[input.classId]?.requestsCount ?? 1;

    await notifyRole('ADMIN', {
      type: 'class_repeat_request_submitted',
      title: 'Repeat request received',
      message: `${classTitle} received a new repeat request.`,
      data: {
        classId: input.classId,
        classSlug,
        classTitle,
        classTitleAr,
        requestsCount,
      },
    }).catch(() => {});
  }

  return {
    created: (insertResult.rowCount ?? 0) > 0,
    requestsCount: summary[input.classId]?.requestsCount ?? 0,
    requestedByCurrentUser: true,
  };
}

function isArabicPreferredLanguage(value: string | null | undefined): boolean {
  return value?.toUpperCase().startsWith('AR') ?? false;
}

function buildRepeatClassUrl(input: { slug: string; isArabic: boolean }): string {
  return `/${input.isArabic ? 'ar' : 'en'}/classes/${input.slug}`;
}

function buildRepeatMessageEmailHtml(input: {
  isArabic: boolean;
  greeting: string;
  classTitle: string;
  message: string;
  classUrl: string;
}): string {
  const direction = input.isArabic ? 'rtl' : 'ltr';
  const align = input.isArabic ? 'right' : 'left';
  const ctaLabel = input.isArabic ? 'عرض الورشة' : 'Open Workshop';
  const intro = input.isArabic
    ? `بخصوص ورشة ${input.classTitle}`
    : `Regarding ${input.classTitle}`;
  const formattedMessage = input.message.replace(/\n/g, '<br />');

  return `
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b; direction: ${direction}; text-align: ${align};">
      <div style="border: 1px solid #e4e4e7; border-radius: 18px; overflow: hidden; background: #ffffff;">
        <div style="padding: 24px 28px; background: linear-gradient(135deg, #111827, #3f3f46); color: #ffffff;">
          <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.78;">Noon</p>
          <h1 style="margin: 0; font-size: 26px; line-height: 1.35;">${intro}</h1>
        </div>
        <div style="padding: 28px;">
          <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.8;">${input.greeting}</p>
          <div style="margin: 0 0 18px; font-size: 16px; line-height: 1.9; color: #3f3f46;">${formattedMessage}</div>
          <a href="${input.classUrl}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #18181b; color: #ffffff; text-decoration: none; font-weight: 700;">${ctaLabel}</a>
          <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.8; color: #52525b;">${input.classUrl}</p>
        </div>
      </div>
    </div>
  `;
}

async function getPendingRepeatRequestersByClassId(classId: string): Promise<PendingRepeatRequester[]> {
  await ensureClassRepeatRequestsTable();

  const result = await query<{
    request_id: string;
    user_id: string;
    email: string | null;
    phone_number: string | null;
    full_name: string | null;
    preferred_language: string | null;
  }>(
    `SELECT
       crr.id AS request_id,
       usr.id AS user_id,
       usr.email,
       usr.phone_number,
       usr.full_name,
       usr.preferred_language
     FROM class_repeat_requests crr
     INNER JOIN users usr ON usr.id = crr.user_id
     WHERE crr.class_id = $1
       AND crr.fulfilled_by_class_id IS NULL
     ORDER BY crr.created_at DESC`,
    [classId]
  );

  return result.rows.map((row) => ({
    requestId: row.request_id,
    userId: row.user_id,
    email: row.email,
    phoneNumber: row.phone_number,
    fullName: row.full_name,
    preferredLanguage: row.preferred_language,
  }));
}

export async function sendManualRepeatRequestUpdate(input: {
  classId: string;
  subjectEn: string;
  subjectAr: string;
  messageEn: string;
  messageAr: string;
  sendEmailChannel: boolean;
  sendWhatsAppChannel: boolean;
}): Promise<{
  recipientsCount: number;
  emailedCount: number;
  whatsappCount: number;
}> {
  await ensureClassRepeatRequestsTable();

  if (!input.sendEmailChannel && !input.sendWhatsAppChannel) {
    throw new Error('Select at least one delivery channel.');
  }

  const classItem = await findUniqueClass({ id: input.classId });
  if (!classItem) {
    throw new Error('Class not found.');
  }

  const slug = typeof classItem.slug === 'string' ? classItem.slug : '';
  const requesters = await getPendingRepeatRequestersByClassId(input.classId);
  if (requesters.length === 0) {
    throw new Error('There are no pending repeat requesters for this workshop.');
  }

  let emailedCount = 0;
  let whatsappCount = 0;
  const deliveredRequestIds = new Set<string>();

  await Promise.all(
    requesters.map(async (requester) => {
      const isArabic = isArabicPreferredLanguage(requester.preferredLanguage);
      const classTitle =
        isArabic && typeof classItem.titleAr === 'string' && classItem.titleAr.trim()
          ? classItem.titleAr
          : typeof classItem.title === 'string'
            ? classItem.title
            : 'Workshop';
      const classUrl = buildRepeatClassUrl({ slug, isArabic });
      const message = isArabic ? input.messageAr.trim() : input.messageEn.trim();
      const subject = isArabic ? input.subjectAr.trim() : input.subjectEn.trim();
      const greeting = requester.fullName?.trim()
        ? isArabic
          ? `مرحباً ${requester.fullName}`
          : `Hello ${requester.fullName}`
        : isArabic
          ? 'مرحباً'
          : 'Hello';
      let delivered = false;

      if (input.sendWhatsAppChannel && requester.phoneNumber) {
        const whatsappMessage = `${message}\n\n${classTitle}\n${classUrl}`;
        await sendWhatsAppText({
          phoneNumber: requester.phoneNumber,
          text: whatsappMessage,
        }).then(() => {
          whatsappCount += 1;
          delivered = true;
        }).catch(() => {});
      }

      if (input.sendEmailChannel && requester.email) {
        const result = await sendEmail({
          to: requester.email,
          subject,
          text: `${greeting}\n\n${message}\n\n${classTitle}\n${classUrl}`,
          html: buildRepeatMessageEmailHtml({
            isArabic,
            greeting,
            classTitle,
            message,
            classUrl,
          }),
        }).catch(() => ({ ok: false }));

        if (result?.ok) {
          emailedCount += 1;
          delivered = true;
        }
      }

      if (delivered) {
        deliveredRequestIds.add(requester.requestId);
      }
    })
  );

  if (deliveredRequestIds.size > 0) {
    await query(
      `UPDATE class_repeat_requests
       SET notified_at = NOW(),
           updated_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [Array.from(deliveredRequestIds)]
    );
  }

  return {
    recipientsCount: requesters.length,
    emailedCount,
    whatsappCount,
  };
}

async function sendRepeatAvailableWhatsApp(input: {
  phoneNumber: string | null | undefined;
  isArabic: boolean;
  classTitle: string;
  classUrl: string;
}): Promise<void> {
  if (!input.phoneNumber) return;

  const text = isArabic
    ? `الورشة التي طلبتِ/طلبتَ إعادتها متاحة الآن: ${input.classTitle}\nيمكنك الحجز من هنا:\n${input.classUrl}`
    : `The workshop you asked us to repeat is now available: ${input.classTitle}\nYou can book it here:\n${input.classUrl}`;

  await sendWhatsAppText({
    phoneNumber: input.phoneNumber,
    text,
  });
}

async function sendRepeatAvailableEmail(input: {
  email: string | null | undefined;
  fullName: string | null | undefined;
  isArabic: boolean;
  classTitle: string;
  classUrl: string;
}): Promise<void> {
  if (!input.email) return;

  const subject = input.isArabic
    ? `تمت إعادة طرح ورشة ${input.classTitle}`
    : `${input.classTitle} is available again`;

  const greeting = input.fullName?.trim()
    ? input.isArabic
      ? `مرحباً ${input.fullName}`
      : `Hello ${input.fullName}`
    : input.isArabic
      ? 'مرحباً'
      : 'Hello';

  const text = input.isArabic
    ? `${greeting}\n\nالورشة التي طلبتِ/طلبتَ إعادتها أصبحت متاحة الآن: ${input.classTitle}\nيمكنك الحجز من هنا:\n${input.classUrl}\n\nفريق Noon`
    : `${greeting}\n\nThe workshop you asked us to repeat is now available: ${input.classTitle}\nBook here:\n${input.classUrl}\n\nNoon Team`;

  const html = input.isArabic
    ? `
      <div style="font-family: Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b; direction: rtl; text-align: right;">
        <div style="border: 1px solid #e4e4e7; border-radius: 18px; overflow: hidden; background: #ffffff;">
          <div style="padding: 24px 28px; background: linear-gradient(135deg, #111827, #3f3f46); color: #ffffff;">
            <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.78;">Noon</p>
            <h1 style="margin: 0; font-size: 26px; line-height: 1.35;">ورشتك المطلوبة أصبحت متاحة من جديد</h1>
          </div>
          <div style="padding: 28px;">
            <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.9;">${greeting}</p>
            <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.9;">الورشة التي طلبتِ/طلبتَ إعادتها أصبحت متاحة الآن:</p>
            <p style="margin: 0 0 18px; font-size: 22px; font-weight: 700; line-height: 1.5; color: #111827;">${input.classTitle}</p>
            <a href="${input.classUrl}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #18181b; color: #ffffff; text-decoration: none; font-weight: 700;">احجز الآن</a>
            <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.8; color: #52525b;">إذا لم يعمل الزر، استخدم هذا الرابط مباشرة:<br /><a href="${input.classUrl}" style="color: #0f766e; text-decoration: none;">${input.classUrl}</a></p>
          </div>
        </div>
      </div>
    `
    : `
      <div style="font-family: Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #18181b;">
        <div style="border: 1px solid #e4e4e7; border-radius: 18px; overflow: hidden; background: #ffffff;">
          <div style="padding: 24px 28px; background: linear-gradient(135deg, #111827, #3f3f46); color: #ffffff;">
            <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.78;">Noon</p>
            <h1 style="margin: 0; font-size: 26px; line-height: 1.35;">A workshop you requested is back</h1>
          </div>
          <div style="padding: 28px;">
            <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.8;">${greeting}</p>
            <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.8;">The workshop you asked us to repeat is now available again:</p>
            <p style="margin: 0 0 18px; font-size: 22px; font-weight: 700; line-height: 1.5; color: #111827;">${input.classTitle}</p>
            <a href="${input.classUrl}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #18181b; color: #ffffff; text-decoration: none; font-weight: 700;">Book now</a>
            <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.8; color: #52525b;">If the button does not open, use this link directly:<br /><a href="${input.classUrl}" style="color: #0f766e; text-decoration: none;">${input.classUrl}</a></p>
          </div>
        </div>
      </div>
    `;

  await sendEmail({
    to: input.email,
    subject,
    text,
    html,
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

  const slug = typeof classItem.slug === 'string' ? classItem.slug : '';

  await Promise.all(
    result.rows.map(async (row) => {
      const user = await getUserById(row.user_id);
      const isArabic = isArabicPreferredLanguage(user?.preferredLanguage);
      const classTitle =
        isArabic && typeof classItem.titleAr === 'string' && classItem.titleAr.trim()
          ? classItem.titleAr
          : typeof classItem.title === 'string'
            ? classItem.title
            : 'Workshop';
      const classUrl = buildRepeatClassUrl({ slug, isArabic });

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
        phoneNumber: user?.phoneNumber,
        isArabic,
        classTitle,
        classUrl,
      }).catch(() => {});

      await sendRepeatAvailableEmail({
        email: user?.email,
        fullName: user?.fullName,
        isArabic,
        classTitle,
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
