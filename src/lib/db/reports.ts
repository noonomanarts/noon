/**
 * Aggregated workshop reports for the admin Reports section.
 * "Attendance" = participants of paid bookings, grouped by the workshop date.
 * "Demand" = paid bookings grouped by when they were made.
 */
import { query } from './pool';

const PAID_BOOKING_FILTER = `b.payment_status = 'PAID' AND b.status IN ('CONFIRMED', 'COMPLETED')`;

export type AttendancePoint = {
  periodStart: string; // ISO date of the week/month start
  participants: number;
  bookings: number;
  workshops: number;
  revenue: number;
};

export type TopWorkshopRow = {
  classId: string;
  slug: string;
  title: string;
  titleAr: string | null;
  image: string | null;
  category: string;
  startDateTime: string | null;
  seatsTotal: number;
  seatsBooked: number;
  participants: number;
  bookings: number;
  revenue: number;
};

export type RequestedWorkshopRow = {
  classId: string;
  slug: string;
  title: string;
  titleAr: string | null;
  image: string | null;
  requestsCount: number;
  requestsLast30Days: number;
  lastRequestedAt: string | null;
};

export type WorkshopReportsSummary = {
  participantsThisWeek: number;
  participantsLastWeek: number;
  participantsThisMonth: number;
  participantsLastMonth: number;
  bookingsThisMonth: number;
  revenueThisMonth: number;
  workshopsHeldThisMonth: number;
  totalParticipants: number;
  totalWorkshopsHeld: number;
  currency: string;
};

export type WorkshopReportsData = {
  summary: WorkshopReportsSummary;
  weeklyAttendance: AttendancePoint[];
  monthlyAttendance: AttendancePoint[];
  topWorkshopsWeek: TopWorkshopRow[];
  topWorkshopsMonth: TopWorkshopRow[];
  mostRequested: RequestedWorkshopRow[];
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapAttendanceRows(rows: Record<string, unknown>[]): Map<string, AttendancePoint> {
  const map = new Map<string, AttendancePoint>();
  for (const row of rows) {
    const periodStart = new Date(String(row.period_start)).toISOString();
    map.set(periodStart, {
      periodStart,
      participants: toNumber(row.participants),
      bookings: toNumber(row.bookings),
      workshops: toNumber(row.workshops),
      revenue: toNumber(row.revenue),
    });
  }
  return map;
}

/** Build a zero-filled series for the last `count` periods (weeks or months). */
function buildFilledSeries(
  rows: Record<string, unknown>[],
  unit: 'week' | 'month',
  count: number,
  seriesStart: Date
): AttendancePoint[] {
  const byPeriod = mapAttendanceRows(rows);
  const series: AttendancePoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const periodDate = new Date(seriesStart);
    if (unit === 'week') {
      periodDate.setUTCDate(periodDate.getUTCDate() + index * 7);
    } else {
      periodDate.setUTCMonth(periodDate.getUTCMonth() + index);
    }
    const key = periodDate.toISOString();
    series.push(
      byPeriod.get(key) ?? {
        periodStart: key,
        participants: 0,
        bookings: 0,
        workshops: 0,
        revenue: 0,
      }
    );
  }

  return series;
}

async function getAttendanceSeries(unit: 'week' | 'month', count: number): Promise<AttendancePoint[]> {
  const interval = unit === 'week' ? `${count - 1} weeks` : `${count - 1} months`;
  const result = await query(
    `SELECT date_trunc('${unit}', c.start_date_time) AS period_start,
            COALESCE(SUM(b.number_of_participants), 0)::int AS participants,
            COUNT(b.id)::int AS bookings,
            COUNT(DISTINCT c.id)::int AS workshops,
            COALESCE(SUM(b.total_amount), 0)::numeric AS revenue
     FROM bookings b
     INNER JOIN classes c ON c.id = b.class_id
     WHERE ${PAID_BOOKING_FILTER}
       AND c.start_date_time IS NOT NULL
       AND c.start_date_time >= date_trunc('${unit}', NOW()) - INTERVAL '${interval}'
       AND c.start_date_time < date_trunc('${unit}', NOW()) + INTERVAL '1 ${unit}'
     GROUP BY 1
     ORDER BY 1`
  );

  const startResult = await query(
    `SELECT date_trunc('${unit}', NOW()) - INTERVAL '${interval}' AS series_start`
  );
  const seriesStart = new Date(String(startResult.rows[0]?.series_start));

  return buildFilledSeries(result.rows, unit, count, seriesStart);
}

async function getTopWorkshops(days: number, limit: number): Promise<TopWorkshopRow[]> {
  const result = await query(
    `SELECT c.id, c.slug, c.title, c.title_ar, c.image, c.category, c.start_date_time,
            c.seats_total, c.seats_booked,
            COALESCE(SUM(b.number_of_participants), 0)::int AS participants,
            COUNT(b.id)::int AS bookings,
            COALESCE(SUM(b.total_amount), 0)::numeric AS revenue
     FROM bookings b
     INNER JOIN classes c ON c.id = b.class_id
     WHERE ${PAID_BOOKING_FILTER}
       AND b.created_at >= NOW() - make_interval(days => $1)
     GROUP BY c.id
     ORDER BY participants DESC, revenue DESC
     LIMIT $2`,
    [days, limit]
  );

  return result.rows.map((row) => ({
    classId: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    titleAr: row.title_ar ? String(row.title_ar) : null,
    image: row.image ? String(row.image) : null,
    category: String(row.category || 'COOKING'),
    startDateTime: row.start_date_time ? new Date(String(row.start_date_time)).toISOString() : null,
    seatsTotal: toNumber(row.seats_total),
    seatsBooked: toNumber(row.seats_booked),
    participants: toNumber(row.participants),
    bookings: toNumber(row.bookings),
    revenue: toNumber(row.revenue),
  }));
}

