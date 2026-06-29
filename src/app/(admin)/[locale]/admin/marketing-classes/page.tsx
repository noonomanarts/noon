import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FiUsers, FiCalendar, FiAlertTriangle } from 'react-icons/fi';

import { getMarketingClassesOverview } from '@/lib/db/classes';
import { getUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';

function formatDateTime(value: Date | null, locale: Locale): string {
  if (!value) return locale === 'ar' ? 'بدون موعد' : 'No date';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Muscat',
  }).format(new Date(value));
}

export default async function MarketingClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const isArabic = locale === 'ar';

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) redirect(`/${locale}/login`);

  const user = await getUserById(sessionId);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SOCIAL_MEDIA_ADMIN')) {
    redirect(`/${locale}/account`);
  }

  const items = await getMarketingClassesOverview();

  const t = {
    title: isArabic ? 'إقبال الورش' : 'Workshop Demand',
    hint: isArabic
      ? 'عدد المسجلين في كل ورشة. الورش الأقل امتلاءً تظهر أولاً لتعزيز التسويق لها.'
      : 'Registered participants per workshop. Lowest-filled workshops appear first to prioritise marketing.',
    participants: isArabic ? 'المسجلون' : 'Participants',
    seats: isArabic ? 'المقاعد' : 'Seats',
    needsBoost: isArabic ? 'يحتاج ترويج' : 'Needs promotion',
    workshop: isArabic ? 'الورشة' : 'Workshop',
    date: isArabic ? 'الموعد' : 'Date',
    occupancy: isArabic ? 'نسبة الامتلاء' : 'Occupancy',
    none: isArabic ? 'لا توجد ورش حالياً.' : 'No workshops yet.',
    draft: isArabic ? 'مسودة' : 'Draft',
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{t.hint}</p>
      </section>

      {items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <FiUsers className="mx-auto size-10 text-zinc-400" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.none}</p>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const title = isArabic && item.titleAr ? item.titleAr : item.title;
            const seats = item.seatsTotal;
            const pct = seats > 0 ? Math.round((item.participants / seats) * 100) : 0;
            const lowDemand = pct < 50;
            const tone = pct >= 100
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
              : pct >= 70
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="relative h-32 w-full bg-zinc-100 dark:bg-zinc-800">
                  {item.image && <Image src={item.image} alt={title} fill className="object-cover" />}
                  {lowDemand && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                      <FiAlertTriangle className="size-3" />{t.needsBoost}
                    </span>
                  )}
                  {item.status === 'DRAFT' && (
                    <span className="absolute right-2 top-2 rounded-full bg-zinc-900/70 px-2 py-0.5 text-[11px] font-semibold text-white">{t.draft}</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="truncate font-bold text-zinc-900 dark:text-white">{title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <FiCalendar className="size-3.5" />{formatDateTime(item.startDateTime, locale)}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                      <FiUsers className="size-4" />{item.participants}<span className="text-xs font-normal text-zinc-400">/{seats || '—'} {t.participants}</span>
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{pct}%</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
