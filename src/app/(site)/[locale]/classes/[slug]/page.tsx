import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GiChefToque } from "react-icons/gi";
import { HiPaintBrush, HiClock, HiUsers, HiStar } from "react-icons/hi2";
import { MdCalendarMonth, MdAccessTime, MdPerson } from "react-icons/md";

import { findClassBySlug, findClassSessions, findClassReviews } from "@/lib/db/classes";
import { findTrainerById } from "@/lib/db/trainers";
import { ClassCategory } from "@/lib/db/types";
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
    category: isArabic ? "التصنيف" : "Category",
    cooking: isArabic ? "طبخ" : "Cooking",
    artsCrafts: isArabic ? "فنون وحرف" : "Arts & Crafts",
    duration: isArabic ? "المدة" : "Duration",
    minutes: isArabic ? "دقيقة" : "min",
    seatsAvailable: isArabic ? "مقاعد متاحة" : "seats available",
    noUpcomingSessions:
      isArabic ? "لا توجد جلسات متاحة حالياً" : "No upcoming sessions available",
    aboutClass: isArabic ? "عن الدورة" : "About This Class",
    trainer: isArabic ? "المدرب" : "Trainer",
    viewProfile: isArabic ? "عرض الملف الشخصي" : "View Profile",
    reviews: isArabic ? "التقييمات" : "Reviews",
    noReviews: isArabic ? "لا توجد تقييمات بعد" : "No reviews yet",
    perPerson: isArabic ? "للشخص" : "per person",
    selectSession: isArabic ? "اختر الجلسة" : "Select Session",
    bookNow: isArabic ? "احجز الآن" : "Book Now",
    upcomingSessions: isArabic ? "الجلسات القادمة" : "Upcoming Sessions",
  };

  const title = isArabic && classData.titleAr ? classData.titleAr : classData.title;
  const description =
    (isArabic ? classData.descriptionAr : classData.description) ||
    (isArabic ? "لا يوجد وصف متاح حالياً." : "No description available.");

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
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]">
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-coral/20 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 pt-8">
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm">
          <div className="relative h-[24rem] sm:h-[28rem]">
            {classData.image ? (
              <Image src={classData.image} alt={title} fill priority className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-[color:var(--muted)]">
                <Icon className="h-28 w-28 text-[color:var(--text-subtle)]" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface)]/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text)] shadow-sm">
                <Icon className={`h-4 w-4 ${isCooking ? "text-coral" : "text-purple"}`} />
                {t.category}: {isCooking ? t.cooking : t.artsCrafts}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                {title}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-black/35 px-3 py-1 text-white backdrop-blur-sm">
                  <HiClock className="h-4 w-4" />
                  {t.duration}: {classData.durationMinutes ?? 0} {t.minutes}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-black/35 px-3 py-1 text-white backdrop-blur-sm">
                  <HiUsers className="h-4 w-4" />
                  {classData.seatsTotal} {t.seatsAvailable}
                </span>
                {averageRating > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-black/35 px-3 py-1 text-white backdrop-blur-sm">
                    <HiStar className="h-4 w-4 text-yellow" />
                    {averageRating.toFixed(1)} ({reviews.length})
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-8 px-4 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-8">
          <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.aboutClass}</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
              {description}
            </p>
          </article>

          {trainer ? (
            <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
              <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.trainer}</h2>
              <Link
                href={`/${locale}/trainers/${trainer.id}`}
                className="mt-5 flex items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 transition hover:shadow-md"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]">
                  {trainer.profileImage ? (
                    <Image src={trainer.profileImage} alt={trainer.fullName || "Trainer"} fill className="object-cover" />
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
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">
              {t.reviews} ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">{t.noReviews}</p>
            ) : (
              <div className="mt-5 space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4"
                  >
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
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                        {review.comment}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-[color:var(--text-subtle)]">
                      {new Date(review.createdAt).toLocaleDateString(isArabic ? "ar-OM" : "en-OM")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-7">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4 text-center">
              <p className={`text-3xl font-semibold ${isCooking ? "text-coral" : "text-purple"}`}>
                {classData.price.toFixed(3)} {classData.currency}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{t.perPerson}</p>
            </div>

            <h3 className="mt-6 text-lg font-semibold text-[color:var(--text)]">{t.upcomingSessions}</h3>
            {sessions.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--text-muted)]">{t.noUpcomingSessions}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/${locale}/classes/${classData.slug}/book?session=${session.id}`}
                    className="block rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] p-3 transition hover:shadow-sm"
                  >
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--text)]">
                      <MdCalendarMonth className={`h-4 w-4 ${isCooking ? "text-coral" : "text-purple"}`} />
                      {formatDate(session.startTime)}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <MdAccessTime className="h-4 w-4" />
                        {formatTime(session.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MdPerson className="h-4 w-4" />
                        {session.seatsAvailable} {t.seatsAvailable}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {sessions.length > 0 ? (
              <Link
                href={`/${locale}/classes/${classData.slug}/book?session=${sessions[0]?.id}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
              >
                {t.bookNow}
              </Link>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