async function getMostRequestedWorkshops(limit: number): Promise<RequestedWorkshopRow[]> {
  try {
    const result = await query(
      `SELECT c.id, c.slug, c.title, c.title_ar, c.image,
              COUNT(r.id)::int AS requests_count,
              COUNT(r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days')::int AS requests_30d,
              MAX(r.created_at) AS last_requested_at
       FROM class_repeat_requests r
       INNER JOIN classes c ON c.id = r.class_id
       WHERE r.fulfilled_by_class_id IS NULL
       GROUP BY c.id
       ORDER BY requests_count DESC, last_requested_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => ({
      classId: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      titleAr: row.title_ar ? String(row.title_ar) : null,
      image: row.image ? String(row.image) : null,
      requestsCount: toNumber(row.requests_count),
      requestsLast30Days: toNumber(row.requests_30d),
      lastRequestedAt: row.last_requested_at ? new Date(String(row.last_requested_at)).toISOString() : null,
    }));
  } catch {
    // Repeat-requests table may not exist yet on fresh installs.
    return [];
  }
}

async function getReportsSummary(): Promise<WorkshopReportsSummary> {
  const result = await query(
    `SELECT
       COALESCE(SUM(b.number_of_participants) FILTER (
         WHERE c.start_date_time >= date_trunc('week', NOW())
           AND c.start_date_time < date_trunc('week', NOW()) + INTERVAL '1 week'
       ), 0)::int AS participants_this_week,
       COALESCE(SUM(b.number_of_participants) FILTER (
         WHERE c.start_date_time >= date_trunc('week', NOW()) - INTERVAL '1 week'
           AND c.start_date_time < date_trunc('week', NOW())
       ), 0)::int AS participants_last_week,
       COALESCE(SUM(b.number_of_participants) FILTER (
         WHERE c.start_date_time >= date_trunc('month', NOW())
           AND c.start_date_time < date_trunc('month', NOW()) + INTERVAL '1 month'
       ), 0)::int AS participants_this_month,
       COALESCE(SUM(b.number_of_participants) FILTER (
         WHERE c.start_date_time >= date_trunc('month', NOW()) - INTERVAL '1 month'
           AND c.start_date_time < date_trunc('month', NOW())
       ), 0)::int AS participants_last_month,
       COUNT(b.id) FILTER (
         WHERE c.start_date_time >= date_trunc('month', NOW())
           AND c.start_date_time < date_trunc('month', NOW()) + INTERVAL '1 month'
       )::int AS bookings_this_month,
       COALESCE(SUM(b.total_amount) FILTER (
         WHERE c.start_date_time >= date_trunc('month', NOW())
           AND c.start_date_time < date_trunc('month', NOW()) + INTERVAL '1 month'
       ), 0)::numeric AS revenue_this_month,
       COUNT(DISTINCT c.id) FILTER (
         WHERE c.start_date_time >= date_trunc('month', NOW())
           AND c.start_date_time < NOW()
       )::int AS workshops_held_this_month,
       COALESCE(SUM(b.number_of_participants) FILTER (WHERE c.start_date_time < NOW()), 0)::int AS total_participants,
       COUNT(DISTINCT c.id) FILTER (WHERE c.start_date_time < NOW())::int AS total_workshops_held
     FROM bookings b
     INNER JOIN classes c ON c.id = b.class_id
     WHERE ${PAID_BOOKING_FILTER}
       AND c.start_date_time IS NOT NULL`
  );

  const row = result.rows[0] ?? {};

  return {
    participantsThisWeek: toNumber(row.participants_this_week),
    participantsLastWeek: toNumber(row.participants_last_week),
    participantsThisMonth: toNumber(row.participants_this_month),
    participantsLastMonth: toNumber(row.participants_last_month),
    bookingsThisMonth: toNumber(row.bookings_this_month),
    revenueThisMonth: toNumber(row.revenue_this_month),
    workshopsHeldThisMonth: toNumber(row.workshops_held_this_month),
    totalParticipants: toNumber(row.total_participants),
    totalWorkshopsHeld: toNumber(row.total_workshops_held),
    currency: 'OMR',
  };
}

export async function getWorkshopReportsData(): Promise<WorkshopReportsData> {
  const [summary, weeklyAttendance, monthlyAttendance, topWorkshopsWeek, topWorkshopsMonth, mostRequested] =
    await Promise.all([
      getReportsSummary(),
      getAttendanceSeries('week', 12),
      getAttendanceSeries('month', 12),
      getTopWorkshops(7, 10),
      getTopWorkshops(30, 10),
      getMostRequestedWorkshops(10),
    ]);

  return {
    summary,
    weeklyAttendance,
    monthlyAttendance,
    topWorkshopsWeek,
    topWorkshopsMonth,
    mostRequested,
  };
}
