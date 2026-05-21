import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isLocale, type Locale } from '@/lib/locale';
import { findTrainerById, getTrainerDashboardData, type TrainerDashboardData } from '@/lib/db/trainers';
import { formatAmountWithCurrency } from '@/lib/formatNumber';

function formatDateTime(value: string | null, locale: Locale): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(locale === 'ar' ? 'ar-OM-u-nu-latn' : 'en-OM', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Muscat',
  });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-OM').format(value);
}

function formatMoney(value: number, currency: string): string {
  return formatAmountWithCurrency(value, currency);
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'teal' | 'amber' | 'coral' | 'purple';
}) {
  const styles = {
    teal: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    coral: 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
    purple: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-300',
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${styles}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">{text}</p>;
}

function FinanceSection({ dashboard, locale }: { dashboard: TrainerDashboardData; locale: Locale }) {
  const isArabic = locale === 'ar';

  return (
    <Section title={isArabic ? 'المالية' : 'Finance'}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{isArabic ? 'الأرباح الشهرية' : 'Monthly Earnings'}</h3>
          <div className="mt-3 space-y-2">
            {dashboard.monthlyEarnings.length === 0 ? (
              <EmptyState text={isArabic ? 'لا توجد أرباح شهرية بعد.' : 'No monthly earnings yet.'} />
            ) : (
              dashboard.monthlyEarnings.map((item) => (
                <div key={`${item.monthStart}-${item.currency}`} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.monthLabel}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {item.workshopsCount} {isArabic ? 'ورش' : 'workshops'} • {item.participantsCount} {isArabic ? 'مشاركين' : 'participants'}
                      </p>
                    </div>
                    <p className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(item.totalPayout, item.currency)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{isArabic ? 'الأرباح لكل ورشة' : 'Earnings Per Workshop'}</h3>
          <div className="mt-3 space-y-2">
            {dashboard.earningsByWorkshop.length === 0 ? (
              <EmptyState text={isArabic ? 'لا توجد ورش مسددة بعد.' : 'No settled workshops yet.'} />
            ) : (
              dashboard.earningsByWorkshop.map((item) => (
                <Link
                  key={item.classId}
                  href={`/${locale}/admin/classes/${item.classId}`}
                  className="block rounded-lg bg-zinc-50 p-3 transition hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {locale === 'ar' && item.classTitleAr ? item.classTitleAr : item.classTitle}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {formatDateTime(item.settledAt, locale)} • {item.participantsCount} {isArabic ? 'مشاركين' : 'participants'}
                      </p>
                    </div>
                    <p className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(item.trainerPayoutAmount, item.currency)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function WorkshopsSection({
  title,
  workshops,
  locale,
  emptyText,
}: {
  title: string;
  workshops: TrainerDashboardData['ongoingWorkshops'];
  locale: Locale;
  emptyText: string;
}) {
  const isArabic = locale === 'ar';

  return (
    <Section title={title}>
      {workshops.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="space-y-3">
          {workshops.map((workshop) => (
            <Link
              key={workshop.classId}
              href={`/${locale}/admin/classes/${workshop.classId}`}
              className="block rounded-xl border border-zinc-200 p-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">
                    {locale === 'ar' && workshop.classTitleAr ? workshop.classTitleAr : workshop.classTitle}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(workshop.startDateTime, locale)}
                  </p>
                </div>
                <div className="text-right text-sm text-zinc-600 dark:text-zinc-300">
                  <p>{isArabic ? 'الحجوزات' : 'Booked'}: {workshop.seatsBooked} / {workshop.seatsTotal}</p>
                  <p>{isArabic ? 'المشاركون' : 'Participants'}: {workshop.participantsCount ?? 0}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
                  {isArabic ? 'الوصفة' : 'Recipe'}: {workshop.submission.recipeSubmitted ? (isArabic ? 'مرسلة' : 'Submitted') : (isArabic ? 'غير مكتملة' : 'Not complete')}
                </div>
                <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
                  {isArabic ? 'الصور' : 'Photos'}: {workshop.submission.trainerPhotos.length}
                </div>
                <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
                  {isArabic ? 'التقييم' : 'Rating'}: {workshop.averageRating ?? '-'} ({workshop.feedbackCount ?? 0})
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}

export default async function AdminTrainerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const isArabic = locale === 'ar';

  const trainer = await findTrainerById(id);
  if (!trainer) {
    notFound();
  }

  const dashboard = await getTrainerDashboardData(id);

  const trainerName = trainer.fullName || (isArabic ? 'مدرب' : 'Trainer');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">{isArabic ? 'لوحة أداء المدرب' : 'Trainer Dashboard'}</p>
          <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100 sm:text-2xl">{trainerName}</h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{trainer.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/trainers`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {isArabic ? 'رجوع' : 'Back'}
          </Link>
          <Link
            href={`/${locale}/admin/trainers/${id}/edit`}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            {isArabic ? 'تعديل' : 'Edit'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <StatCard
          label={isArabic ? 'ورش قادمة' : 'Upcoming Workshops'}
          value={formatNumber(dashboard.summary.totalUpcomingWorkshops)}
          tone="teal"
        />
        <StatCard
          label={isArabic ? 'ورش مسددة' : 'Settled Workshops'}
          value={formatNumber(dashboard.summary.totalClosedWorkshops)}
          tone="amber"
        />
        <StatCard
          label={isArabic ? 'إجمالي أرباح المدرب' : 'Total Trainer Earnings'}
          value={formatMoney(dashboard.summary.totalTrainerEarnings, dashboard.summary.currency)}
          tone="coral"
        />
        <StatCard
          label={isArabic ? 'متوسط لكل ورشة' : 'Avg / Workshop'}
          value={formatMoney(dashboard.summary.averageEarningPerWorkshop, dashboard.summary.currency)}
          tone="purple"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label={isArabic ? 'إجمالي المشاركين' : 'Total Participants'}
          value={formatNumber(dashboard.summary.totalParticipants)}
          tone="teal"
        />
        <StatCard
          label={isArabic ? 'إجمالي الإيراد' : 'Total Revenue'}
          value={formatMoney(dashboard.summary.totalRevenue, dashboard.summary.currency)}
          tone="amber"
        />
        <StatCard
          label={isArabic ? 'مقترحات المدرب' : 'Trainer Suggestions'}
          value={formatNumber(dashboard.summary.totalSuggestedWorkshops)}
          tone="purple"
        />
      </div>

      <FinanceSection dashboard={dashboard} locale={locale} />

      <WorkshopsSection
        title={isArabic ? 'ورش جارية / قادمة' : 'Ongoing / Upcoming Workshops'}
        workshops={dashboard.ongoingWorkshops}
        locale={locale}
        emptyText={isArabic ? 'لا توجد ورش قادمة.' : 'No upcoming workshops.'}
      />

      <WorkshopsSection
        title={isArabic ? 'ورش سابقة' : 'Previous Workshops'}
        workshops={dashboard.previousWorkshops}
        locale={locale}
        emptyText={isArabic ? 'لا توجد ورش سابقة.' : 'No previous workshops.'}
      />

      <Section title={isArabic ? 'مقترحات الورش' : 'Workshop Suggestions'}>
        {dashboard.suggestedWorkshops.length === 0 ? (
          <EmptyState text={isArabic ? 'لا توجد مقترحات.' : 'No suggestions submitted.'} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.suggestedWorkshops.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">
                      {locale === 'ar' && item.titleAr ? item.titleAr : item.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{formatDateTime(item.createdAt, locale)}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {item.status}
                  </span>
                </div>
                {item.brief ? (
                  <p className="mt-3 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{item.brief}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
