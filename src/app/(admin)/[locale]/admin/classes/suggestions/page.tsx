import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FiMessageSquare, FiRefreshCw, FiThumbsUp, FiClock, FiCheckCircle } from 'react-icons/fi';

import AdminWorkshopSuggestionActions from '@/components/admin/AdminWorkshopSuggestionActions';
import { getAdminWorkshopSuggestions, type WorkshopSuggestionStatus } from '@/lib/db/workshopSuggestions';
import { getUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';

function formatDateTime(value: Date | null, locale: Locale): string {
  if (!value) return locale === 'ar' ? 'لا يوجد' : 'Not available';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Muscat',
  }).format(new Date(value));
}

function compactNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM').format(value);
}

export default async function AdminWorkshopSuggestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) redirect(`/${locale}/login`);

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') redirect(`/${locale}/account`);

  const q = await searchParams;
  const rawStatus = q.status?.toUpperCase();
  const status: WorkshopSuggestionStatus | 'ALL' =
    rawStatus === 'PENDING' || rawStatus === 'PUBLISHED' || rawStatus === 'HIDDEN' ? rawStatus : 'ALL';

  const { items, stats } = await getAdminWorkshopSuggestions({ status });

  const t = {
    repeats: locale === 'ar' ? 'طلبات الإعادة' : 'Repeat Requests',
    suggestions: locale === 'ar' ? 'اقتراحات الورش' : 'Workshop Suggestions',
    title: locale === 'ar' ? 'اقتراحات الورش' : 'Workshop Suggestions',
    hint: locale === 'ar'
      ? 'يرسل الزوار اقتراحاتهم. اختر ما يُعرض على الموقع ليصوّت له الزبائن.'
      : 'Visitors submit ideas. Choose which ones to publish so customers can vote.',
    total: locale === 'ar' ? 'إجمالي الاقتراحات' : 'Total Suggestions',
    pending: locale === 'ar' ? 'بانتظار المراجعة' : 'Pending Review',
    published: locale === 'ar' ? 'معروضة' : 'Published',
    totalVotes: locale === 'ar' ? 'إجمالي الأصوات' : 'Total Votes',
    all: locale === 'ar' ? 'الكل' : 'All',
    votes: locale === 'ar' ? 'صوت' : 'votes',
    by: locale === 'ar' ? 'من' : 'By',
    noData: locale === 'ar' ? 'لا توجد اقتراحات حالياً.' : 'No suggestions yet.',
    statusPending: locale === 'ar' ? 'بانتظار المراجعة' : 'Pending',
    statusPublished: locale === 'ar' ? 'معروضة' : 'Published',
    statusHidden: locale === 'ar' ? 'مخفية' : 'Hidden',
  };

  const statusLabel = (s: WorkshopSuggestionStatus) =>
    s === 'PUBLISHED' ? t.statusPublished : s === 'HIDDEN' ? t.statusHidden : t.statusPending;
  const statusTone = (s: WorkshopSuggestionStatus) =>
    s === 'PUBLISHED'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : s === 'HIDDEN'
        ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';

  const cards = [
    { label: t.total, value: compactNumber(stats.total, locale), icon: <FiMessageSquare className="size-5" />, cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    { label: t.pending, value: compactNumber(stats.pending, locale), icon: <FiClock className="size-5" />, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    { label: t.published, value: compactNumber(stats.published, locale), icon: <FiCheckCircle className="size-5" />, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    { label: t.totalVotes, value: compactNumber(stats.totalVotes, locale), icon: <FiThumbsUp className="size-5" />, cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  ];

  const statusFilters: Array<{ key: 'ALL' | WorkshopSuggestionStatus; label: string }> = [
    { key: 'ALL', label: t.all },
    { key: 'PENDING', label: t.statusPending },
    { key: 'PUBLISHED', label: t.statusPublished },
    { key: 'HIDDEN', label: t.statusHidden },
  ];

  return (
    <div className="space-y-6">
      <nav className="flex gap-2">
        <Link href={`/${locale}/admin/classes/repeat-requests`} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <FiRefreshCw className="size-4" />{t.repeats}
        </Link>
        <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
          <FiMessageSquare className="size-4" />{t.suggestions}
        </span>
      </nav>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t.hint}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {cards.map((card) => (
              <article key={card.label} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{card.label}</p>
                    <p className="mt-1 truncate text-xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
                  </div>
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.cls}`}><span className="[&>svg]:size-3.5">{card.icon}</span></span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.key}
            href={`/${locale}/admin/classes/suggestions${f.key === 'ALL' ? '' : `?status=${f.key}`}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${status === f.key ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <FiMessageSquare className="mx-auto size-10 text-zinc-400" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
        </section>
      ) : (
        <section className="space-y-3">
          {items.map((item) => {
            const title = locale === 'ar' && item.titleAr ? item.titleAr : item.title;
            const description = locale === 'ar' && item.descriptionAr ? item.descriptionAr : item.description;
            return (
              <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusTone(item.status)}`}>{statusLabel(item.status)}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-violet-700 dark:text-violet-300"><FiThumbsUp className="size-3.5" />{compactNumber(item.votesCount, locale)} {t.votes}</span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-zinc-900 dark:text-white">{title}</h3>
                    {description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
                    <p className="mt-2 text-xs text-zinc-400">
                      {item.submitterName ? `${t.by}: ${item.submitterName}` : ''}{item.submitterEmail ? ` (${item.submitterEmail})` : ''} · {formatDateTime(item.createdAt, locale)}
                    </p>
                  </div>
                  <AdminWorkshopSuggestionActions id={item.id} status={item.status} locale={locale} />
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
