import { isLocale, type Locale } from "@/lib/locale";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { GiChefToque } from "react-icons/gi";
import { HiPaintBrush, HiClock, HiUsers, HiStar } from "react-icons/hi2";
import { MdCalendarMonth, MdAccessTime, MdPerson } from "react-icons/md";
import { findClassBySlug, findClassSessions, findClassReviews } from "@/lib/db/classes";
import { findTrainerById } from "@/lib/db/trainers";
import { ClassCategory } from "@/lib/db/types";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Fetch class by slug
  const classData = await findClassBySlug(slug);

  if (!classData || classData.status !== "PUBLISHED") {
    notFound();
  }

  // Fetch sessions
  const sessions = await findClassSessions(classData.id, {
    upcomingOnly: true,
    limit: 10,
  });

  // Fetch trainer if exists
  const trainer = classData.trainerId
    ? await findTrainerById(classData.trainerId)
    : null;

  // Fetch reviews
  const reviews = await findClassReviews(classData.id);

  const isCooking = classData.category === ClassCategory.COOKING;

  const t = {
    bookNow: locale === "ar" ? "احجز الآن" : "Book Now",
    perPerson: locale === "ar" ? "للشخص" : "per person",
    duration: locale === "ar" ? "المدة" : "Duration",
    minutes: locale === "ar" ? "دقيقة" : "minutes",
    upcomingSessions: locale === "ar" ? "الجلسات القادمة" : "Upcoming Sessions",
    noUpcomingSessions:
      locale === "ar"
        ? "لا توجد جلسات متاحة حالياً"
        : "No upcoming sessions available",
    aboutClass: locale === "ar" ? "عن الدرس" : "About This Class",
    trainer: locale === "ar" ? "المدرب" : "Trainer",
    viewProfile: locale === "ar" ? "عرض الملف الشخصي" : "View Profile",
    reviews: locale === "ar" ? "التقييمات" : "Reviews",
    noReviews: locale === "ar" ? "لا توجد تقييمات بعد" : "No reviews yet",
    seatsAvailable: locale === "ar" ? "مقاعد متاحة" : "seats available",
    selectSession: locale === "ar" ? "اختر جلسة" : "Select Session",
    cooking: locale === "ar" ? "طبخ" : "Cooking",
    artsCrafts: locale === "ar" ? "فنون وحرف" : "Arts & Crafts",
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(locale === "ar" ? "ar-OM" : "en-OM", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString(locale === "ar" ? "ar-OM" : "en-OM", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
        {classData.image ? (
          <Image
            src={classData.image}
            alt={classData.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${
              isCooking ? "from-coral to-coral-light" : "from-purple to-purple-light"
            }`}
          >
            {isCooking ? (
              <GiChefToque className="h-48 w-48 text-white opacity-30" />
            ) : (
              <HiPaintBrush className="h-48 w-48 text-white opacity-30" />
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content on Hero */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mx-auto max-w-7xl">
            <div
              className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${
                isCooking ? "bg-coral" : "bg-purple"
              }`}
            >
              {isCooking ? (
                <GiChefToque className="h-5 w-5" />
              ) : (
                <HiPaintBrush className="h-5 w-5" />
              )}
              {isCooking ? t.cooking : t.artsCrafts}
            </div>
            <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
              {locale === "ar" && classData.titleAr ? classData.titleAr : classData.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <HiClock className="h-5 w-5" />
                <span>
                  {classData.durationMinutes} {t.minutes}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <HiUsers className="h-5 w-5" />
                <span>{classData.seatsTotal} {t.seatsAvailable}</span>
              </div>
              {averageRating > 0 && (
                <div className="flex items-center gap-2">
                  <HiStar className="h-5 w-5 text-yellow" />
                  <span>{averageRating.toFixed(1)} ({reviews.length})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Left Column - Details */}
          <div className="lg:col-span-2">
            {/* About */}
            <section className="mb-12">
              <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                {t.aboutClass}
              </h2>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="whitespace-pre-line leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {locale === "ar" && classData.descriptionAr
                    ? classData.descriptionAr
                    : classData.description || "No description available."}
                </p>
              </div>
            </section>

            {/* Trainer */}
            {trainer && (
              <section className="mb-12">
                <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                  {t.trainer}
                </h2>
                <Link
                  href={`/${locale}/trainers/${trainer.id}`}
                  className="group flex items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-full">
                    {trainer.profileImage ? (
                      <Image
                        src={trainer.profileImage}
                        alt={trainer.fullName || "Trainer"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center ${
                          isCooking ? "bg-coral" : "bg-purple"
                        }`}
                      >
                        <GiChefToque className="h-10 w-10 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {trainer.fullName}
                    </h3>
                    <p
                      className={`font-semibold ${
                        isCooking ? "text-coral" : "text-purple"
                      } group-hover:underline`}
                    >
                      {t.viewProfile} →
                    </p>
                  </div>
                </Link>
              </section>
            )}

            {/* Reviews */}
            <section>
              <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                {t.reviews} ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-zinc-600 dark:text-zinc-400">{t.noReviews}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <HiStar
                            key={i}
                            className={`h-5 w-5 ${
                              i < (review.rating || 0) ? "text-yellow" : "text-zinc-300"
                            }`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-zinc-700 dark:text-zinc-300">{review.comment}</p>
                      )}
                      <p className="mt-2 text-sm text-zinc-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Booking */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Price Card */}
              <div className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-6 text-center">
                  <div
                    className={`text-4xl font-bold ${
                      isCooking ? "text-coral" : "text-purple"
                    }`}
                  >
                    {classData.price} {classData.currency}
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">{t.perPerson}</p>
                </div>

                <h3 className="mb-4 font-bold text-zinc-900 dark:text-white">
                  {t.selectSession}
                </h3>

                {sessions.length === 0 ? (
                  <p className="text-center text-zinc-600 dark:text-zinc-400">
                    {t.noUpcomingSessions}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/${locale}/cart?session=${session.id}`}
                        className={`block rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                          isCooking
                            ? "border-coral/30 hover:border-coral"
                            : "border-purple/30 hover:border-purple"
                        } dark:border-zinc-700 dark:hover:border-zinc-500`}
                      >
                        <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-white">
                          <MdCalendarMonth
                            className={`h-5 w-5 ${
                              isCooking ? "text-coral" : "text-purple"
                            }`}
                          />
                          {formatDate(session.startTime)}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <MdAccessTime className="h-4 w-4" />
                            {formatTime(session.startTime)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MdPerson className="h-4 w-4" />
                            {session.seatsAvailable} {t.seatsAvailable}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
