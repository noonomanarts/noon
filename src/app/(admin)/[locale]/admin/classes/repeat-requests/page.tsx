import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { FiArrowUpRight, FiClock, FiFilter, FiRefreshCw, FiSearch, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { GiChefToque } from 'react-icons/gi';
import { HiPaintBrush } from 'react-icons/hi2';

import AdminRepeatRequestActions from '@/components/admin/AdminRepeatRequestActions';
import { getAdminClassRepeatRequests } from '@/lib/db/classRepeatRequests';
import { getUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';

function normalizeSubCategory(value: string | null, locale: Locale): string {
  if (!value) {
    return locale === 'ar' ? 'عام' : 'General';
  }

  const normalized = value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');

  return normalized;
}

function formatDateTime(value: Date | null, locale: Locale): string {
  if (!value) {
    return locale === 'ar' ? 'لا يوجد' : 'Not available';
  }

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Muscat',
  }).format(new Date(value));
}

function compactNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM').format(value);
}

export default async function AdminClassRepeatRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; state?: string; sort?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    redirect(`/${locale}/account`);
  }

  const queryParams = await searchParams;
  const search = queryParams.q?.trim() ?? '';
  const category = queryParams.category === 'COOKING' || queryParams.category === 'ARTS_CRAFTS'
    ? queryParams.category
    : 'ALL';
  const state = queryParams.state === 'all' || queryParams.state === 'fulfilled' ? queryParams.state : 'pending';
  const sort = queryParams.sort === 'latest' ? 'latest' : 'demand';

  const { items, stats } = await getAdminClassRepeatRequests({
    search,
    category,
    state,
    sort,
  });

  const t = {
    title: locale === 'ar' ? 'طلبات إعادة الورش' : 'Workshop Repeat Requests',
    overview: locale === 'ar' ? 'نظرة عامة' : 'Overview',
    workflowHint: locale === 'ar'
      ? 'عند نشر ورشة مطابقة، يتم إشعار أصحاب الطلبات تلقائياً عبر واتس‌اپ والبريد الإلكتروني.'
      : 'When a matching workshop is published, requesters are notified automatically by WhatsApp and email.',
    search: locale === 'ar' ? 'ابحث باسم الورشة' : 'Search workshop name',
    category: locale === 'ar' ? 'الفئة' : 'Category',
    state: locale === 'ar' ? 'الحالة' : 'State',
    sort: locale === 'ar' ? 'الترتيب' : 'Sort',
    apply: locale === 'ar' ? 'تطبيق' : 'Apply',
    clear: locale === 'ar' ? 'إعادة ضبط' : 'Reset',
    allCategories: locale === 'ar' ? 'كل الفئات' : 'All Categories',
    cooking: locale === 'ar' ? 'طبخ' : 'Cooking',
    artsCrafts: locale === 'ar' ? 'فنون وحرف' : 'Arts & Crafts',
    pending: locale === 'ar' ? 'بانتظار الجدولة' : 'Awaiting Scheduling',
    fulfilled: locale === 'ar' ? 'تمت المعالجة' : 'Handled',
    allStates: locale === 'ar' ? 'الكل' : 'All',
    highestDemand: locale === 'ar' ? 'الأعلى طلباً' : 'Highest Demand',
    latestRequests: locale === 'ar' ? 'الأحدث' : 'Latest Requests',
    totalRequests: locale === 'ar' ? 'إجمالي الطلبات' : 'Total Requests',
    pendingRequests: locale === 'ar' ? 'طلبات معلّقة' : 'Pending Requests',
    workshopsWithDemand: locale === 'ar' ? 'ورش عليها طلب' : 'Workshops With Demand',
    handledRequests: locale === 'ar' ? 'طلبات تمت معالجتها' : 'Handled Requests',
    latestRequest: locale === 'ar' ? 'آخر طلب' : 'Latest Request',
    openDemand: locale === 'ar' ? 'ورش بانتظار الإجراء' : 'Workshops Awaiting Action',
    noData: locale === 'ar' ? 'لا توجد طلبات تكرار مطابقة حالياً.' : 'No matching repeat requests found right now.',
    publicPage: locale === 'ar' ? 'الصفحة العامة' : 'Public Page',
    adminClass: locale === 'ar' ? 'صفحة الإدارة' : 'Admin Class',
    repeatDemand: locale === 'ar' ? 'الطلب على التكرار' : 'Repeat Demand',
    requesters: locale === 'ar' ? 'عدد العملاء' : 'Requesters',
    pendingCount: locale === 'ar' ? 'المعلّق الآن' : 'Currently Pending',
    handledCount: locale === 'ar' ? 'تمت معالجته' : 'Handled',
    lastRequestAt: locale === 'ar' ? 'آخر طلب وصل' : 'Last Request Received',
    lastNotifyAt: locale === 'ar' ? 'آخر إشعار للعملاء' : 'Last Customer Notification',
    endStatus: locale === 'ar' ? 'حالة الورشة' : 'Workshop Status',
    ended: locale === 'ar' ? 'منتهية' : 'Ended',
    noNotificationYet: locale === 'ar' ? 'لم يتم إخطار العملاء بعد' : 'Customers have not been notified yet',
    filters: locale === 'ar' ? 'الفلاتر' : 'Filters',
    latestCustomerTouch: locale === 'ar' ? 'آخر تواصل مع العملاء' : 'Last Customer Update',
    demandScore: locale === 'ar' ? 'مستوى الطلب' : 'Demand Level',
    requestSummary: locale === 'ar' ? 'ملخص الطلبات' : 'Request Summary',
    viewPublicPage: locale === 'ar' ? 'عرض الصفحة العامة' : 'Open Public Page',
    openAdminClass: locale === 'ar' ? 'فتح صفحة الإدارة' : 'Open Admin Class',
  };

  const categoryLabel = (value: string) => {
    if (value === 'COOKING') return t.cooking;
    if (value === 'ARTS_CRAFTS') return t.artsCrafts;
    return value;
  };

  const summaryCards = [
    {
      label: t.totalRequests,
      value: compactNumber(stats.totalRequests, locale),
      helper: `${t.workshopsWithDemand}: ${compactNumber(stats.workshopsWithRequests, locale)}`,
      icon: <FiRefreshCw className="size-5" />,
      iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
    {
      label: t.pendingRequests,
      value: compactNumber(stats.pendingRequests, locale),
      helper: `${t.openDemand}: ${compactNumber(stats.workshopsAwaitingScheduling, locale)}`,
      icon: <FiTrendingUp className="size-5" />,
      iconClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    },
    {
      label: t.handledRequests,
      value: compactNumber(stats.fulfilledRequests, locale),
      helper: `${t.highestDemand}: ${compactNumber(stats.maxRequestsCount, locale)}`,
      icon: <FiClock className="size-5" />,
      iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    {
      label: t.latestRequest,
      value: formatDateTime(stats.latestRequestedAt, locale),
      helper: `${t.filters}: ${items.length}`,
      icon: <FiUsers className="size-5" />,
      iconClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{t.title}</h1>
            <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400 sm:block">{t.workflowHint}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <article key={card.label} className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{card.label}</p>
                    <p className="mt-1 truncate text-xl font-bold text-zinc-900 dark:text-white">{card.value}</p>
                  </div>
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconClass}`}>
                    <span className="[&>svg]:size-3.5">{card.icon}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto_auto]">
          <label className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.search}</span>
            <span className="relative block">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder={t.search}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </span>
          </label>

          <label className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.category}</span>
            <select
              name="category"
              defaultValue={category}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            >
              <option value="ALL">{t.allCategories}</option>
              <option value="COOKING">{t.cooking}</option>
              <option value="ARTS_CRAFTS">{t.artsCrafts}</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.state}</span>
            <select
              name="state"
              defaultValue={state}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            >
              <option value="pending">{t.pending}</option>
              <option value="fulfilled">{t.fulfilled}</option>
              <option value="all">{t.allStates}</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.sort}</span>
            <select
              name="sort"
              defaultValue={sort}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            >
              <option value="demand">{t.highestDemand}</option>
              <option value="latest">{t.latestRequests}</option>
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <FiFilter className="size-4" />
            {t.apply}
          </button>

          <Link
            href={`/${locale}/admin/classes/repeat-requests`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t.clear}
          </Link>
        </form>
      </section>

      {items.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <FiRefreshCw className="mx-auto size-10 text-zinc-400" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
        </section>
      ) : (
        <section className="space-y-4">
          {items.map((item) => {
            const title = locale === 'ar' && item.titleAr ? item.titleAr : item.title;
            const isCooking = item.category === 'COOKING';
            const hasPending = item.pendingRequestsCount > 0;
            const demandTone = item.requestsCount >= 10 ? 'text-rose-700 dark:text-rose-300' : item.requestsCount >= 5 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300';

            return (
              <article key={item.classId} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 sm:p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.95fr)_minmax(15rem,0.9fr)_auto] xl:items-center">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                      {item.image ? (
                        <Image src={item.image} alt={title} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          {isCooking ? <GiChefToque className="size-7 text-zinc-400" /> : <HiPaintBrush className="size-7 text-zinc-400" />}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-white sm:text-lg">{title}</h2>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${hasPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                          {hasPending ? t.pending : t.fulfilled}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{categoryLabel(item.category)}</span>
                        <span>•</span>
                        <span>{normalizeSubCategory(item.subCategory, locale)}</span>
                        <span>•</span>
                        <span>{t.endStatus}: {t.ended}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-1 xl:gap-2">
                    <div className="rounded-xl bg-zinc-50 px-3 py-3 dark:bg-zinc-800/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.repeatDemand}</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className={`text-xl font-bold ${demandTone}`}>{compactNumber(item.requestsCount, locale)}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.totalRequests}</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-3 dark:bg-zinc-800/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.requestSummary}</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                        {compactNumber(item.pendingRequestsCount, locale)} {t.pendingCount}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {compactNumber(item.fulfilledRequestsCount, locale)} {t.handledCount}
                      </p>
                    </div>
                    <div className="rounded-xl bg-zinc-50 px-3 py-3 dark:bg-zinc-800/60">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.requesters}</p>
                      <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{compactNumber(item.requestersCount, locale)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.lastRequestAt}</p>
                      <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">{formatDateTime(item.lastRequestedAt, locale)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.latestCustomerTouch}</p>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{item.lastNotifiedAt ? formatDateTime(item.lastNotifiedAt, locale) : t.noNotificationYet}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:w-[13rem] xl:flex-col xl:items-stretch">
                    <Link href={`/${locale}/classes/${item.slug}`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      {t.viewPublicPage}
                      <FiArrowUpRight className="size-3.5" />
                    </Link>
                    <Link href={`/${locale}/admin/classes/${item.classId}`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                      {t.openAdminClass}
                      <FiArrowUpRight className="size-3.5" />
                    </Link>
                    <AdminRepeatRequestActions
                      classId={item.classId}
                      locale={locale}
                      classTitle={title}
                      pendingCount={item.pendingRequestsCount}
                      requestersCount={item.requestersCount}
                    />
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