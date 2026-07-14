'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiCalendar, FiRefreshCw, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { formatAmountWithCurrency, formatPlainNumber } from '@/lib/formatNumber';
import type { WorkshopReportsData, AttendancePoint, TopWorkshopRow } from '@/lib/db/reports';

type PeriodMode = 'weekly' | 'monthly';

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid #e4e4e7',
  background: '#ffffff',
  fontSize: '12px',
} as const;

function formatPeriodLabel(iso: string, mode: PeriodMode, localeCode: string): string {
  const date = new Date(iso);
  if (mode === 'weekly') {
    return date.toLocaleDateString(localeCode, { month: 'short', day: 'numeric', timeZone: 'Asia/Muscat' });
  }
  return date.toLocaleDateString(localeCode, { month: 'short', year: '2-digit', timeZone: 'Asia/Muscat' });
}

function TrendBadge({ current, previous, isArabic }: { current: number; previous: number; isArabic: boolean }) {
  if (previous <= 0 && current <= 0) return null;
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : 100;
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        up
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
          : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
      <span className="font-normal text-[10px] opacity-80">{isArabic ? 'مقارنة بالفترة السابقة' : 'vs previous'}</span>
    </span>
  );
}

export default function AdminReportsPageClient({
  locale,
  data,
}: {
  locale: string;
  data: WorkshopReportsData;
}) {
  const isArabic = locale === 'ar';
  const localeCode = isArabic ? 'ar-OM-u-nu-latn' : 'en-OM';
  const [attendanceMode, setAttendanceMode] = useState<PeriodMode>('weekly');
  const [topMode, setTopMode] = useState<'week' | 'month'>('month');

  const t = {
    title: isArabic ? 'التقارير' : 'Reports',
    subtitle: isArabic
      ? 'نظرة تحليلية على أداء الورش: الحضور، الإقبال، والاتجاهات عبر الوقت.'
      : 'Analytics on workshop performance: attendance, demand, and trends over time.',
    weekly: isArabic ? 'أسبوعي' : 'Weekly',
    monthly: isArabic ? 'شهري' : 'Monthly',
    last7: isArabic ? 'آخر 7 أيام' : 'Last 7 days',
    last30: isArabic ? 'آخر 30 يوم' : 'Last 30 days',
    participantsThisWeek: isArabic ? 'الحضور هذا الأسبوع' : 'Attendees This Week',
    participantsThisMonth: isArabic ? 'الحضور هذا الشهر' : 'Attendees This Month',
    workshopsThisMonth: isArabic ? 'ورش أُقيمت هذا الشهر' : 'Workshops Held This Month',
    revenueThisMonth: isArabic ? 'إيراد الورش هذا الشهر' : 'Workshop Revenue This Month',
    totalParticipants: isArabic ? 'إجمالي الحضور (كل الفترات)' : 'Total Attendees (all time)',
    totalWorkshops: isArabic ? 'إجمالي الورش المقامة' : 'Total Workshops Held',
    attendanceTrends: isArabic ? 'اتجاهات الحضور' : 'Attendance Trends',
    attendanceTrendsHint: isArabic
      ? 'عدد المشاركين في الورش حسب تاريخ إقامة الورشة (حجوزات مدفوعة فقط).'
      : 'Participants per period based on the workshop date (paid bookings only).',
    participants: isArabic ? 'المشاركون' : 'Participants',
    bookings: isArabic ? 'الحجوزات' : 'Bookings',
    workshops: isArabic ? 'الورش' : 'Workshops',
    revenue: isArabic ? 'الإيراد' : 'Revenue',
    topWorkshops: isArabic ? 'الورش الأكثر رواجاً' : 'Most Popular Workshops',
    topWorkshopsHint: isArabic
      ? 'حسب عدد المقاعد المحجوزة والمدفوعة خلال الفترة المحددة.'
      : 'Ranked by paid seats booked during the selected period.',
    seatsFilled: isArabic ? 'الإشغال' : 'Occupancy',
    mostRequested: isArabic ? 'الورش الأكثر طلباً للإعادة' : 'Most Requested Workshops',
    mostRequestedHint: isArabic
      ? 'طلبات العملاء لإعادة ورش سابقة لم تتم إعادتها بعد.'
      : 'Customer requests to repeat past workshops that have not been rescheduled yet.',
    requestsTotal: isArabic ? 'إجمالي الطلبات' : 'Total requests',
    requests30: isArabic ? 'آخر 30 يوم' : 'Last 30 days',
    lastRequested: isArabic ? 'آخر طلب' : 'Last requested',
    noData: isArabic ? 'لا توجد بيانات لهذه الفترة بعد.' : 'No data for this period yet.',
    workshop: isArabic ? 'الورشة' : 'Workshop',
    date: isArabic ? 'التاريخ' : 'Date',
  };

  const attendanceSeries: AttendancePoint[] =
    attendanceMode === 'weekly' ? data.weeklyAttendance : data.monthlyAttendance;

  const chartData = useMemo(
    () =>
      attendanceSeries.map((point) => ({
        ...point,
        label: formatPeriodLabel(point.periodStart, attendanceMode, localeCode),
      })),
    [attendanceSeries, attendanceMode, localeCode]
  );

  const hasAttendanceData = attendanceSeries.some((point) => point.participants > 0 || point.bookings > 0);

  const topWorkshops: TopWorkshopRow[] = topMode === 'week' ? data.topWorkshopsWeek : data.topWorkshopsMonth;

  const summaryCards = [
    {
      label: t.participantsThisWeek,
      value: formatPlainNumber(data.summary.participantsThisWeek),
      icon: <FiUsers className="size-4" />,
      badge: (
        <TrendBadge
          current={data.summary.participantsThisWeek}
          previous={data.summary.participantsLastWeek}
          isArabic={isArabic}
        />
      ),
    },
    {
      label: t.participantsThisMonth,
      value: formatPlainNumber(data.summary.participantsThisMonth),
      icon: <FiUsers className="size-4" />,
      badge: (
        <TrendBadge
          current={data.summary.participantsThisMonth}
          previous={data.summary.participantsLastMonth}
          isArabic={isArabic}
        />
      ),
    },
    {
      label: t.workshopsThisMonth,
      value: formatPlainNumber(data.summary.workshopsHeldThisMonth),
      icon: <FiCalendar className="size-4" />,
      badge: null,
    },
    {
      label: t.revenueThisMonth,
      value: formatAmountWithCurrency(data.summary.revenueThisMonth, data.summary.currency),
      icon: <FiTrendingUp className="size-4" />,
      badge: null,
    },
    {
      label: t.totalParticipants,
      value: formatPlainNumber(data.summary.totalParticipants),
      icon: <FiUsers className="size-4" />,
      badge: null,
    },
    {
      label: t.totalWorkshops,
      value: formatPlainNumber(data.summary.totalWorkshopsHeld),
      icon: <FiCalendar className="size-4" />,
      badge: null,
    },
  ];

  const periodToggle = (
    <div className="inline-flex rounded-xl border border-zinc-200 p-1 dark:border-zinc-700">
      {(['weekly', 'monthly'] as PeriodMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setAttendanceMode(mode)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            attendanceMode === mode
              ? 'bg-[color:var(--noon-teal)] text-white'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          {mode === 'weekly' ? t.weekly : t.monthly}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[color:var(--noon-teal-soft)] text-[color:var(--noon-teal)]">
                {card.icon}
              </span>
              <span className="text-[11px] font-medium leading-tight">{card.label}</span>
            </div>
            <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
            {card.badge ? <div className="mt-1">{card.badge}</div> : null}
          </div>
        ))}
      </div>

      {/* Attendance trends */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.attendanceTrends}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.attendanceTrendsHint}</p>
          </div>
          {periodToggle}
        </div>

        <div className="mt-4 h-[280px]" dir="ltr">
          {hasAttendanceData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="participantsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="participants"
                  name={t.participants}
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fill="url(#participantsFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">{t.noData}</div>
          )}
        </div>

        {/* Bookings per period bar chart */}
        <div className="mt-4 h-[180px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="bookings" name={t.bookings} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="workshops" name={t.workshops} fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Most popular workshops */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.topWorkshops}</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.topWorkshopsHint}</p>
            </div>
            <div className="inline-flex rounded-xl border border-zinc-200 p-1 dark:border-zinc-700">
              {(['week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTopMode(mode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    topMode === mode
                      ? 'bg-[color:var(--noon-teal)] text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {mode === 'week' ? t.last7 : t.last30}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {topWorkshops.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">{t.noData}</p>
            ) : (
              topWorkshops.map((workshop, index) => {
                const occupancy =
                  workshop.seatsTotal > 0
                    ? Math.min(100, Math.round((workshop.seatsBooked / workshop.seatsTotal) * 100))
                    : 0;
                return (
                  <Link
                    key={workshop.classId}
                    href={`/${locale}/admin/classes/${workshop.classId}`}
                    className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                  >
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-zinc-400">{index + 1}</span>
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {workshop.image ? (
                        <Image src={workshop.image} alt="" fill sizes="44px" className="object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {isArabic && workshop.titleAr ? workshop.titleAr : workshop.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {workshop.bookings} {t.bookings.toLowerCase()} · {t.seatsFilled} {occupancy}%
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[color:var(--noon-teal-strong)] dark:text-teal-300">
                        {formatPlainNumber(workshop.participants)} <span className="text-[10px] font-medium text-zinc-400">{t.participants}</span>
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatAmountWithCurrency(workshop.revenue, data.summary.currency)}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Most requested workshops */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
              <FiRefreshCw className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{t.mostRequested}</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t.mostRequestedHint}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {data.mostRequested.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">{t.noData}</p>
            ) : (
              data.mostRequested.map((workshop, index) => (
                <Link
                  key={workshop.classId}
                  href={`/${locale}/admin/classes/${workshop.classId}`}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                >
                  <span className="w-5 shrink-0 text-center text-sm font-bold text-zinc-400">{index + 1}</span>
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {workshop.image ? (
                      <Image src={workshop.image} alt="" fill sizes="44px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {isArabic && workshop.titleAr ? workshop.titleAr : workshop.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {t.requests30}: {workshop.requestsLast30Days}
                      {workshop.lastRequestedAt
                        ? ` · ${t.lastRequested}: ${new Date(workshop.lastRequestedAt).toLocaleDateString(localeCode, {
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'Asia/Muscat',
                          })}`
                        : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-300">
                      {formatPlainNumber(workshop.requestsCount)}
                    </p>
                    <p className="text-[10px] font-medium text-zinc-400">{t.requestsTotal}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
