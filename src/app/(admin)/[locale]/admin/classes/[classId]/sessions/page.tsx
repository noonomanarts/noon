'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import {
  IoAdd,
  IoAlertCircle,
  IoArrowBack,
  IoCalendar,
  IoCheckmarkCircle,
  IoPeople,
  IoTime,
} from 'react-icons/io5';

type ClassDetails = {
  id: string;
  title: string;
  titleAr?: string | null;
  category: string;
  price: number;
  currency: string;
  seatsTotal: number;
  durationMinutes: number;
  status: string;
  trainer?: {
    fullName: string;
  } | null;
};

type SessionItem = {
  id: string;
  classId: string;
  startTime: string;
  endTime: string | null;
  seatsTotal: number | null;
  seatsBooked: number;
  seatsAvailable: number;
  isCancelled: boolean;
  bookings?: Array<{
    id: string;
    status: string;
    numberOfParticipants: number;
  }>;
  calendarEvent?: {
    id: string;
    type: string;
    startDateTime: string;
    endDateTime: string;
  } | null;
};

type CreateForm = {
  startDate: string;
  startTime: string;
  endTime: string;
  seatsTotal: string;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDefaultForm(durationMinutes: number, seatsTotal: number): CreateForm {
  const now = new Date();
  const rounded = new Date(now.getTime());
  rounded.setMinutes(0, 0, 0);
  rounded.setHours(Math.max(9, rounded.getHours() + 1));
  const end = new Date(rounded.getTime() + durationMinutes * 60_000);

  return {
    startDate: toDateInputValue(rounded),
    startTime: `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`,
    endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
    seatsTotal: String(seatsTotal),
  };
}

export default function AdminClassSessionsPage({
  params,
}: {
  params: Promise<{ locale: string; classId: string }>;
}) {
  const { locale, classId } = use(params);
  const isArabic = locale === 'ar';
  const localeCode = isArabic ? 'ar-OM' : 'en-OM';

  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(buildDefaultForm(120, 12));

  const t = {
    title: isArabic ? 'إدارة جلسات الصف' : 'Manage Class Sessions',
    subtitle: isArabic
      ? 'من هنا تضيف الجلسات الفعلية للصف، وكل جلسة تُحجز مباشرة على التقويم.'
      : 'Create the actual class sessions here. Every session immediately reserves its time on the calendar.',
    back: isArabic ? 'الرجوع للصفوف' : 'Back to classes',
    classInfo: isArabic ? 'معلومات الصف' : 'Class overview',
    scheduleForm: isArabic ? 'إضافة جلسة جديدة' : 'Create new session',
    existingSessions: isArabic ? 'الجلسات الحالية' : 'Existing sessions',
    startDate: isArabic ? 'تاريخ الجلسة' : 'Session date',
    startTime: isArabic ? 'وقت البداية' : 'Start time',
    endTime: isArabic ? 'وقت النهاية' : 'End time',
    seatsTotal: isArabic ? 'عدد المقاعد' : 'Total seats',
    create: isArabic ? 'إضافة الجلسة' : 'Create session',
    creating: isArabic ? 'جاري الإضافة...' : 'Creating...',
    trainer: isArabic ? 'المدرب' : 'Trainer',
    duration: isArabic ? 'المدة' : 'Duration',
    status: isArabic ? 'الحالة' : 'Status',
    bookings: isArabic ? 'الحجوزات' : 'Bookings',
    calendar: isArabic ? 'التقويم' : 'Calendar',
    noSessions: isArabic ? 'لا توجد جلسات لهذا الصف بعد.' : 'No sessions have been created for this class yet.',
    seatsLeft: isArabic ? 'مقاعد متبقية' : 'seats left',
    cancelled: isArabic ? 'ملغاة' : 'Cancelled',
    active: isArabic ? 'نشطة' : 'Active',
    conflictTitle: isArabic ? 'هذا الوقت مستخدم بالفعل في التقويم.' : 'This slot is already occupied on the calendar.',
    publishedHint: isArabic
      ? 'يفضل نشر الصف أولاً ثم تعريف الجلسات المتاحة للحجز.'
      : 'Prefer publishing the class before creating public sessions.',
    sessionSaved: isArabic ? 'تمت إضافة الجلسة بنجاح.' : 'Session created successfully.',
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [classResponse, sessionsResponse] = await Promise.all([
        fetch(`/api/admin/classes/${classId}`, { cache: 'no-store' }),
        fetch(`/api/admin/classes/${classId}/sessions`, { cache: 'no-store' }),
      ]);

      const classPayload = (await classResponse.json().catch(() => ({}))) as ClassDetails & { error?: string };
      const sessionsPayload = (await sessionsResponse.json().catch(() => [])) as SessionItem[] | { error?: string };

      if (!classResponse.ok) {
        throw new Error(classPayload.error || 'Failed to load class details');
      }

      if (!sessionsResponse.ok || !Array.isArray(sessionsPayload)) {
        throw new Error(!Array.isArray(sessionsPayload) && sessionsPayload.error ? sessionsPayload.error : 'Failed to load sessions');
      }

      setClassData(classPayload);
      setSessions(sessionsPayload);
      setForm(buildDefaultForm(classPayload.durationMinutes, classPayload.seatsTotal));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [classId]);

  const orderedSessions = useMemo(
    () => [...sessions].sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()),
    [sessions]
  );

  const handleCreateSession = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const startDateTime = `${form.startDate}T${form.startTime}:00+04:00`;
      const endDateTime = `${form.startDate}T${form.endTime}:00+04:00`;
      const response = await fetch(`/api/admin/classes/${classId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDateTime,
          endDateTime,
          seatsTotal: Number(form.seatsTotal),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        conflicts?: Array<{ title: string; startDateTime: string; endDateTime: string }>;
      };

      if (!response.ok) {
        const conflictMessage =
          Array.isArray(payload.conflicts) && payload.conflicts.length > 0
            ? `${t.conflictTitle} ${payload.conflicts[0].title} (${new Date(payload.conflicts[0].startDateTime).toLocaleString(localeCode)})`
            : payload.error;
        throw new Error(conflictMessage || 'Failed to create session');
      }

      setSuccess(t.sessionSaved);
      if (classData) {
        setForm(buildDefaultForm(classData.durationMinutes, classData.seatsTotal));
      }
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-600 dark:text-zinc-400">
        {isArabic ? 'جاري تحميل الجلسات...' : 'Loading sessions...'}
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error || (isArabic ? 'الصف غير موجود.' : 'Class was not found.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href={`/${locale}/admin/classes`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <IoArrowBack className="h-4 w-4" />
            {t.back}
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{t.title}</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${locale}/admin/classes/${classId}/edit`}
            className="inline-flex items-center rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {isArabic ? 'تعديل الصف' : 'Edit class'}
          </Link>
          <Link
            href={`/${locale}/admin/calendar`}
            className="inline-flex items-center rounded-xl bg-[color:var(--noon-teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {isArabic ? 'عرض التقويم' : 'Open calendar'}
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.classInfo}</h2>
          <div className="mt-5 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{isArabic ? 'اسم الصف' : 'Class title'}</p>
              <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {isArabic && classData.titleAr ? classData.titleAr : classData.title}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.trainer}</p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{classData.trainer?.fullName || '-'}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.duration}</p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{classData.durationMinutes} min</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.seatsTotal}</p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{classData.seatsTotal}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/40">
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.status}</p>
                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{classData.status}</p>
              </div>
            </div>
            {classData.status !== 'PUBLISHED' ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                {t.publishedHint}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.scheduleForm}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.startDate}</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.seatsTotal}</span>
              <input
                type="number"
                min="1"
                value={form.seatsTotal}
                onChange={(event) => setForm((prev) => ({ ...prev, seatsTotal: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.startTime}</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{t.endTime}</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleCreateSession()}
            disabled={submitting}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <IoAdd className="h-4 w-4" />
            {submitting ? t.creating : t.create}
          </button>
        </section>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.existingSessions}</h2>
          <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {orderedSessions.length}
          </span>
        </div>

        {orderedSessions.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {t.noSessions}
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {orderedSessions.map((session) => {
              const bookingsCount = session.bookings?.length ?? 0;
              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-zinc-200 p-5 dark:border-zinc-800"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          <IoCalendar className="h-3.5 w-3.5" />
                          {new Date(session.startTime).toLocaleDateString(localeCode, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                            session.isCancelled
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          }`}
                        >
                          {session.isCancelled ? t.cancelled : t.active}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                        <span className="inline-flex items-center gap-2">
                          <IoTime className="h-4 w-4" />
                          {new Date(session.startTime).toLocaleTimeString(localeCode, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {session.endTime
                            ? new Date(session.endTime).toLocaleTimeString(localeCode, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--'}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <IoPeople className="h-4 w-4" />
                          {session.seatsAvailable} {t.seatsLeft}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <IoCheckmarkCircle className="h-4 w-4" />
                          {bookingsCount} {t.bookings}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-300">
                      <p><strong>{t.calendar}:</strong> {session.calendarEvent?.type || 'CLASS'}</p>
                      <p className="mt-1">
                        {session.seatsBooked}/{session.seatsTotal ?? classData.seatsTotal} {isArabic ? 'محجوز' : 'booked'}
                      </p>
                    </div>
                  </div>

                  {bookingsCount > 0 ? (
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {t.bookings}
                      </p>
                      <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                        {session.bookings?.map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between gap-3">
                            <span>{booking.numberOfParticipants} {isArabic ? 'مشارك' : 'participants'}</span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                              {booking.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300">
        <div className="flex items-start gap-3">
          <IoAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {isArabic
              ? 'كل جلسة تُضاف من هنا تُسجَّل تلقائياً في التقويم. إذا كان الوقت متعارضاً مع فعالية أو block أو cleaning فسيتم رفض الإنشاء.'
              : 'Every session created here is automatically written to the calendar. If the slot conflicts with an event, block, or cleaning window, creation is rejected.'}
          </p>
        </div>
      </div>
    </div>
  );
}
