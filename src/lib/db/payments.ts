/**
 * Unified payments ledger for the admin dashboard.
 *
 * Money reaches Noon through four different tables (wallet top-ups, class
 * bookings, event bookings and shop orders). Admin payment alerts for all of
 * them link to the Payments page, so that page has to list every source — not
 * only wallet top-ups.
 */
import { pool } from './pool';
import { ensureWalletTopupPaymentsTable } from './wallet';

export type AdminPaymentSource = 'WALLET_TOPUP' | 'CLASS_BOOKING' | 'EVENT_BOOKING' | 'SHOP_ORDER';
export type AdminPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export const ADMIN_PAYMENT_SOURCES: AdminPaymentSource[] = [
  'WALLET_TOPUP',
  'CLASS_BOOKING',
  'EVENT_BOOKING',
  'SHOP_ORDER',
];

export const ADMIN_PAYMENT_STATUSES: AdminPaymentStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
];

export interface AdminPaymentRow {
  key: string;
  source: AdminPaymentSource;
  id: string;
  reference: string;
  related_id: string | null;
  title: string | null;
  title_ar: string | null;
  amount: number;
  currency: string;
  method: string | null;
  status: AdminPaymentStatus;
  gateway_transaction_id: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  activity_at: string;
  user_id: string | null;
  user_full_name: string;
  user_email: string | null;
  user_phone_number: string | null;
  user_profile_image: string | null;
}

export interface AdminPaymentsSummary {
  paidAmount: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  totalCount: number;
}

type TableAvailability = { shopOrders: boolean; eventBookings: boolean; bookings: boolean };

let tableAvailabilityCache: TableAvailability | null = null;

async function getTableAvailability(): Promise<TableAvailability> {
  if (tableAvailabilityCache) {
    return tableAvailabilityCache;
  }

  const result = await pool.query(
    `SELECT to_regclass('public.shop_orders') IS NOT NULL AS shop_orders,
            to_regclass('public.event_bookings') IS NOT NULL AS event_bookings,
            to_regclass('public.bookings') IS NOT NULL AS bookings`
  );

  const row = result.rows[0] ?? {};
  const availability: TableAvailability = {
    shopOrders: Boolean(row.shop_orders),
    eventBookings: Boolean(row.event_bookings),
    bookings: Boolean(row.bookings),
  };

  // Only cache once everything exists, so a table created later is picked up.
  if (availability.shopOrders && availability.eventBookings && availability.bookings) {
    tableAvailabilityCache = availability;
  }

  return availability;
}

