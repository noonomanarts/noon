'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { IoArrowBack, IoRefresh, IoWalletOutline } from 'react-icons/io5';
import AdminClassMemberWalletPanel from '@/components/admin/AdminClassMemberWalletPanel';

type ClassDetails = {
  id: string;
  title: string;
  titleAr?: string | null;
  price: number;
  currency: string;
  subCategory?: string | null;
  audienceGender?: 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED' | null;
  minimumAge?: number | null;
  maximumAge?: number | null;
  seatsTotal: number;
  seatsBooked: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
};

export default function AdminClassEnrollmentWalletPage({
  params,
}: {
  params: Promise<{ locale: string; classId: string }>;
}) {
  const { locale, classId } = use(params);
  const isArabic = locale === 'ar';

  const [classData, setClassData] = useState<ClassDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = {
    back: isArabic ? 'الرجوع لتفاصيل الكلاس' : 'Back to class details',
    title: isArabic ? 'Class Enrollment + Wallet Operations' : 'Class Enrollment + Wallet Operations',
    subtitle: isArabic
      ? 'صفحة مستقلة لإدارة تسجيل المستخدمين في الكلاس وإدارة عمليات المحفظة المرتبطة بالكلاس.'
      : 'A dedicated page to enroll users into this class and manage class-related wallet operations.',
    loading: isArabic ? 'جاري تحميل بيانات الكلاس...' : 'Loading class data...',
    retry: isArabic ? 'إعادة التحميل' : 'Reload',
    notFound: isArabic ? 'تعذر تحميل بيانات الكلاس.' : 'Failed to load class data.',
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/classes/${classId}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as ClassDetails & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || t.notFound);
      }

      setClassData(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t.notFound);
      setClassData(null);
    } finally {
      setLoading(false);
    }
  }, [classId, t.notFound]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const displayTitle = useMemo(() => {
    if (!classData) return '';
    return isArabic && classData.titleAr ? classData.titleAr : classData.title;
  }, [classData, isArabic]);

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

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--noon-teal)_14%,white),white_55%,color-mix(in_oklab,var(--noon-teal-strong)_10%,white))] p-6 dark:bg-[linear-gradient(135deg,rgba(23,176,173,0.16),rgba(9,15,20,0.9))] md:p-8">
          <Link
            href={`/${locale}/admin/classes/${classId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            <IoArrowBack className="h-4 w-4" />
            {t.back}
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--noon-teal)]/15 text-[color:var(--noon-teal-strong)]">
              <IoWalletOutline className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-3xl">
              {t.title}
            </h1>
          </div>

          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{t.subtitle}</p>
          <p className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">{displayTitle}</p>
        </div>
      </div>

      <AdminClassMemberWalletPanel
        classId={classId}
        classTitle={displayTitle}
        classPrice={classData.price}
        currency={classData.currency}
        seatsAvailable={Math.max(0, classData.seatsTotal - (classData.seatsBooked ?? 0))}
        classSubCategory={classData.subCategory}
        audienceGender={classData.audienceGender}
        minimumAge={classData.minimumAge}
        maximumAge={classData.maximumAge}
        locale={locale}
        onChangedAction={async () => {
          await loadData();
        }}
      />
    </div>
  );
}
