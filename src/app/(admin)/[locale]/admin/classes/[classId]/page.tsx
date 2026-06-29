'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiExternalLink,
  FiCreditCard,
  FiEye,
  FiFileText,
  FiImage,
  FiRefreshCw,
  FiStar,
  FiTag,
  FiUser,
  FiUsers,
  FiXCircle,
  FiZap,
} from 'react-icons/fi';
import AdminRenewClassButton from '@/components/admin/AdminRenewClassButton';
import ClassSettlementPanel from '@/components/admin/ClassSettlementPanel';
import ClassBroadcastPanel from '@/components/admin/ClassBroadcastPanel';
import { formatAmountWithCurrency } from '@/lib/formatNumber';
import { formatDurationClock } from '@/lib/formatDuration';
import { markdownToSafeHtml } from '@/lib/markdown';

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

const STATUS_CONFIG: Record<ClassStatus, { labelEn: string; labelAr: string; cls: string; dot: string }> = {
  DRAFT:     { labelEn: 'Draft',     labelAr: 'مسودة',  cls: 'bg-amber-50   text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-300  dark:border-amber-800/50',  dot: 'bg-amber-400'  },
  PUBLISHED: { labelEn: 'Published', labelAr: 'منشور',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
  CANCELLED: { labelEn: 'Cancelled', labelAr: 'ملغي',   cls: 'bg-rose-50    text-rose-700    border-rose-200    dark:bg-rose-900/20    dark:text-rose-300    dark:border-rose-800/50',    dot: 'bg-rose-500'   },
  COMPLETED: { labelEn: 'Completed', labelAr: 'مكتمل', cls: 'bg-zinc-100   text-zinc-600   border-zinc-200   dark:bg-zinc-800      dark:text-zinc-400   dark:border-zinc-700',         dot: 'bg-zinc-400'   },
};

const SUB_CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  APPETIZERS_SNACKS: { en: 'Appetizers & Snacks', ar: 'المقبلات والوجبات الخفيفة' },
  MAIN_DISHES:       { en: 'Main Dishes',          ar: 'الأطباق الرئيسية'          },
  DESSERTS_BAKING:   { en: 'Desserts & Baking',    ar: 'الحلويات والمخبوزات'       },
  MOM_AND_KID:       { en: 'Mom & Kid',             ar: 'الأم والطفل'               },
  SUMMER_CAMP:       { en: 'Summer Camp',           ar: 'المخيم الصيفي'            },
  PAINTING:          { en: 'Painting',              ar: 'الرسم'                     },
  CRAFTS:            { en: 'Crafts',                ar: 'الأشغال اليدوية'           },
  POTTERY:           { en: 'Pottery',               ar: 'الفخار'                    },
  MIXED:             { en: 'Mixed',                 ar: 'متنوع'                     },
};

function formatSubCategory(value: string, isArabic: boolean) {
  const label = SUB_CATEGORY_LABELS[value];
  return label ? (isArabic ? label.ar : label.en) : value.replaceAll('_', ' ');
}

function formatCategory(value: string, isArabic: boolean) {
  if (value === 'COOKING')    return isArabic ? 'الطبخ' : 'Cooking';
  if (value === 'ARTS_CRAFTS') return isArabic ? 'الفنون والأشغال' : 'Arts & Crafts';
  return value;
}

function formatDateTime(value: string | null | undefined, localeCode: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeCode, {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Muscat',
  }).format(date);
}

