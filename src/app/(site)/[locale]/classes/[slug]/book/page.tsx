import { redirect, notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { findClassBySlug, findUserScheduleConflict } from '@/lib/db/classes';
import { getCurrentUser } from '@/lib/session';
import { isRegistrationClosed, resolveRegistrationCloseAt } from '@/lib/classRegistration';
import ClassBookingClient from '@/components/site/ClassBookingClient';
import { query } from '@/lib/db/pool';

async function getCurrentTimestamp() {
  return Date.now();
}

export default async function ClassBookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const user = await getCurrentUser();
  if (!user) {
    const nextPath = `/${locale}/classes/${slug}/book`;
    redirect(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
  }

  const classData = await findClassBySlug(slug);
  if (!classData || classData.status !== 'PUBLISHED') {
    notFound();
  }

  const seatsAvailable = classData.seatsTotal - (classData.seatsBooked ?? 0);
  const hasStartDateTime = !!classData.startDateTime;
  const currentTimestamp = await getCurrentTimestamp();
  const isUpcoming = classData.startDateTime
    ? new Date(classData.startDateTime).getTime() > currentTimestamp
    : false;

  if (!hasStartDateTime || !isUpcoming) {
    return (
      <div className="route-sharp mx-auto w-full max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
            {locale === 'ar' ? 'لا توجد مواعيد قادمة حالياً' : 'No upcoming dates right now'}
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

  if (seatsAvailable <= 0) {
    return (
      <div className="route-sharp mx-auto w-full max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
            {locale === 'ar' ? 'المقاعد ممتلئة حالياً' : 'All seats are currently full'}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            {locale === 'ar'
              ? 'يرجى اختيار دورة أخرى أو المحاولة لاحقاً.'
              : 'Please choose another class or try again later.'}
          </p>
        </div>
      </div>
    );
  }

  if (isRegistrationClosed(classData.startDateTime, classData.registrationCloseAt)) {
    return (
      <div className="route-sharp mx-auto w-full max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
            {locale === 'ar' ? 'التسجيل مُغلق' : 'Registration is closed'}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            {locale === 'ar'
              ? 'تم إغلاق التسجيل لهذه الورشة. يرجى اختيار موعد آخر أو التواصل معنا.'
              : 'Registration for this workshop is now closed. Please pick another date or contact us.'}
          </p>
        </div>
      </div>
    );
  }

  const registrationCloseAt = resolveRegistrationCloseAt(
    classData.startDateTime,
    classData.registrationCloseAt
  );

  // Warn when the user already has a workshop booked at the same date & time
  const scheduleConflict = await findUserScheduleConflict(user.id, classData.id).catch(() => null);

  const summerCampHasPriorBooking = classData.subCategory === 'SUMMER_CAMP'
    ? (await query(
        `SELECT 1
         FROM bookings b
         INNER JOIN classes c ON c.id = b.class_id
         WHERE b.user_id = $1
           AND b.class_id <> $2
           AND c.sub_category = 'SUMMER_CAMP'
           AND b.payment_status = 'PAID'
           AND b.status IN ('CONFIRMED', 'COMPLETED')
         LIMIT 1`,
        [user.id, classData.id]
      )).rows.length > 0
    : false;

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
          audienceGender: classData.audienceGender,
          minimumAge: classData.minimumAge,
          maximumAge: classData.maximumAge,
          startDateTime: classData.startDateTime ? classData.startDateTime.toISOString() : null,
          endDateTime: classData.endDateTime ? classData.endDateTime.toISOString() : null,
          registrationCloseAt: registrationCloseAt ? registrationCloseAt.toISOString() : null,
          scheduleSessions: classData.scheduleSessions ?? [],
          summerCampHasPriorBooking,
          seatsTotal: classData.seatsTotal,
          seatsBooked: classData.seatsBooked ?? 0,
        }}
        scheduleConflict={
          scheduleConflict
            ? {
                title: scheduleConflict.title,
                titleAr: scheduleConflict.titleAr,
                startDateTime: scheduleConflict.startDateTime.toISOString(),
                endDateTime: scheduleConflict.endDateTime ? scheduleConflict.endDateTime.toISOString() : null,
              }
            : null
        }
        currentUser={{
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
          gender: user.gender,
          preferredLanguage: user.preferredLanguage,
        }}
      />
    </div>
  );
}
