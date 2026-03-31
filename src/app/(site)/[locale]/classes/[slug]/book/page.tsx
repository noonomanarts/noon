import { redirect, notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { findClassBySlug, findClassSessions } from '@/lib/db/classes';
import { getCurrentUser } from '@/lib/session';
import ClassBookingClient from '@/components/site/ClassBookingClient';

export default async function ClassBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const resolvedSearchParams = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    const nextPath = `/${locale}/classes/${slug}/book${resolvedSearchParams.session ? `?session=${encodeURIComponent(resolvedSearchParams.session)}` : ''}`;
    redirect(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
  }

  const classData = await findClassBySlug(slug);
  if (!classData || classData.status !== 'PUBLISHED') {
    notFound();
  }

  const sessions = await findClassSessions(classData.id, {
    upcomingOnly: true,
    includeCancelled: false,
    limit: 24,
  });
  const hasBookableSession = sessions.some((session) => session.seatsAvailable > 0);

  if (sessions.length === 0) {
    return (
      <div className="route-sharp mx-auto w-full max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
            {locale === 'ar' ? 'لا توجد جلسات قادمة حالياً' : 'No upcoming sessions right now'}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            {locale === 'ar'
              ? 'يرجى العودة لاحقاً أو اختيار دورة أخرى.'
              : 'Please check back later or pick another class.'}
          </p>
        </div>
      </div>
    );
  }

  if (!hasBookableSession) {
    return (
      <div className="route-sharp mx-auto w-full max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
            {locale === 'ar' ? 'كل الجلسات القادمة ممتلئة حالياً' : 'All upcoming sessions are currently full'}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            {locale === 'ar'
              ? 'يرجى اختيار دورة أخرى أو المحاولة لاحقاً عند إضافة جلسات جديدة.'
              : 'Please choose another class or try again later when new sessions are added.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="route-sharp">
      <ClassBookingClient
        locale={locale}
        slug={slug}
        classData={{
          id: classData.id,
          title: classData.title,
          titleAr: classData.titleAr,
          price: classData.price,
          currency: classData.currency,
          subCategory: classData.subCategory,
          minimumAge: classData.minimumAge,
        }}
        sessions={sessions.map((session) => ({
          id: session.id,
          startTime: session.startTime.toISOString(),
          endTime: session.endTime ? session.endTime.toISOString() : null,
          seatsTotal: session.seatsTotal,
          seatsBooked: session.seatsBooked,
          seatsAvailable: session.seatsAvailable,
        }))}
        initialSessionId={resolvedSearchParams.session}
        currentUser={{
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
          preferredLanguage: user.preferredLanguage,
        }}
      />
    </div>
  );
}