function formatDate(value: string | null | undefined, localeCode: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeCode, {
    dateStyle: 'medium', timeZone: 'Asia/Muscat',
  }).format(date);
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <FiStar
          key={star}
          className={`size-3 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`}
        />
      ))}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 text-sm">
      <span className="shrink-0 font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-right font-semibold text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3 dark:border-zinc-800">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--noon-teal-soft)] text-[color:var(--noon-teal)]">
        {icon}
      </span>
      <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {typeof count === 'number' && (
        <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {count}
        </span>
      )}
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {children}
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
  const [statusLoading, setStatusLoading] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const t = {
    back:            isArabic ? 'الرجوع للورشات'     : 'Back to classes',
    edit:            isArabic ? 'تعديل الورشة'        : 'Edit class',
    calendar:        isArabic ? 'التقويم'             : 'Calendar',
    publicPage:      isArabic ? 'الصفحة العامة'      : 'Public page',
    enrollWallet:    isArabic ? 'تسجيل + محفظة'      : 'Enroll + Wallet',
    publish:         isArabic ? 'نشر الورشة'           : 'Publish class',
    moveToDraft:     isArabic ? 'نقل لمسودة'          : 'Move to draft',
    renewClass:      isArabic ? 'رينيو الورشة'         : 'Renew class',
    loading:         isArabic ? 'جاري تحميل البيانات…' : 'Loading class details…',
    notFound:        isArabic ? 'تعذر العثور على هذه الورشة.' : 'This class could not be found.',
    overview:        isArabic ? 'نظرة عامة'           : 'Overview',
    media:           isArabic ? 'الصور'               : 'Media',
    trainer:         isArabic ? 'المدرب'              : 'Trainer',
    schedule:        isArabic ? 'الموعد'              : 'Schedule',
    reviews:         isArabic ? 'التقييمات'           : 'Reviews',
    meta:            isArabic ? 'بيانات النشر'         : 'Publishing',
    noImage:         isArabic ? 'لا توجد صورة رئيسية' : 'No main image',
    noGallery:       isArabic ? 'لا توجد صور إضافية'  : 'No gallery images',
    noReviews:       isArabic ? 'لا توجد تقييمات بعد' : 'No reviews yet',
    noTrainer:       isArabic ? 'لم يُعيَّن مدرب بعد' : 'No trainer assigned',
    retry:           isArabic ? 'إعادة التحميل'       : 'Retry',
    bookings:        isArabic ? 'الحجوزات'            : 'Bookings',
    avgRating:       isArabic ? 'متوسط التقييم'       : 'Avg rating',
    category:        isArabic ? 'التصنيف'             : 'Category',
    subCategory:     isArabic ? 'التصنيف الفرعي'      : 'Sub-category',
    duration:        isArabic ? 'المدة'               : 'Duration',
    seats:           isArabic ? 'المقاعد'             : 'Total seats',
    seatsBooked:     isArabic ? 'محجوز'               : 'Booked',
    seatsAvail:      isArabic ? 'متاح'                : 'Available',
    price:           isArabic ? 'السعر'               : 'Price',
    status:          isArabic ? 'الحالة'              : 'Status',
    createdAt:       isArabic ? 'تاريخ الإنشاء'       : 'Created',
    updatedAt:       isArabic ? 'آخر تحديث'           : 'Updated',
    publishedAt:     isArabic ? 'تاريخ النشر'         : 'Published at',
    slug:            isArabic ? 'الرابط المختصر'       : 'Slug',
    metaTitle:       isArabic ? 'عنوان SEO'           : 'Meta title',
    metaDesc:        isArabic ? 'وصف SEO'             : 'Meta description',
    enContent:       isArabic ? 'المحتوى الإنجليزي'   : 'English',
    arContent:       isArabic ? 'المحتوى العربي'       : 'Arabic',
    occupancy:       isArabic ? 'الإشغال'             : 'Occupancy',
    verified:        isArabic ? 'موثق'                : 'Verified',
    customer:        isArabic ? 'عميل'                : 'Customer',
    showAll:         isArabic ? 'عرض الكل'            : 'Show all',
    noDate:          isArabic ? 'لم يُحدد موعد بعد'   : 'No date set yet',
    endsAt:          isArabic ? 'ينتهي:'              : 'Ends:',
    publishingHint:  isArabic
      ? 'الورشة منشورة بدون جلسات — لن تظهر أي مواعيد قابلة للحجز في الواجهة العامة.'
      : 'Class is published without a session — no bookable slots will appear on the public site.',
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/classes/${classId}`, { cache: 'no-store' });
      const payload = (await res.json().catch(() => ({}))) as ClassDetails & { error?: string };
      if (!res.ok) throw new Error(payload.error || t.notFound);
      setClassData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.notFound);
      setClassData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [classId]);

  const reviewAverage = useMemo(() => {
    if (!classData?.reviews?.length) return null;
    const ratings = classData.reviews
      .map((r) => r.rating)
      .filter((r): r is number => typeof r === 'number');
    if (!ratings.length) return null;
    return ratings.reduce((s, r) => s + r, 0) / ratings.length;
  }, [classData?.reviews]);

  const handleStatusChange = async (nextStatus: 'PUBLISHED' | 'DRAFT') => {
    setStatusLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/classes/${classId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await res.json().catch(() => ({}))) as ClassDetails & { error?: string };
      if (!res.ok) throw new Error(payload.error || 'Failed to update status');
      setClassData((prev) => prev ? { ...prev, status: payload.status, publishedAt: payload.publishedAt } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-zinc-400">
        <FiRefreshCw className="size-6 animate-spin text-[color:var(--noon-teal)]" />
        <p className="text-sm">{t.loading}</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="p-6 text-center">
          <FiXCircle className="mx-auto mb-3 size-10 text-rose-400" />
          <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error || t.notFound}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            <FiRefreshCw className="size-4" />
            {t.retry}
          </button>
        </Card>
      </div>
    );
  }

  const displayTitle  = isArabic && classData.titleAr ? classData.titleAr : classData.title;
  const reviewCount   = classData.reviews?.length ?? 0;
  const bookingsCount = classData._count?.bookings ?? 0;
  const seatsBooked   = classData.seatsBooked ?? 0;
  const occupancyPct  = classData.seatsTotal > 0
    ? Math.min(100, Math.round((seatsBooked / classData.seatsTotal) * 100))
    : 0;
  const isUpcoming    = classData.startDateTime
    ? new Date(classData.startDateTime).getTime() >= Date.now()
    : false;
  const statusCfg     = STATUS_CONFIG[classData.status];
  const visibleReviews = showAllReviews
    ? (classData.reviews ?? [])
    : (classData.reviews ?? []).slice(0, 4);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Top header bar ── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/classes`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <FiArrowLeft className="size-3.5" />
          {t.back}
        </Link>
      </div>

      {/* ── Error toast ── */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* ── Hero card ── */}
      <Card>
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-8">

            {/* Left: title + stats */}
            <div className="min-w-0 flex-1">
              {/* Status + categories */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.cls}`}>
                  <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                  {isArabic ? statusCfg.labelAr : statusCfg.labelEn}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {formatCategory(classData.category, isArabic)}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {formatSubCategory(classData.subCategory, isArabic)}
                </span>
              </div>

              <h1 className="mt-3 text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                {displayTitle}
              </h1>

              {/* 4 stat cards */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {/* Bookings */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{t.bookings}</span>
                    <FiUsers className="size-3.5 text-[color:var(--noon-teal)]" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">{bookingsCount}</p>
                </div>

                {/* Occupancy */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{t.occupancy}</span>
                    <FiUsers className="size-3.5 text-[color:var(--noon-teal)]" />
                  </div>
                  <p className="mt-2 text-xl font-black text-zinc-900 dark:text-zinc-100">
                    {seatsBooked}<span className="text-sm font-semibold text-zinc-400">/{classData.seatsTotal}</span>
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-[color:var(--noon-teal)] transition-all"
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-400">{occupancyPct}%</p>
                </div>

                {/* Price */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{t.price}</span>
                    <FiTag className="size-3.5 text-[color:var(--noon-teal)]" />
                  </div>
                  <p className="mt-2 text-lg font-black text-zinc-900 dark:text-zinc-100">
                    {formatAmountWithCurrency(classData.price, classData.currency)}
                  </p>
                </div>

                {/* Rating */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{t.avgRating}</span>
                    <FiStar className="size-3.5 text-amber-400" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
                    {reviewAverage ? reviewAverage.toFixed(1) : '—'}
                  </p>
                  {reviewAverage && <StarRow rating={reviewAverage} />}
                </div>
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="w-full xl:w-64 xl:shrink-0">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="space-y-2">
                  {/* Primary: Edit */}
                  <Link
                    href={`/${locale}/admin/classes/${classId}/edit`}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--noon-teal)] px-4 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
                  >
                    <FiEdit2 className="size-4" />
                    {t.edit}
                  </Link>

                  {/* Publish / Draft toggle */}
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(classData.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
                    disabled={statusLoading}
                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      classData.status === 'PUBLISHED'
                        ? 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <FiCheckCircle className="size-4" />
                    {classData.status === 'PUBLISHED' ? t.moveToDraft : t.publish}
                  </button>

                  <div className="pt-1">
                    <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                      {isArabic ? 'روابط سريعة' : 'Quick links'}
                    </p>
                    <div className="space-y-1.5">
                      <Link
                        href={`/${locale}/admin/calendar`}
                        className="flex h-9 w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <FiCalendar className="size-4 shrink-0 text-zinc-400" />
                        {t.calendar}
                      </Link>
                      <Link
                        href={`/${locale}/classes/${classData.slug}`}
                        target="_blank"
                        className="flex h-9 w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <FiExternalLink className="size-4 shrink-0 text-zinc-400" />
                        {t.publicPage}
                      </Link>
                      <Link
                        href={`/${locale}/admin/classes/${classId}/enrollment-wallet`}
                        className="flex h-9 w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <FiCreditCard className="size-4 shrink-0 text-zinc-400" />
                        {t.enrollWallet}
                      </Link>

                      {(classData.status === 'COMPLETED' || classData.status === 'CANCELLED' || !isUpcoming) && (
                        <AdminRenewClassButton
                          classId={classId}
                          locale={locale as 'en' | 'ar'}
                          label={t.renewClass}
                          className="flex h-9 w-full items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Main content grid ── */}
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">

        {/* ════ Left column ════ */}
        <div className="space-y-5">

          {/* Overview */}
          <Card className="p-4 sm:p-5">
            <SectionHeader icon={<FiZap className="size-3.5" />} title={t.overview} />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{t.enContent}</p>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{classData.title}</h3>
                <div
                  className="prose prose-sm mt-2 max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(classData.description || '') }}
                />
              </div>
              <div dir="rtl" className="rounded-xl bg-zinc-50 p-4 text-right dark:bg-zinc-950/50">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{t.arContent}</p>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{classData.titleAr || '—'}</h3>
                <div
                  className="prose prose-sm mt-2 max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(classData.descriptionAr || '') }}
                />
              </div>
            </div>

            <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              <InfoRow label={t.category}    value={formatCategory(classData.category, isArabic)} />
              <InfoRow label={t.subCategory} value={formatSubCategory(classData.subCategory, isArabic)} />
              <InfoRow label={t.duration}    value={formatDurationClock(classData.durationMinutes)} />
              <InfoRow label={t.seats}       value={classData.seatsTotal} />
              <InfoRow label={t.seatsBooked} value={seatsBooked} />
              <InfoRow label={t.seatsAvail}  value={classData.seatsAvailable} />
              <InfoRow label={t.createdAt}   value={formatDate(classData.createdAt, localeCode)} />
              <InfoRow label={t.updatedAt}   value={formatDate(classData.updatedAt, localeCode)} />
            </div>
          </Card>

          {/* Schedule */}
          <Card className="p-4 sm:p-5">
            <SectionHeader icon={<FiCalendar className="size-3.5" />} title={t.schedule} />

            <div className="mt-4">
              {classData.startDateTime ? (
                <div className="rounded-xl border border-[color:var(--noon-teal)]/20 bg-[color:var(--noon-teal-soft)] p-4">
                  <div className="flex items-start gap-3">
                    <FiCalendar className="mt-0.5 size-4 shrink-0 text-[color:var(--noon-teal)]" />
                    <div>
                      <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {formatDateTime(classData.startDateTime, localeCode)}
                      </p>
                      {classData.endDateTime && (
                        <p className="mt-0.5 text-sm text-zinc-500">
                          {t.endsAt} {formatDateTime(classData.endDateTime, localeCode)}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                        <FiClock className="size-3.5" />
                        {formatDurationClock(classData.durationMinutes)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
                  {t.noDate}
                </div>
              )}
            </div>
          </Card>

          {/* Reviews */}
          <Card className="p-4 sm:p-5">
            <SectionHeader icon={<FiStar className="size-3.5" />} title={t.reviews} count={reviewCount} />

            <div className="mt-4">
              {reviewCount === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
                  {t.noReviews}
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleReviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {t.customer.slice(0, 1)}
                            </div>
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.customer}</span>
                            {review.isVerified && (
                              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                {t.verified}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-400">{formatDate(review.createdAt, localeCode)}</p>
                        </div>
                        {review.rating != null && (
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm font-bold text-amber-600">{review.rating.toFixed(1)}</span>
                            <StarRow rating={review.rating} />
                          </div>
                        )}
                      </div>
                      {review.comment && (
                        <div
                          className="prose prose-sm mt-3 max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(review.comment) }}
                        />
                      )}
                    </div>
                  ))}

                  {!showAllReviews && reviewCount > 4 && (
                    <button
                      type="button"
                      onClick={() => setShowAllReviews(true)}
                      className="w-full rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                    >
                      {t.showAll} ({reviewCount - 4} {isArabic ? 'أخرى' : 'more'})
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ════ Right column ════ */}
        <div className="space-y-5">

          {/* Media */}
          <Card className="p-4 sm:p-5">
            <SectionHeader icon={<FiImage className="size-3.5" />} title={t.media} />

            <div className="mt-4">
              {classData.image ? (
                <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <img
                    src={classData.image}
                    alt={classData.title}
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                  <div className="text-center">
                    <FiImage className="mx-auto mb-2 size-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-xs text-zinc-400">{t.noImage}</p>
                  </div>
                </div>
              )}

              {classData.images?.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {classData.images.slice(0, 6).map((img, i) => (
                    <div key={`${img}-${i}`} className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <img src={img} alt={`${classData.title} ${i + 1}`} className="aspect-square w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-center text-xs text-zinc-400">{t.noGallery}</p>
              )}
            </div>
          </Card>

          {/* Trainer */}
          <Card className="p-4 sm:p-5">
            <SectionHeader icon={<FiUser className="size-3.5" />} title={t.trainer} />

            <div className="mt-4">
              {classData.trainer ? (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                  {classData.trainer.profileImage ? (
                    <img
                      src={classData.trainer.profileImage}
                      alt={classData.trainer.fullName}
                      className="size-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--noon-teal-soft)] text-base font-bold text-[color:var(--noon-teal)]">
                      {classData.trainer.fullName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{classData.trainer.fullName}</p>
                    <p className="truncate text-xs text-zinc-500">{classData.trainer.email || '—'}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
                  {t.noTrainer}
                </div>
              )}
            </div>
          </Card>

          {/* Publishing data */}
          <Card className="p-4 sm:p-5">
            <SectionHeader icon={<FiFileText className="size-3.5" />} title={t.meta} />

            <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
              <InfoRow label={t.status}      value={
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusCfg.cls}`}>
                  <span className={`size-1.5 rounded-full ${statusCfg.dot}`} />
                  {isArabic ? statusCfg.labelAr : statusCfg.labelEn}
                </span>
              } />
              <InfoRow label={t.publishedAt} value={formatDateTime(classData.publishedAt, localeCode)} />
              <InfoRow label={t.slug}        value={
                <span className="max-w-[140px] truncate font-mono text-xs">{classData.slug}</span>
              } />
            </div>

            {classData.metaTitle && (
              <div className="mt-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/50">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{t.metaTitle}</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{classData.metaTitle}</p>
              </div>
            )}
            {classData.metaDescription && (
              <div className="mt-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/50">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">{t.metaDesc}</p>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(classData.metaDescription) }}
                />
              </div>
            )}

            {classData.status === 'PUBLISHED' && !classData.startDateTime && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                <FiEye className="mt-0.5 size-3.5 shrink-0" />
                {t.publishingHint}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Settlement panel ── */}
      <ClassSettlementPanel
        classId={classId}
        locale={locale}
        classStatus={classData.status}
        onClosed={async () => { await loadData(); }}
      />

      {/* ── Broadcast panel ── */}
      <ClassBroadcastPanel classId={classId} locale={locale} />
    </div>
  );
}
