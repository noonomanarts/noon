import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GiChefToque } from "react-icons/gi";
import { HiPaintBrush, HiClock, HiUsers, HiStar, HiSparkles } from "react-icons/hi2";
import { MdCalendarMonth, MdAccessTime, MdPerson } from "react-icons/md";

import { findClassBySlug, findClassSessions, findClassReviews } from "@/lib/db/classes";
import { findTrainerById } from "@/lib/db/trainers";
import { ClassCategory } from "@/lib/db/types";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { isLocale, type Locale } from "@/lib/locale";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const classData = await findClassBySlug(slug);
  if (!classData || classData.status !== "PUBLISHED") {
    notFound();
  }

  const [sessions, reviews, trainer] = await Promise.all([
    findClassSessions(classData.id, { upcomingOnly: true, limit: 10 }),
    findClassReviews(classData.id),
    classData.trainerId ? findTrainerById(classData.trainerId) : Promise.resolve(null),
  ]);

  const isCooking = classData.category === ClassCategory.COOKING;
  const Icon = isCooking ? GiChefToque : HiPaintBrush;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / reviews.length
      : 0;

  const t = {
    breadcrumbClasses: isArabic ? "الدورات" : "Classes",
    category: isArabic ? "التصنيف" : "Category",
    cooking: isArabic ? "طبخ" : "Cooking",
    artsCrafts: isArabic ? "فنون وحرف" : "Arts & Crafts",
    subCategory: isArabic ? "القسم" : "Section",
    duration: isArabic ? "المدة" : "Duration",
    minutes: isArabic ? "دقيقة" : "min",
    seatsAvailable: isArabic ? "مقاعد متاحة" : "seats available",
    totalSeats: isArabic ? "إجمالي المقاعد" : "Total seats",
    averageRating: isArabic ? "متوسط التقييم" : "Average rating",
    noUpcomingSessions:
      isArabic ? "لا توجد جلسات متاحة حالياً" : "No upcoming sessions available",
    classOverview: isArabic ? "نظرة عامة" : "Class Overview",
    bookingCardTitle: isArabic ? "الحجز" : "Booking",
    whatYouWillLearn: isArabic ? "ماذا ستتعلم" : "What you will learn",
    dateAndTime: isArabic ? "التاريخ والوقت" : "Date and time",
    trainerSection: isArabic ? "يقود الدورة" : "Led by",
    secureSeatNow: isArabic ? "ثبّت حجزك الآن" : "Secure your seat now",
    viewProfile: isArabic ? "عرض الملف الشخصي" : "View Profile",
    reviews: isArabic ? "التقييمات" : "Reviews",
    noReviews: isArabic ? "لا توجد تقييمات بعد" : "No reviews yet",
    perPerson: isArabic ? "للشخص" : "per person",
    bookingHint:
      isArabic
        ? "اختر الجلسة المناسبة من القائمة ثم أكمل الحجز خلال ثوانٍ."
        : "Pick a suitable session from the list and complete booking in seconds.",
    byVerifiedAttendees: isArabic ? "تقييمات من الحضور" : "Feedback from attendees",
    bookNow: isArabic ? "احجز الآن" : "Book Now",
    upcomingSessions: isArabic ? "الجلسات القادمة" : "Upcoming Sessions",
  };

  const title = isArabic && classData.titleAr ? classData.titleAr : classData.title;
  const description =
    (isArabic ? classData.descriptionAr : classData.description) ||
    (isArabic ? "لا يوجد وصف متاح حالياً." : "No description available.");

  const subCategory = classData.subCategory
    ? classData.subCategory
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ")
    : isArabic
      ? "متنوع"
      : "General";

  const nextSession = sessions[0] ?? null;
  const learningHighlights = description
    .split(/[\n\.!؟،؛]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8)
    .slice(0, 4);

  if (learningHighlights.length === 0) {
    learningHighlights.push(
      ...(isArabic
        ? [
            "تطبيق عملي خطوة بخطوة داخل الورشة.",
            "تعلّم تقنيات احترافية قابلة للتطبيق في المنزل.",
            "نصائح مباشرة من المدرب لتحسين النتائج.",
          ]
        : [
            "Hands-on practice with guided steps.",
            "Professional techniques you can apply at home.",
            "Direct trainer tips to improve your results.",
          ])
    );
  }

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString(isArabic ? "ar-OM" : "en-OM", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString(isArabic ? "ar-OM" : "en-OM", {
      hour: "2-digit",
      minute: "2-digit",
    });

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
            <div className="relative order-1 aspect-[4/3] min-h-[16rem] sm:min-h-[22rem] lg:order-2 lg:aspect-auto lg:min-h-[28rem]">
              {classData.image ? (
                <Image src={classData.image} alt={title} fill priority className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-[color:var(--muted)]">
                  <Icon className="h-28 w-28 text-[color:var(--text-subtle)]" />
                </div>
              )}

              {nextSession ? (
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/30 bg-black/45 p-3 text-white backdrop-blur sm:p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/80">
                    {t.dateAndTime}
                  </p>
                  <p className="mt-1 text-sm font-semibold sm:text-base">
                    {formatDate(nextSession.startTime)}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-white/90 sm:text-sm">
                    <MdAccessTime className="h-4 w-4" />
                    {formatTime(nextSession.startTime)}
                  </p>
                </div>
              ) : null}
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
                    {classData.durationMinutes ?? 0} {t.minutes}
                  </p>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--text-muted)]">
                    <HiUsers className="h-4 w-4 text-[color:var(--primary)]" />
                    {t.totalSeats}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{classData.seatsTotal}</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
                  <p className="text-xs font-medium text-[color:var(--text-muted)]">{t.subCategory}</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{subCategory}</p>
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
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
              {description}
            </p>
          </article>

          <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.whatYouWillLearn}</h2>
            <div className="mt-4 grid gap-3">
              {learningHighlights.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3"
                >
                  <p className="text-sm leading-7 text-[color:var(--text)] sm:text-base">{item}</p>
                </div>
              ))}
            </div>
          </article>

          {trainer ? (
            <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
              <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.trainerSection}</h2>
              <Link
                href={`/${locale}/trainers/${trainer.id}`}
                className="mt-5 flex items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 transition hover:shadow-md"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]">
                  {trainer.profileImage ? (
                    <Image
                      src={trainer.profileImage}
                      alt={trainer.fullName || "Trainer"}
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
                  <p className="text-base font-semibold text-[color:var(--text)]">{trainer.fullName}</p>
                  <p className={`mt-0.5 text-sm font-medium ${isCooking ? "text-coral" : "text-purple"}`}>
                    {t.viewProfile}
                  </p>
                </div>
              </Link>
            </article>
          ) : null}

          <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.upcomingSessions}</h2>
            {sessions.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">{t.noUpcomingSessions}</p>
            ) : (
              <div className="mt-5 grid gap-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4"
                  >
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--text)] sm:text-base">
                      <MdCalendarMonth className={`h-4 w-4 ${isCooking ? "text-coral" : "text-purple"}`} />
                      {formatDate(session.startTime)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-muted)] sm:text-sm">
                      <span className="inline-flex items-center gap-1">
                        <MdAccessTime className="h-4 w-4" />
                        {formatTime(session.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MdPerson className="h-4 w-4" />
                        {session.seatsAvailable} {t.seatsAvailable}
                      </span>
                    </div>
                    <Link
                      href={`/${locale}/classes/${classData.slug}/book?session=${session.id}`}
                      className="mt-3 inline-flex items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] sm:text-sm"
                    >
                      {t.bookNow}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">
              {t.reviews} ({reviews.length})
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.byVerifiedAttendees}</p>
            {reviews.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">{t.noReviews}</p>
            ) : (
              <div className="mt-5 grid gap-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <HiStar
                            key={`${review.id}-${index}`}
                            className={`h-4 w-4 ${
                              index < (review.rating || 0)
                                ? "text-yellow"
                                : "text-[color:var(--text-subtle)]"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[color:var(--text-subtle)]">
                        {new Date(review.createdAt).toLocaleDateString(isArabic ? "ar-OM" : "en-OM")}
                      </p>
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{review.comment}</p>
                    ) : null}
                    {review.user?.fullName ? (
                      <p className="mt-2 text-xs font-medium text-[color:var(--text)]">{review.user.fullName}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <h3 className="text-xl font-semibold text-[color:var(--text)]">{t.bookingCardTitle}</h3>

            <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-center">
              <p className={`text-3xl font-semibold ${isCooking ? "text-coral" : "text-purple"}`}>
                {formatAmountWithCurrency(classData.price, classData.currency, { locale })}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{t.perPerson}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:var(--text-muted)]">{t.bookingHint}</p>

            {sessions.length > 0 ? (
              <Link
                href={`/${locale}/classes/${classData.slug}/book?session=${sessions[0]?.id}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
              >
                {t.secureSeatNow}
              </Link>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
