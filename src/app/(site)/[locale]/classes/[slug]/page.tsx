import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GiChefToque } from "react-icons/gi";
import { HiPaintBrush, HiClock, HiStar, HiSparkles, HiShieldCheck } from "react-icons/hi2";
import { MdCalendarMonth, MdAccessTime, MdPerson } from "react-icons/md";

import ClassHeaderSlideshow from "@/components/site/ClassHeaderSlideshow";
import ClassReviewsSection from "@/components/site/ClassReviewsSection";
import RequestRepeatButton from "@/components/site/RequestRepeatButton";
import RegistrationCountdown from "@/components/site/RegistrationCountdown";
import {
  findClassBySlug,
  findClassReviews,
  getClassReviewForUser,
  hasUserBookedClass,
} from "@/lib/db/classes";
import {
  getClassRepeatRequestSummaries,
  type ClassRepeatRequestSummary,
} from "@/lib/db/classRepeatRequests";
import { findTrainerById } from "@/lib/db/trainers";
import { ClassCategory } from "@/lib/db/types";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { formatDurationClock } from "@/lib/formatDuration";
import { isLocale, type Locale } from "@/lib/locale";
import { markdownToSafeHtml } from "@/lib/markdown";
import { getCurrentUser } from "@/lib/session";
import {
  isRegistrationClosed,
  resolveRegistrationCloseAt,
} from "@/lib/classRegistration";

const DISPLAY_TIMEZONE = "Asia/Muscat";

function getCurrentTimestamp(): number {
  return new Date().getTime();
}

