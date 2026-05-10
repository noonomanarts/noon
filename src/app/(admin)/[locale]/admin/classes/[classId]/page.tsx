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
  IoWalletOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import AdminRenewClassButton from '@/components/admin/AdminRenewClassButton';
import ClassSettlementPanel from '@/components/admin/ClassSettlementPanel';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import { formatDurationClock } from '@/lib/formatDuration';

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
  seatsBooked: number;
  startDateTime?: string | null;
  endDateTime?: string | null;
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
  };
};

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
    timeZone: 'Asia/Muscat',
  }).format(date);
}

function formatDate(value: string | null | undefined, localeCode: string) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(localeCode, {
    dateStyle: 'medium',
    timeZone: 'Asia/Muscat',
  }).format(date);
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">{title}</h2>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

export default function AdminClassDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; classId: string }>;
}) {
  const { locale, classId } = use(params);
  const isArabic = locale === 'ar';
  const localeCode = isArabic ? 'ar-OM-u-nu-latn' : 'en-OM';

  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondaryError, setSecondaryError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const t = {
    back: isArabic ? 'الرجوع للصفوف' : 'Back to classes',
    title: isArabic ? 'تفاصيل الصف' : 'Class Details',
    edit: isArabic ? 'تعديل' : 'Edit',
    calendar: isArabic ? 'التقويم' : 'Calendar',
    publicPage: isArabic ? 'الصفحة' : 'Public',
    enrollmentWallet: isArabic ? 'التسجيل+المحفظة' : 'Enroll+Wallet',
    publish: isArabic ? 'نشر' : 'Publish',
    moveToDraft: isArabic ? 'مسودة' : 'Draft',
    renewClass: isArabic ? 'رينيـو الصف' : 'Renew Class',
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
    noReviews: isArabic ? 'لا توجد تقييمات مرئية لهذا الصف بعد.' : 'No visible reviews for this class yet.',
    noTrainer: isArabic ? 'لم يتم ربط مدرب بعد.' : 'No trainer assigned yet.',
    retry: isArabic ? 'إعادة التحميل' : 'Reload',
    sessionsLoadError: isArabic ? 'تعذر تحميل تفاصيل الجلسات، لكن بيانات الصف متاحة.' : 'Session details could not be loaded, but the class data is available.',
    bookings: isArabic ? 'الحجوزات' : 'Bookings',
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
      const classResponse = await fetch(`/api/admin/classes/${classId}`, { cache: 'no-store' });

      const classPayload = (await classResponse.json().catch(() => ({}))) as ClassDetails & { error?: string };
      if (!classResponse.ok) {
        throw new Error(classPayload.error || t.notFound);
      }

      setClassData(classPayload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.notFound);
      setClassData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [classId]);

  const reviewAverage = useMemo(() => {
    if (!classData?.reviews?.length) return null;
    const ratings = classData.reviews.map((review) => review.rating).filter((rating): rating is number => typeof rating === 'number');
    if (ratings.length === 0) return null;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }, [classData?.reviews]);

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
  const reviewCount = classData.reviews?.length ?? 0;
  const bookingsCount = classData._count?.bookings ?? 0;
  const isUpcoming = classData.startDateTime ? new Date(classData.startDateTime).getTime() >= Date.now() : false;
  const availability = classData.seatsTotal - (classData.seatsBooked ?? 0);
  const occupancyPercent = classData.seatsTotal > 0
    ? Math.min(100, Math.max(0, ((classData.seatsBooked ?? 0) / classData.seatsTotal) * 100))
    : 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="p-4 sm:p-5 lg:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="max-w-4xl">
              <Link
                href={`/${locale}/admin/classes`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                <IoArrowBack className="h-4 w-4" />
                {t.back}
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span><span className="font-medium text-zinc-900 dark:text-zinc-100">{t.status}:</span> {formatStatus(classData.status, isArabic)}</span>
                <span><span className="font-medium text-zinc-900 dark:text-zinc-100">{t.category}:</span> {formatCategory(classData.category, isArabic)}</span>
                <span><span className="font-medium text-zinc-900 dark:text-zinc-100">{t.subCategory}:</span> {formatSubCategory(classData.subCategory, isArabic)}</span>
              </div>

              <h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                {displayTitle}
              </h1>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.bookings}</span>
                    <IoPeopleOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{bookingsCount}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{isArabic ? 'التاريخ' : 'Date'}</span>
                    <IoCalendarOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-base">
                    {classData.startDateTime ? formatDateTime(classData.startDateTime, localeCode) : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.occupancy}</span>
                    <IoTimeOutline className="h-4 w-4 text-[color:var(--noon-teal)]" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{classData.seatsBooked ?? 0} / {classData.seatsTotal}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div className="h-full rounded-full bg-[color:var(--noon-teal)]" style={{ width: `${occupancyPercent}%` }} />
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.averageRating}</span>
                    <IoStar className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{reviewAverage ? reviewAverage.toFixed(1) : '—'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50 sm:p-4">
              <div className="grid gap-2">
                <Link
                  href={`/${locale}/admin/classes/${classId}/edit`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  <IoCreateOutline className="h-4 w-4" />
                  {t.edit}
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/${locale}/admin/calendar`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <IoGlobeOutline className="h-4 w-4" />
                    {t.calendar}
                  </Link>
                  <Link
                    href={`/${locale}/classes/${classData.slug}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    target="_blank"
                  >
                    <IoEyeOutline className="h-4 w-4" />
                    {t.publicPage}
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(classData.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
                    disabled={statusLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-3 text-xs font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <IoCheckmarkCircle className="h-4 w-4" />
                    {classData.status === 'PUBLISHED' ? t.moveToDraft : t.publish}
                  </button>
                  <Link
                    href={`/${locale}/admin/classes/${classId}/enrollment-wallet`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <IoWalletOutline className="h-4 w-4" />
                    {t.enrollmentWallet}
                  </Link>
                </div>

                {(classData.status === 'COMPLETED' || classData.status === 'CANCELLED' || !isUpcoming) ? (
                  <AdminRenewClassButton
                    classId={classId}
                    locale={locale as 'en' | 'ar'}
                    label={t.renewClass}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                  />
                ) : null}
              </div>
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

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <SectionCard
            icon={<IoSparklesOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />}
            title={t.overview}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.englishContent}</p>
                <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{classData.title}</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-600 dark:text-zinc-300">{classData.description}</p>
              </div>
              <div dir="rtl" className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950/50">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.arabicContent}</p>
                <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{classData.titleAr || '—'}</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-8 text-zinc-600 dark:text-zinc-300">{classData.descriptionAr || '—'}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailTile label={t.category} value={formatCategory(classData.category, isArabic)} />
              <DetailTile label={t.subCategory} value={formatSubCategory(classData.subCategory, isArabic)} />
              <DetailTile label={t.duration} value={formatDurationClock(classData.durationMinutes)} />
              <DetailTile label={t.price} value={formatMoney(classData.price, classData.currency)} />
              <DetailTile label={t.seats} value={classData.seatsTotal} />
              <DetailTile label={t.availability} value={classData.seatsAvailable} />
              <DetailTile label={t.createdAt} value={formatDate(classData.createdAt, localeCode)} />
              <DetailTile label={t.updatedAt} value={formatDate(classData.updatedAt, localeCode)} />
            </div>
          </SectionCard>

          <SectionCard
            icon={<IoCalendarOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />}
            title={t.schedule}
          >

            {classData.startDateTime ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatDateTime(classData.startDateTime, localeCode)}
                </p>
                {classData.endDateTime ? (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {isArabic ? 'ينتهي: ' : 'Ends: '}{formatDateTime(classData.endDateTime, localeCode)}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <DetailTile label={t.seats} value={classData.seatsTotal} />
                  <DetailTile label={isArabic ? 'محجوز' : 'Booked'} value={classData.seatsBooked ?? 0} />
                  <DetailTile label={t.availability} value={availability} />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {isArabic ? 'لم يتم تحديد تاريخ ووقت بعد.' : 'No date and time set yet.'}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={<IoStar className="h-5 w-5 text-amber-500" />}
            title={t.reviews}
          >

            {reviewCount === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.noReviews}
              </div>
            ) : (
              <div className="space-y-3">
                {classData.reviews?.slice(0, 5).map((review) => (
                  <div key={review.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{t.anonymousCustomer}</p>
                          {review.isVerified ? (
                            <span className="text-xs text-emerald-700 dark:text-emerald-300">
                              {t.verified}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{formatDate(review.createdAt, localeCode)}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
                        <IoStar className="h-4 w-4" />
                        {review.rating ?? '—'}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{review.comment || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            icon={<IoImageOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />}
            title={t.media}
          >

            {classData.image ? (
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <img src={classData.image} alt={classData.title} className="aspect-[3/4] w-full object-cover" />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.noImage}
              </div>
            )}

            {classData.images?.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {classData.images.slice(0, 4).map((image, index) => (
                  <div key={`${image}-${index}`} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <img src={image} alt={`${classData.title} ${index + 1}`} className="aspect-[3/4] w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noGallery}</p>
            )}
          </SectionCard>

          <SectionCard
            icon={<IoPeopleOutline className="h-5 w-5 text-[color:var(--noon-teal)]" />}
            title={t.trainer}
          >

            {classData.trainer ? (
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  {classData.trainer.profileImage ? (
                    <img
                      src={classData.trainer.profileImage}
                      alt={classData.trainer.fullName}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-100 text-lg font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {classData.trainer.fullName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">{classData.trainer.fullName}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{classData.trainer.email || '—'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t.noTrainer}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={<IoPricetagOutline className="h-5 w-5" />}
            title={t.meta}
          >

            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.slug}</p>
                <p className="mt-2 break-all font-semibold text-zinc-900 dark:text-zinc-100">{classData.slug}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.metaTitle}</p>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{classData.metaTitle || '—'}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.metaDescription}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{classData.metaDescription || '—'}</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t.publishedAt}</p>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDateTime(classData.publishedAt, localeCode)}</p>
              </div>
            </div>

            {classData.status === 'PUBLISHED' && !classData.startDateTime ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <IoWarningOutline className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t.publishingHint}</span>
                </div>
              </div>
            ) : null}
          </SectionCard>
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
