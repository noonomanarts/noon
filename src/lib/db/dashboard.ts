/**
 * Read-only figures for the admin dashboard.
 *
 * Every query is isolated: if one fails (a table that is created lazily and
 * does not exist yet, for example) its figure falls back to zero/empty and the
 * rest of the dashboard still renders.
 */
import { pool } from './pool';

export type DashboardUpcomingClass = {
  id: string;
  title: string;
  titleAr: string | null;
  startDateTime: string;
  seatsTotal: number;
  seatsBooked: number;
};

export type DashboardOverview = {
  classRevenueThisMonth: number;
  classBookingsThisMonth: number;
  upcomingClassesCount: number;
  upcomingClasses: DashboardUpcomingClass[];
  newEventRequests: number;
  pendingWithdrawals: number;
  pendingTopups: number;
  unreadMessages: number;
  awaitingReviewBookings: number;
};

async function safeRows(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  try {
    const result = await pool.query(sql, params);
    return result.rows as Record<string, unknown>[];
  } catch (error) {
    console.error('Dashboard query failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

// "This month" follows the studio's clock, not the server's (UTC).
const MONTH_START_MUSCAT = `(date_trunc('month', NOW() AT TIME ZONE 'Asia/Muscat') AT TIME ZONE 'Asia/Muscat')`;

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [revenue, upcomingCount, upcoming, events, withdrawals, topups, messages, review] = await Promise.all([
    safeRows(
      `SELECT COALESCE(SUM(total_amount), 0)::numeric AS amount, COUNT(*)::int AS count
       FROM bookings
       WHERE payment_status = 'PAID'
         AND status IN ('CONFIRMED', 'COMPLETED')
         AND COALESCE(paid_at, created_at) >= ${MONTH_START_MUSCAT}`
    ),
    safeRows(
      `SELECT COUNT(*)::int AS count
       FROM classes
       WHERE status = 'PUBLISHED' AND start_date_time >= NOW()`
    ),
    safeRows(
      `SELECT id, title, title_ar, start_date_time, seats_total, seats_booked
       FROM classes
       WHERE status = 'PUBLISHED' AND start_date_time >= NOW()
       ORDER BY start_date_time ASC
       LIMIT 5`
    ),
    safeRows(`SELECT COUNT(*)::int AS count FROM event_bookings WHERE status = 'NEW'`),
    safeRows(
      `SELECT COUNT(*)::int AS count
       FROM wallet_transactions
       WHERE type = 'WITHDRAWAL_REQUEST' AND status = 'PENDING'`
    ),
    safeRows(`SELECT COUNT(*)::int AS count FROM wallet_topup_payments WHERE status = 'PENDING'`),
    safeRows(`SELECT COUNT(*)::int AS count FROM contact_messages WHERE status = 'NEW'`),
    // Paid online but not confirmed (class full / registration closed at payment time).
    safeRows(
      `SELECT COUNT(*)::int AS count
       FROM bookings
       WHERE payment_status = 'PAID' AND status = 'PENDING'`
    ),
  ]);

  return {
    classRevenueThisMonth: toNumber(revenue[0]?.amount),
    classBookingsThisMonth: toNumber(revenue[0]?.count),
    upcomingClassesCount: toNumber(upcomingCount[0]?.count),
    upcomingClasses: upcoming.map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ''),
      titleAr: row.title_ar ? String(row.title_ar) : null,
      startDateTime: new Date(row.start_date_time as string).toISOString(),
      seatsTotal: toNumber(row.seats_total),
      seatsBooked: toNumber(row.seats_booked),
    })),
    newEventRequests: toNumber(events[0]?.count),
    pendingWithdrawals: toNumber(withdrawals[0]?.count),
    pendingTopups: toNumber(topups[0]?.count),
    unreadMessages: toNumber(messages[0]?.count),
    awaitingReviewBookings: toNumber(review[0]?.count),
  };
}