function hasWorkshopEnded(input: { status: string; endDateTime: Date | string | null }): boolean {
  return input.status === "COMPLETED"
    || (input.endDateTime ? new Date(input.endDateTime).getTime() < getCurrentTimestamp() : false);
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const classData = await findClassBySlug(slug);
  if (!classData || (classData.status !== "PUBLISHED" && classData.status !== "COMPLETED")) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  const isEnded = hasWorkshopEnded(classData);

  const [reviews, trainer, coTrainer, repeatSummaries, viewerReview, viewerCanReview] = await Promise.all([
    findClassReviews(classData.id),
    classData.trainerId ? findTrainerById(classData.trainerId) : Promise.resolve(null),
    classData.coTrainerId ? findTrainerById(classData.coTrainerId) : Promise.resolve(null),
    isEnded
      ? getClassRepeatRequestSummaries([classData.id], currentUser?.id ?? null)
      : Promise.resolve<Record<string, ClassRepeatRequestSummary>>({}),
    currentUser ? getClassReviewForUser(classData.id, currentUser.id) : Promise.resolve(null),
    currentUser ? hasUserBookedClass(currentUser.id, classData.id) : Promise.resolve(false),
  ]);
  const canWriteReview = viewerCanReview && isEnded;

  const seatsAvailable = Math.max(0, (classData.seatsTotal ?? 0) - (classData.seatsBooked ?? 0));
  const registrationCloseAt = resolveRegistrationCloseAt(
    classData.startDateTime,
    classData.registrationCloseAt
  );
  const registrationClosed = !isEnded && isRegistrationClosed(
    classData.startDateTime,
    classData.registrationCloseAt
  );
  const canBook = !isEnded && !registrationClosed && !!classData.startDateTime && seatsAvailable > 0;
  const isFullyBooked = !isEnded && !registrationClosed && !!classData.startDateTime && seatsAvailable <= 0;

  const isCooking = classData.category === ClassCategory.COOKING;
  const Icon = isCooking ? GiChefToque : HiPaintBrush;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / reviews.length
      : 0;

  const t = {
    breadcrumbClasses: isArabic ? "الورش" : "Classes",
    category: isArabic ? "التصنيف" : "Category",
    cooking: isArabic ? "طبخ" : "Cooking",
    artsCrafts: isArabic ? "فنون وحرف" : "Arts & Crafts",
    subCategory: isArabic ? "القسم" : "Section",
    duration: isArabic ? "المدة" : "Duration",
    averageRating: isArabic ? "متوسط التقييم" : "Average rating",
    noSchedule:
      isArabic ? "الموعد سيُعلن قريباً" : "Schedule coming soon",
    classOverview: isArabic ? "نظرة عامة" : "Class Overview",
    bookingCardTitle: isArabic ? "الحجز" : "Booking",
    dateAndTime: isArabic ? "التاريخ والوقت" : "Date and time",
    trainerSection: isArabic ? "يقود الدورة" : "Led by",
    secureSeatNow: isArabic ? "ثبّت حجزك الآن" : "Secure your seat now",
    repeatThisWorkshop: isArabic ? "اطلب إعادة هذه الورشة" : "Request This Workshop Again",
    viewProfile: isArabic ? "عرض الملف الشخصي" : "View Profile",
    reviews: isArabic ? "التقييمات" : "Reviews",
    noReviews: isArabic ? "لا توجد تقييمات بعد" : "No reviews yet",
    perPerson: isArabic ? "للشخص" : "per person",
    lastPublishedPrice: isArabic ? "سعر آخر طرح" : "Last Published Price",
    bookingHint:
      isArabic
        ? "أكمل حجزك خلال ثوانٍ."
        : "Complete your booking in seconds.",
    repeatHint:
      isArabic
        ? "هذه الورشة انتهت حالياً. إذا رغبت بإعادتها، أرسل طلبك وسيتم أخذه في الاعتبار عند التخطيط القادم."
        : "This workshop has already ended. Send a repeat request and the team will consider it for upcoming scheduling.",
    byVerifiedAttendees: isArabic ? "تقييمات من الحضور" : "Feedback from attendees",
    bookNow: isArabic ? "احجز الآن" : "Book Now",
    schedule: isArabic ? "الموعد" : "Schedule",
    day: isArabic ? "اليوم" : "Day",
    workshopStatus: isArabic ? "حالة الورشة" : "Workshop Status",
    workshopEnded: isArabic ? "انتهت هذه الورشة" : "This workshop has ended",
    noActiveSchedule:
      isArabic ? "لا يوجد موعد نشط لهذه الورشة حالياً، ويمكنك طلب إعادتها من القسم الجانبي." : "There is no active schedule for this workshop right now. You can request a repeat from the side panel.",
    minimumAge: isArabic ? "الحد الأدنى للعمر" : "Minimum Age",
    maximumAge: isArabic ? "الحد الأقصى للعمر" : "Maximum Age",
    ageRange: isArabic ? "الفئة العمرية" : "Age Range",
    audience: isArabic ? "الفئة المناسبة" : "Audience",
    audienceMixed: isArabic ? "مشترك" : "Mixed",
    audienceWomen: isArabic ? "للنساء فقط" : "Women only",
    audienceMen: isArabic ? "للرجال فقط" : "Men only",
    yearsOld: isArabic ? "سنة فأكثر" : "years & above",
    registrationClosed: isArabic ? "تم إغلاق التسجيل" : "Registration closed",
    registrationClosedHint: isArabic
      ? "انتهى الوقت المتاح للتسجيل في هذه الورشة."
      : "The window to register for this workshop has ended.",
    fullyBooked: isArabic ? "اكتمل الحجز" : "Fully Booked",
    fullyBookedHint: isArabic
      ? "اكتملت جميع المقاعد لهذه الورشة، التسجيل غير متاح حالياً."
      : "All seats for this workshop are taken. Registration is not available.",
  };

  const title = isArabic && classData.titleAr ? classData.titleAr : classData.title;
  const description =
    (isArabic ? classData.descriptionAr : classData.description) ||
    (isArabic ? "لا يوجد وصف متاح حالياً." : "No description available.");
  const descriptionHtml = markdownToSafeHtml(description);

  const subCategory = classData.subCategory
    ? classData.subCategory
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ")
    : isArabic
      ? "متنوع"
      : "General";

  const audienceLabel = classData.audienceGender === 'FEMALE_ONLY'
    ? t.audienceWomen
    : classData.audienceGender === 'MALE_ONLY'
      ? t.audienceMen
      : t.audienceMixed;


  const classImages = Array.from(
    new Set(
      [classData.image, ...(classData.images || [])]
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
    )
  );
  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString(isArabic ? "ar-OM-u-nu-latn" : "en-OM", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: DISPLAY_TIMEZONE,
    });

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString(isArabic ? "ar-OM-u-nu-latn" : "en-OM", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DISPLAY_TIMEZONE,
    });
  const scheduleSessions = Array.isArray(classData.scheduleSessions) ? classData.scheduleSessions : [];
  const topCardSessions = scheduleSessions.length > 0
    ? scheduleSessions
    : classData.startDateTime
      ? [{ startDateTime: classData.startDateTime, endDateTime: classData.endDateTime ?? classData.startDateTime }]
      : [];

  return (
    <div className="route-sharp relative overflow-x-clip pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_20%_10%,rgba(250,116,98,0.18),transparent_45%),radial-gradient(circle_at_85%_18%,rgba(58,170,177,0.2),transparent_42%)]" />

      <section className="mx-auto w-full max-w-6xl px-4 pt-8 text-xs text-[color:var(--text-muted)] sm:text-sm">
        <nav
          aria-label="Breadcrumb"
          className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--muted)] px-3 py-1.5"
        >
          <Link href={`/${locale}/classes`} className="transition hover:text-[color:var(--text)]">
            {t.breadcrumbClasses}
          </Link>
          <span aria-hidden>•</span>
          <span className="max-w-[14rem] truncate text-[color:var(--text)] sm:max-w-[20rem]">
            {title}
          </span>
        </nav>
      </section>

      <section className="mx-auto mt-5 w-full max-w-6xl px-4">
        <div className="overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm">
          <div className="grid lg:grid-cols-2">
            <div className="order-1 flex flex-col items-center gap-4 p-4 sm:p-6 lg:order-2 lg:justify-center">
              <div className="w-full max-w-[28rem]">
                {classImages.length > 0 ? (
                  <ClassHeaderSlideshow
                    images={classImages}
                    alt={title}
                    className="mx-auto"
                    indicatorColor={isCooking ? "#cb8578" : "#7c5fb7"}
                  />
                ) : (
                  <div className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-[2.25rem] border border-[color:var(--border)] bg-[color:var(--muted)]">
                    <div className="flex h-full items-center justify-center">
                      <Icon className="h-28 w-28 text-[color:var(--text-subtle)]" />
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="order-2 flex min-h-[18rem] flex-col justify-center p-6 sm:min-h-[22rem] sm:p-8 lg:order-1 lg:min-h-[28rem] lg:p-10">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text)]">
                <Icon className={`h-4 w-4 ${isCooking ? "text-coral" : "text-purple"}`} />
                {t.category}: {isCooking ? t.cooking : t.artsCrafts}
              </div>

              <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-[color:var(--text)] sm:text-3xl lg:text-4xl">
                {title}
              </h1>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--text-muted)]">
                    <HiClock className="h-4 w-4 text-[color:var(--primary)]" />
                    {t.duration}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">
                    {formatDurationClock(classData.durationMinutes)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
                  <p className="text-xs font-medium text-[color:var(--text-muted)]">{t.subCategory}</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{subCategory}</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--text-muted)]">
                    <MdPerson className="h-4 w-4 text-[color:var(--primary)]" />
                    {t.audience}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{audienceLabel}</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--text-muted)]">
                    <HiStar className="h-4 w-4 text-yellow" />
                    {t.averageRating}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">
                    {averageRating > 0 ? `${averageRating.toFixed(1)} (${reviews.length})` : t.noReviews}
                  </p>
                </div>
                {classData.showMinimumAge && (classData.minimumAge != null || classData.maximumAge != null) && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20 sm:col-span-2">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      <HiShieldCheck className="h-4 w-4" />
                      {classData.minimumAge != null && classData.maximumAge != null ? t.ageRange : classData.minimumAge != null ? t.minimumAge : t.maximumAge}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {classData.minimumAge != null && classData.maximumAge != null
                        ? `${classData.minimumAge} - ${classData.maximumAge} ${isArabic ? 'سنة' : 'years'}`
                        : classData.minimumAge != null
                          ? `${classData.minimumAge}+ ${t.yearsOld}`
                          : `${isArabic ? 'حتى' : 'Up to'} ${classData.maximumAge} ${isArabic ? 'سنة' : 'years'}`}
                    </p>
                  </div>
                )}
                {!isEnded && topCardSessions.length > 0 ? (
                  <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                      {t.dateAndTime}
                    </p>
                    <div className="mt-2 space-y-2">
                      {topCardSessions.map((session, index) => (
                        <div
                          key={`${session.startDateTime}-${index}`}
                          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2"
                        >
                          {topCardSessions.length > 1 ? (
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                              {t.day} {index + 1}
                            </p>
                          ) : null}
                          <p className="mt-1 text-sm font-semibold text-[color:var(--text)] sm:text-base">
                            {formatDate(session.startDateTime)}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--text)] sm:text-base">
                            <MdAccessTime className="h-4 w-4" />
                            {formatTime(session.startDateTime)} - {formatTime(session.endDateTime)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {isEnded ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20 sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                      {t.workshopStatus}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-amber-900 dark:text-amber-100 sm:text-base">
                      {t.workshopEnded}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-800/90 dark:text-amber-100/80">
                      {t.noActiveSchedule}
                    </p>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-8 px-4 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-8">
          <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-2">
              <HiSparkles className={`h-5 w-5 ${isCooking ? "text-coral" : "text-purple"}`} />
              <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.classOverview}</h2>
            </div>
            <div
              className="mt-4 text-sm text-[color:var(--text-muted)] sm:text-base [&_a]:font-medium [&_blockquote]:text-[color:var(--text-muted)] [&_code]:text-[color:var(--text)] [&_h1]:text-[color:var(--text)] [&_h2]:text-[color:var(--text)] [&_h3]:text-[color:var(--text)] [&_h4]:text-[color:var(--text)] [&_h5]:text-[color:var(--text)] [&_h6]:text-[color:var(--text)] [&_li]:leading-7 [&_ol]:text-[color:var(--text-muted)] [&_p]:text-[color:var(--text-muted)] [&_pre]:my-4 [&_strong]:text-[color:var(--text)] [&_ul]:text-[color:var(--text-muted)]"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </article>

          {trainer ? (
            <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
              <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.trainerSection}</h2>
              {[trainer, ...(coTrainer ? [coTrainer] : [])].map((person) => (
                <Link
                  key={person.id}
                  href={`/${locale}/trainers/${person.id}`}
                  className="mt-5 flex items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 transition hover:shadow-md"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]">
                    {person.profileImage ? (
                      <Image
                        src={person.profileImage}
                        alt={person.fullName || "Trainer"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon className={`h-7 w-7 ${isCooking ? "text-coral" : "text-purple"}`} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[color:var(--text)]">{person.fullName}</p>
                    <p className={`mt-0.5 text-sm font-medium ${isCooking ? "text-coral" : "text-purple"}`}>
                      {t.viewProfile}
                    </p>
                  </div>
                </Link>
              ))}
            </article>
          ) : null}

          <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">{isEnded ? t.workshopStatus : t.schedule}</h2>
            {!isEnded && classData.startDateTime ? (
              <div className="mt-5">
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--text)] sm:text-base">
                    <MdCalendarMonth className={`h-4 w-4 ${isCooking ? "text-coral" : "text-purple"}`} />
                    {formatDate(classData.startDateTime)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[color:var(--text-muted)]">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--text)] sm:text-base">
                      <MdAccessTime className="h-4 w-4" />
                      {formatTime(classData.startDateTime)}
                    </span>
                  </div>
                  {scheduleSessions.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {scheduleSessions.map((session, index) => (
                        <div key={`${session.startDateTime}-${index}`} className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm">
                          <span className="font-medium text-[color:var(--text)]">{formatDate(session.startDateTime)}</span>
                          <span className="text-[color:var(--text-muted)]">{formatTime(session.startDateTime)} - {formatTime(session.endDateTime)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {registrationCloseAt && !registrationClosed ? (
                    <div className="mt-3">
                      <RegistrationCountdown
                        locale={locale}
                        closesAt={registrationCloseAt.toISOString()}
                      />
                    </div>
                  ) : null}
                  {registrationClosed ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                      {t.registrationClosed}
                    </div>
                  ) : isFullyBooked ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                      {t.fullyBooked}
                    </div>
                  ) : canBook ? (
                    <Link
                      href={`/${locale}/classes/${classData.slug}/book`}
                      className="mt-3 inline-flex items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] sm:text-sm"
                    >
                      {t.bookNow}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : isEnded ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t.workshopEnded}</p>
                <p className="mt-2 text-sm leading-6 text-amber-800/90 dark:text-amber-100/80">{t.noActiveSchedule}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">{t.noSchedule}</p>
            )}
          </article>

          <ClassReviewsSection
            classId={classData.id}
            locale={locale}
            isAuthenticated={Boolean(currentUser)}
            canReview={canWriteReview}
            loginHref={`/${locale}/login?next=${encodeURIComponent(`/${locale}/classes/${classData.slug}`)}`}
            initialReviews={reviews.map((review) => ({
              id: review.id,
              rating: review.rating,
              comment: review.comment,
              created_at: review.createdAt.toISOString(),
              user_full_name: review.user?.fullName ?? null,
              is_verified: true,
            }))}
            initialAverageRating={averageRating > 0 ? Number(averageRating.toFixed(2)) : null}
            initialViewerReview={viewerReview ? {
              id: viewerReview.id,
              rating: viewerReview.rating,
              comment: viewerReview.comment,
              created_at: viewerReview.created_at.toISOString(),
              user_full_name: viewerReview.user_full_name,
              is_verified: viewerReview.is_verified,
            } : null}
          />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <h3 className="text-xl font-semibold text-[color:var(--text)]">{isEnded ? t.repeatThisWorkshop : t.bookingCardTitle}</h3>

            <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-center">
              <p className={`text-3xl font-semibold ${isCooking ? "text-coral" : "text-purple"}`}>
                {formatAmountWithCurrency(classData.price, classData.currency, { locale })}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{isEnded ? t.lastPublishedPrice : t.perPerson}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:var(--text-muted)]">{isEnded ? t.repeatHint : t.bookingHint}</p>

            {!isEnded && registrationCloseAt && !registrationClosed ? (
              <div className="mt-4">
                <RegistrationCountdown
                  locale={locale}
                  closesAt={registrationCloseAt.toISOString()}
                />
              </div>
            ) : null}

            {canBook ? (
              <Link
                href={`/${locale}/classes/${classData.slug}/book`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
              >
                {t.secureSeatNow}
              </Link>
            ) : null}

            {registrationClosed ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {t.registrationClosed}
                <p className="mt-1 text-xs font-normal text-red-600/90 dark:text-red-300/80">
                  {t.registrationClosedHint}
                </p>
              </div>
            ) : null}

            {isFullyBooked ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {t.fullyBooked}
                <p className="mt-1 text-xs font-normal text-red-600/90 dark:text-red-300/80">
                  {t.fullyBookedHint}
                </p>
              </div>
            ) : null}

            {isEnded ? (
              <div className="mt-5">
                <RequestRepeatButton
                  classId={classData.id}
                  locale={locale}
                  initialCount={repeatSummaries[classData.id]?.requestsCount ?? 0}
                  initialRequested={repeatSummaries[classData.id]?.requestedByCurrentUser ?? false}
                />
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
