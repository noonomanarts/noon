'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import {
  IoArrowBack,
  IoCalendarOutline,
  IoCheckmarkCircle,
  IoCreateOutline,
  IoEyeOutline,
  IoGlobeOutline,
  IoImageOutline,
  IoPeopleOutline,
  IoPricetagOutline,
  IoRefresh,
  IoSparklesOutline,
  IoStar,
  IoTimeOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import ClassSettlementPanel from '@/components/admin/ClassSettlementPanel';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

type ClassStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

type TrainerInfo = {
  id: string;
  fullName: string;
  email?: string | null;
  profileImage?: string | null;
} | null;

type ReviewItem = {
  id: string;
  userId: string;
  rating: number | null;
  comment: string | null;
  isVerified: boolean;
  createdAt: string;
};

type ClassDetails = {
  id: string;
  slug: string;
  title: string;
  titleAr?: string | null;
  description: string;
  descriptionAr?: string | null;
  category: string;
  subCategory: string;
  image?: string | null;
  images: string[];
  trainerId: string;
  trainer?: TrainerInfo;
  price: number;
  currency: string;
  seatsTotal: number;
  seatsAvailable: number;
  durationMinutes: number;
  status: ClassStatus;
  trainerSharePercent: number;
  noonSharePercent: number;
  expenseSharePercent: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  closedAt?: string | null;
  closedByUserId?: string | null;
  reviews?: ReviewItem[];
  _count?: {
    bookings: number;
    sessions: number;
  };
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

function statusClasses(status: ClassStatus) {
  switch (status) {
    case 'PUBLISHED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300';
    case 'COMPLETED':
      return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300';
    case 'CANCELLED':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300';
  }
}

function formatSubCategory(value: string, isArabic: boolean) {
  const labels: Record<string, { en: string; ar: string }> = {
    APPETIZERS_SNACKS: { en: 'Appetizers & Snacks', ar: 'المقبلات والوجبات الخفيفة' },
    MAIN_DISHES: { en: 'Main Dishes', ar: 'الأطباق الرئيسية' },
    DESSERTS_BAKING: { en: 'Desserts & Baking', ar: 'الحلويات والمخبوزات' },
    MOM_AND_KID: { en: 'Mom & Kid', ar: 'الأم والطفل' },
    PAINTING: { en: 'Painting', ar: 'الرسم' },
    CRAFTS: { en: 'Crafts', ar: 'الأشغال اليدوية' },
    POTTERY: { en: 'Pottery', ar: 'الفخار' },
    MIXED: { en: 'Mixed', ar: 'متنوع' },
  };

  const label = labels[value];
  return label ? (isArabic ? label.ar : label.en) : value.replaceAll('_', ' ');
}

function formatCategory(value: string, isArabic: boolean) {
  if (value === 'COOKING') return isArabic ? 'الطبخ' : 'Cooking';
  if (value === 'ARTS_CRAFTS') return isArabic ? 'الفنون والأشغال' : 'Arts & Crafts';
  return value;
}

function formatStatus(value: ClassStatus, isArabic: boolean) {
  const labels: Record<ClassStatus, { en: string; ar: string }> = {
    DRAFT: { en: 'Draft', ar: 'مسودة' },
    PUBLISHED: { en: 'Published', ar: 'منشور' },
    CANCELLED: { en: 'Cancelled', ar: 'ملغي' },
    COMPLETED: { en: 'Completed', ar: 'مكتمل' },
  };
  return isArabic ? labels[value].ar : labels[value].en;
}

function formatDateTime(value: string | null | undefined, localeCode: string) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(localeCode, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDate(value: string | null | undefined, localeCode: string) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(localeCode, {
    dateStyle: 'medium',
  }).format(date);
}

export default function AdminClassDetailsPage({
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
  const [error, setError] = useState<string | null>(null);
  const [secondaryError, setSecondaryError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const t = {
    back: isArabic ? 'الرجوع للصفوف' : 'Back to classes',
    title: isArabic ? 'تفاصيل الصف' : 'Class Details',
    subtitle: isArabic
      ? 'لوحة تشغيل كاملة لمراجعة المحتوى، الجلسات، الحجوزات، وحالة النشر.'
      : 'A complete operations view for content, sessions, bookings, and publishing status.',
    edit: isArabic ? 'تعديل الصف' : 'Edit class',
    sessions: isArabic ? 'إدارة الجلسات' : 'Manage sessions',
    calendar: isArabic ? 'عرض التقويم' : 'Open calendar',
    publicPage: isArabic ? 'الصفحة العامة' : 'Public page',
    publish: isArabic ? 'نشر الصف' : 'Publish class',
    moveToDraft: isArabic ? 'إرجاع إلى مسودة' : 'Move to draft',
    loading: isArabic ? 'جاري تحميل تفاصيل الصف...' : 'Loading class details...',
    notFound: isArabic ? 'تعذر العثور على هذا الصف.' : 'This class could not be found.',
    overview: isArabic ? 'نظرة عامة' : 'Overview',
    media: isArabic ? 'الصور' : 'Media',
    trainer: isArabic ? 'المدرب' : 'Trainer',
    schedule: isArabic ? 'الجدول والجلسات' : 'Schedule & Sessions',
    reviews: isArabic ? 'التقييمات' : 'Reviews',
    meta: isArabic ? 'بيانات النشر' : 'Publishing Data',
    noImage: isArabic ? 'لا توجد صورة رئيسية' : 'No main image uploaded',
    noGallery: isArabic ? 'لا توجد صور إضافية' : 'No gallery images yet',
    noSessions: isArabic ? 'لا توجد جلسات مرتبطة بهذا الصف حالياً.' : 'No sessions are attached to this class yet.',
    noReviews: isArabic ? 'لا توجد تقييمات مرئية لهذا الصف بعد.' : 'No visible reviews for this class yet.',
    noTrainer: isArabic ? 'لم يتم ربط مدرب بعد.' : 'No trainer assigned yet.',
    retry: isArabic ? 'إعادة التحميل' : 'Reload',
    sessionsLoadError: isArabic ? 'تعذر تحميل تفاصيل الجلسات، لكن بيانات الصف متاحة.' : 'Session details could not be loaded, but the class data is available.',
    nextSession: isArabic ? 'أقرب جلسة' : 'Next session',
    latestSession: isArabic ? 'آخر جلسة' : 'Latest session',
    bookings: isArabic ? 'الحجوزات' : 'Bookings',
    totalSessions: isArabic ? 'عدد الجلسات' : 'Total sessions',
    upcomingSessions: isArabic ? 'الجلسات القادمة' : 'Upcoming sessions',
    averageRating: isArabic ? 'متوسط التقييم' : 'Average rating',
    category: isArabic ? 'التصنيف' : 'Category',
    subCategory: isArabic ? 'التصنيف الفرعي' : 'Sub-category',
    duration: isArabic ? 'المدة' : 'Duration',
    seats: isArabic ? 'المقاعد' : 'Seats',
    availability: isArabic ? 'المتاح' : 'Available',
    price: isArabic ? 'السعر' : 'Price',
    status: isArabic ? 'الحالة' : 'Status',
    createdAt: isArabic ? 'تاريخ الإنشاء' : 'Created',
    updatedAt: isArabic ? 'آخر تحديث' : 'Last updated',
    publishedAt: isArabic ? 'تاريخ النشر' : 'Published',
    slug: isArabic ? 'الرابط المختصر' : 'Slug',
    metaTitle: isArabic ? 'عنوان SEO' : 'Meta title',
    metaDescription: isArabic ? 'وصف SEO' : 'Meta description',
    englishContent: isArabic ? 'المحتوى الإنجليزي' : 'English content',
    arabicContent: isArabic ? 'المحتوى العربي' : 'Arabic content',
    occupancy: isArabic ? 'الإشغال' : 'Occupancy',
    sessionCapacity: isArabic ? 'سعة الجلسة' : 'Session capacity',
    sessionBookings: isArabic ? 'الحجوزات المؤكدة' : 'Reserved seats',
    calendarStatus: isArabic ? 'التقويم' : 'Calendar',
    linked: isArabic ? 'مرتبط' : 'Linked',
    notLinked: isArabic ? 'غير مرتبط' : 'Not linked',
    verified: isArabic ? 'موثق' : 'Verified',
    anonymousCustomer: isArabic ? 'عميل' : 'Customer',
    publishingHint: isArabic
      ? 'إذا كان الصف منشوراً بدون جلسات، فلن يظهر أي موعد قابل للحجز في الواجهة العامة.'
      : 'If a class is published without sessions, no bookable slot will appear on the public site.',
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setSecondaryError(null);

    try {
      const [classResponse, sessionsResponse] = await Promise.all([
        fetch(`/api/admin/classes/${classId}`, { cache: 'no-store' }),
        fetch(`/api/admin/classes/${classId}/sessions`, { cache: 'no-store' }),
      ]);

      const classPayload = (await classResponse.json().catch(() => ({}))) as ClassDetails & { error?: string };
      if (!classResponse.ok) {
        throw new Error(classPayload.error || t.notFound);
      }

      setClassData(classPayload);

      const sessionsPayload = (await sessionsResponse.json().catch(() => [])) as SessionItem[] | { error?: string };
      if (!sessionsResponse.ok || !Array.isArray(sessionsPayload)) {
        setSessions([]);
        setSecondaryError(
          !Array.isArray(sessionsPayload) && sessionsPayload.error ? sessionsPayload.error : t.sessionsLoadError
        );
      } else {
        setSessions(sessionsPayload);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.notFound);
      setClassData(null);
      setSessions([]);
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

  const reviewAverage = useMemo(() => {
    if (!classData?.reviews?.length) return null;
    const ratings = classData.reviews.map((review) => review.rating).filter((rating): rating is number => typeof rating === 'number');
    if (ratings.length === 0) return null;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }, [classData?.reviews]);

  const now = Date.now();
  const upcomingSessions = orderedSessions.filter((session) => !session.isCancelled && new Date(session.startTime).getTime() >= now);
  const pastSessions = orderedSessions.filter((session) => new Date(session.startTime).getTime() < now);
  const featuredSession = upcomingSessions[0] ?? orderedSessions[orderedSessions.length - 1] ?? null;

  const formatMoney = (amount: number, currency: string) => formatAmountWithCurrency(amount, currency);

  const handleStatusChange = async (nextStatus: 'PUBLISHED' | 'DRAFT') => {
    setStatusLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/classes/${classId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json().catch(() => ({}))) as ClassDetails & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update status');
      }

      setClassData((current) => (current ? { ...current, status: payload.status, publishedAt: payload.publishedAt } : current));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-16 text-zinc-600 dark:text-zinc-400">
        {t.loading}
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/40 dark:bg-rose-900/20">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error || t.notFound}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <IoRefresh className="h-4 w-4" />
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  const displayTitle = isArabic && classData.titleAr ? classData.titleAr : classData.title;
  const displayDescription = isArabic && classData.descriptionAr ? classData.descriptionAr : classData.description;
  const reviewCount = classData.reviews?.length ?? 0;
  const bookingsCount = classData._count?.bookings ?? 0;
  const sessionsCount = classData._count?.sessions ?? orderedSessions.length;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--noon-teal)_14%,white),white_55%,color-mix(in_oklab,var(--noon-teal-strong)_10%,white))] p-6 dark:bg-[linear-gradient(135deg,rgba(23,176,173,0.16),rgba(9,15,20,0.9))] md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <Link
                href={`/${locale}/admin/classes`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                <IoArrowBack className="h-4 w-4" />
                {t.back}
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(classData.status)}`}>
                  {formatStatus(classData.status, isArabic)}
                </span>
                <span className="inline-flex rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
                  {formatCategory(classData.category, isArabic)}
                </span>
                <span className="inline-flex rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-300">
                  {formatSubCategory(classData.subCategory, isArabic)}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-4xl">
                {displayTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{displayDescription}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
            </div>

            <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[240px]">
              <Link
                href={`/${locale}/admin/classes/${classId}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <IoCreateOutline className="h-4 w-4" />
                {t.edit}
              </Link>
              <Link
                href={`/${locale}/admin/classes/${classId}/sessions`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <IoCalendarOutline className="h-4 w-4" />
                {t.sessions}
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/${locale}/admin/calendar`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--noon-teal)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
                >
                  <IoGlobeOutline className="h-4 w-4" />
                  {t.calendar}
                </Link>
                <Link
                  href={`/${locale}/classes/${classData.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  target="_blank"
                >
                  <IoEyeOutline className="h-4 w-4" />
                  {t.publicPage}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => void handleStatusChange(classData.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
                disabled={statusLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-[color:var(--noon-teal)]/10 px-4 py-3 text-sm font-semibold text-[color:var(--noon-teal-strong)] transition hover:bg-[color:var(--noon-teal)]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[color:var(--noon-teal)]/15"
              >
                <IoCheckmarkCircle className="h-4 w-4" />
                {classData.status === 'PUBLISHED' ? t.moveToDraft : t.publish}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {secondaryError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          {secondaryError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t.bookings}</span>
            <IoPeopleOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{bookingsCount}</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t.totalSessions}</span>
            <IoCalendarOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{sessionsCount}</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t.upcomingSessions}</span>
            <IoTimeOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{upcomingSessions.length}</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t.averageRating}</span>
            <IoStar className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {reviewAverage ? reviewAverage.toFixed(1) : '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--noon-teal)]/10 text-[color:var(--noon-teal)]">
                <IoSparklesOutline className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.overview}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{displayTitle}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">{t.englishContent}</p>
                <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">{classData.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600 dark:text-zinc-300">{classData.description}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">{t.arabicContent}</p>
                <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">{classData.titleAr || '—'}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-600 dark:text-zinc-300">{classData.descriptionAr || '—'}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.category}</p>
                <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{formatCategory(classData.category, isArabic)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.subCategory}</p>
                <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{formatSubCategory(classData.subCategory, isArabic)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.duration}</p>
                <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{classData.durationMinutes} min</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.price}</p>
                <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(classData.price, classData.currency)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.seats}</p>
                <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{classData.seatsTotal}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.availability}</p>
                <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{classData.seatsAvailable}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.createdAt}</p>
                <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(classData.createdAt, localeCode)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.updatedAt}</p>
                <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(classData.updatedAt, localeCode)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.schedule}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.publishingHint}</p>
              </div>
              <Link
                href={`/${locale}/admin/classes/${classId}/sessions`}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <IoCalendarOutline className="h-4 w-4" />
                {t.sessions}
              </Link>
            </div>

            {featuredSession ? (
              <div className="mt-5 rounded-3xl border border-[color:var(--noon-teal)]/20 bg-[color:var(--noon-teal)]/5 p-5 dark:bg-[color:var(--noon-teal)]/10">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--noon-teal-strong)]">
                  {upcomingSessions.length > 0 ? t.nextSession : t.latestSession}
                </p>
                <p className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatDateTime(featuredSession.startTime, localeCode)}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 p-4 dark:bg-zinc-950/60">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.sessionCapacity}</p>
                    <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{featuredSession.seatsTotal ?? classData.seatsTotal}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 dark:bg-zinc-950/60">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.sessionBookings}</p>
                    <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{featuredSession.seatsBooked}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 dark:bg-zinc-950/60">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.calendarStatus}</p>
                    <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">
                      {featuredSession.calendarEvent ? t.linked : t.notLinked}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {orderedSessions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.noSessions}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {orderedSessions.slice(0, 6).map((session) => {
                  const sessionCapacity = session.seatsTotal ?? classData.seatsTotal;
                  const occupancy = sessionCapacity > 0 ? Math.round((session.seatsBooked / sessionCapacity) * 100) : 0;

                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-zinc-200 p-4 transition hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatDateTime(session.startTime, localeCode)}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {formatDateTime(session.endTime, localeCode)}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.sessionBookings}</p>
                            <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{session.seatsBooked}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.availability}</p>
                            <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{session.seatsAvailable}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{t.occupancy}</p>
                            <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{occupancy}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <IoStar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.reviews}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {reviewCount} {isArabic ? 'تقييم مرئي' : 'visible reviews'}
                </p>
              </div>
            </div>

            {reviewCount === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.noReviews}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {classData.reviews?.slice(0, 5).map((review) => (
                  <div key={review.id} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.anonymousCustomer}</p>
                          {review.isVerified ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {t.verified}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{formatDate(review.createdAt, localeCode)}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                        <IoStar className="h-4 w-4" />
                        {review.rating ?? '—'}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{review.comment || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--noon-teal)]/10 text-[color:var(--noon-teal)]">
                <IoImageOutline className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.media}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{(classData.images?.length ?? 0) + (classData.image ? 1 : 0)} assets</p>
              </div>
            </div>

            {classData.image ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <img src={classData.image} alt={classData.title} className="aspect-square w-full object-cover" />
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.noImage}
              </div>
            )}

            {classData.images?.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {classData.images.slice(0, 4).map((image, index) => (
                  <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <img src={image} alt={`${classData.title} ${index + 1}`} className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noGallery}</p>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--noon-teal)]/10 text-[color:var(--noon-teal)]">
                <IoPeopleOutline className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.trainer}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{classData.trainer?.email || t.noTrainer}</p>
              </div>
            </div>

            {classData.trainer ? (
              <div className="mt-5 rounded-3xl border border-zinc-200 p-5 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  {classData.trainer.profileImage ? (
                    <img
                      src={classData.trainer.profileImage}
                      alt={classData.trainer.fullName}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-lg font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {classData.trainer.fullName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{classData.trainer.fullName}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{classData.trainer.email || '—'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.noTrainer}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <IoPricetagOutline className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t.meta}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.slug}</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.slug}</p>
                <p className="mt-2 break-all font-semibold text-zinc-900 dark:text-zinc-100">{classData.slug}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.metaTitle}</p>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{classData.metaTitle || '—'}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.metaDescription}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{classData.metaDescription || '—'}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{t.publishedAt}</p>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDateTime(classData.publishedAt, localeCode)}</p>
              </div>
            </div>

            {classData.status === 'PUBLISHED' && upcomingSessions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <IoWarningOutline className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t.publishingHint}</span>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <ClassSettlementPanel
        classId={classId}
        locale={locale}
        classStatus={classData.status}
        onClosed={async () => {
          await loadData();
        }}
      />
    </div>
  );
}