function buildLedgerSql(availability: TableAvailability): string {
  const parts: string[] = [
    `SELECT 'WALLET_TOPUP'::text AS source,
            tp.id::text AS id,
            tp.reference::text AS reference,
            NULL::text AS related_id,
            NULL::text AS title,
            NULL::text AS title_ar,
            tp.user_id AS user_id,
            tp.amount::numeric AS amount,
            tp.currency::text AS currency,
            tp.gateway::text AS method,
            tp.status::text AS status,
            tp.gateway_transaction_id::text AS gateway_transaction_id,
            tp.failure_reason::text AS failure_reason,
            tp.paid_at AS paid_at,
            tp.created_at AS created_at,
            NULL::text AS guest_name,
            NULL::text AS guest_email,
            NULL::text AS guest_phone
     FROM wallet_topup_payments tp`,
  ];

  if (availability.bookings) {
    parts.push(
      `SELECT 'CLASS_BOOKING'::text,
              b.id::text,
              b.booking_number::text,
              b.class_id::text,
              c.title::text,
              c.title_ar::text,
              b.user_id,
              b.total_amount::numeric,
              b.currency::text,
              b.payment_method::text,
              CASE
                WHEN b.payment_status::text = 'PENDING' AND b.status::text = 'CANCELLED' THEN 'CANCELLED'
                ELSE b.payment_status::text
              END,
              NULL::text,
              NULL::text,
              b.paid_at,
              b.created_at,
              NULL::text,
              NULL::text,
              NULL::text
       FROM bookings b
       LEFT JOIN classes c ON c.id = b.class_id
       WHERE b.total_amount > 0`
    );
  }

  if (availability.eventBookings) {
    // Event requests only become payments once an amount is set and the
    // customer has started (or finished) paying.
    parts.push(
      `SELECT 'EVENT_BOOKING'::text,
              e.id::text,
              e.booking_number::text,
              e.id::text,
              e.event_type::text,
              NULL::text,
              e.user_id,
              e.total_amount::numeric,
              e.currency::text,
              e.payment_method::text,
              CASE
                WHEN e.payment_status::text = 'PENDING' AND e.status::text = 'CANCELLED' THEN 'CANCELLED'
                ELSE e.payment_status::text
              END,
              e.payment_reference::text,
              NULL::text,
              e.paid_at,
              e.created_at,
              e.full_name::text,
              e.email::text,
              e.phone_number::text
       FROM event_bookings e
       WHERE e.total_amount IS NOT NULL
         AND e.total_amount > 0
         AND (e.payment_status::text <> 'PENDING' OR e.payment_method IS NOT NULL)`
    );
  }

  if (availability.shopOrders) {
    parts.push(
      `SELECT 'SHOP_ORDER'::text,
              o.id::text,
              o.order_number::text,
              o.id::text,
              NULL::text,
              NULL::text,
              o.user_id,
              o.total_amount::numeric,
              o.currency::text,
              o.payment_method::text,
              CASE WHEN o.status::text = 'CANCELLED' THEN 'CANCELLED' ELSE 'PAID' END,
              NULL::text,
              NULL::text,
              o.paid_at,
              o.created_at,
              o.recipient_full_name::text,
              NULL::text,
              o.recipient_phone::text
       FROM shop_orders o`
    );
  }

  return parts.join('\n     UNION ALL\n     ');
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export async function listPaymentsForAdmin(options?: {
  status?: AdminPaymentStatus | 'ALL';
  source?: AdminPaymentSource | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ payments: AdminPaymentRow[]; total: number; summary: AdminPaymentsSummary }> {
  await ensureWalletTopupPaymentsTable();
  const availability = await getTableAvailability();

  const status = options?.status ?? 'ALL';
  const source = options?.source ?? 'ALL';
  const search = options?.search?.trim() ?? '';
  const page = Math.max(1, Math.floor(options?.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(options?.limit ?? 20)));
  const offset = (page - 1) * limit;

  // Filters shared by the list and the summary (everything except status, so
  // the summary cards keep showing the full picture while a status is picked).
  const baseClauses: string[] = ['1=1'];
  const baseParams: Array<string | number> = [];

  if (source !== 'ALL') {
    baseParams.push(source);
    baseClauses.push(`l.source = $${baseParams.length}`);
  }

  if (search.length > 0) {
    baseParams.push(`%${escapeLike(search)}%`);
    const index = baseParams.length;
    baseClauses.push(`(
      COALESCE(u.full_name, l.guest_name, '') ILIKE $${index}
      OR COALESCE(u.email, l.guest_email, '') ILIKE $${index}
      OR COALESCE(u.phone_number, l.guest_phone, '') ILIKE $${index}
      OR l.reference ILIKE $${index}
      OR COALESCE(l.gateway_transaction_id, '') ILIKE $${index}
      OR COALESCE(l.title, '') ILIKE $${index}
      OR COALESCE(l.title_ar, '') ILIKE $${index}
    )`);
  }

  const ledgerSql = buildLedgerSql(availability);
  const fromSql = `FROM (${ledgerSql}) l LEFT JOIN users u ON u.id = l.user_id`;

  const listClauses = [...baseClauses];
  const listParams = [...baseParams];
  if (status !== 'ALL') {
    listParams.push(status);
    listClauses.push(`l.status = $${listParams.length}`);
  }

  listParams.push(limit);
  const limitIndex = listParams.length;
  listParams.push(offset);
  const offsetIndex = listParams.length;

  const [listResult, countResult, summaryResult] = await Promise.all([
    pool.query(
      `SELECT l.source, l.id, l.reference, l.related_id, l.title, l.title_ar, l.user_id,
              l.amount, l.currency, l.method, l.status, l.gateway_transaction_id,
              l.failure_reason, l.paid_at, l.created_at,
              COALESCE(l.paid_at, l.created_at) AS activity_at,
              COALESCE(u.full_name, l.guest_name) AS user_full_name,
              COALESCE(u.email, l.guest_email) AS user_email,
              COALESCE(u.phone_number, l.guest_phone) AS user_phone_number,
              u.profile_image AS user_profile_image
       ${fromSql}
       WHERE ${listClauses.join(' AND ')}
       ORDER BY COALESCE(l.paid_at, l.created_at) DESC, l.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      listParams
    ),
    // Counted separately so the total stays correct on a page past the end.
    pool.query(
      `SELECT COUNT(*)::int AS total ${fromSql} WHERE ${listClauses.join(' AND ')}`,
      listParams.slice(0, listParams.length - 2)
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total_count,
              COUNT(*) FILTER (WHERE l.status = 'PAID')::int AS paid_count,
              COUNT(*) FILTER (WHERE l.status = 'PENDING')::int AS pending_count,
              COUNT(*) FILTER (WHERE l.status = 'FAILED')::int AS failed_count,
              COALESCE(SUM(l.amount) FILTER (WHERE l.status = 'PAID'), 0)::numeric AS paid_amount
       ${fromSql}
       WHERE ${baseClauses.join(' AND ')}`,
      baseParams
    ),
  ]);

  const toIso = (value: unknown): string | null => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };

  const payments: AdminPaymentRow[] = listResult.rows.map((row) => {
    const createdAt = toIso(row.created_at) ?? new Date(0).toISOString();
    return {
      key: `${row.source}:${row.id}`,
      source: row.source as AdminPaymentSource,
      id: String(row.id),
      reference: String(row.reference ?? ''),
      related_id: row.related_id ? String(row.related_id) : null,
      title: row.title ? String(row.title) : null,
      title_ar: row.title_ar ? String(row.title_ar) : null,
      amount: Number.parseFloat(String(row.amount ?? 0)) || 0,
      currency: String(row.currency || 'OMR'),
      method: row.method ? String(row.method) : null,
      status: row.status as AdminPaymentStatus,
      gateway_transaction_id: row.gateway_transaction_id ? String(row.gateway_transaction_id) : null,
      failure_reason: row.failure_reason ? String(row.failure_reason) : null,
      paid_at: toIso(row.paid_at),
      created_at: createdAt,
      activity_at: toIso(row.activity_at) ?? createdAt,
      user_id: row.user_id ? String(row.user_id) : null,
      user_full_name: String(row.user_full_name || ''),
      user_email: row.user_email ? String(row.user_email) : null,
      user_phone_number: row.user_phone_number ? String(row.user_phone_number) : null,
      user_profile_image: row.user_profile_image ? String(row.user_profile_image) : null,
    };
  });

  const summaryRow = summaryResult.rows[0] ?? {};

  return {
    payments,
    total: Number(countResult.rows[0]?.total ?? 0),
    summary: {
      paidAmount: Number.parseFloat(String(summaryRow.paid_amount ?? 0)) || 0,
      paidCount: Number(summaryRow.paid_count ?? 0),
      pendingCount: Number(summaryRow.pending_count ?? 0),
      failedCount: Number(summaryRow.failed_count ?? 0),
      totalCount: Number(summaryRow.total_count ?? 0),
    },
  };
}
