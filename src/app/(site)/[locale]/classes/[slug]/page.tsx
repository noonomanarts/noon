import { isLocale, type Locale } from "@/lib/locale";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type Params = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ClassDetailsPage({ params }: Params) {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Fetch class with sessions
  const classData = await prisma.class.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      trainer: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          email: true,
        },
      },
      sessions: {
        where: {
          startDateTime: { gte: new Date() },
          isCancelled: false,
        },
        orderBy: { startDateTime: "asc" },
        include: {
          bookings: {
            select: {
              numberOfParticipants: true,
            },
          },
        },
      },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!classData) {
    notFound();
  }

  // Calculate average rating
  const avgRating =
    classData.reviews.length > 0
      ? classData.reviews.reduce((sum, r) => sum + r.rating, 0) /
        classData.reviews.length
      : 0;

  // Get the category color theme
  const colorScheme = classData.category === "COOKING" 
    ? { from: "from-orange-600", to: "to-red-600", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" }
    : { from: "from-purple-600", to: "to-pink-600", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href={`/${locale}`} className="transition hover:text-zinc-900 dark:hover:text-white">
            {locale === "ar" ? "الرئيسية" : "Home"}
          </Link>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/${locale}/classes`} className="transition hover:text-zinc-900 dark:hover:text-white">
            {locale === "ar" ? "الدورات" : "Classes"}
          </Link>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link
            href={`/${locale}/classes/${classData.category === "COOKING" ? "cooking" : "arts-crafts"}`}
            className="transition hover:text-zinc-900 dark:hover:text-white"
          >
            {classData.category === "COOKING"
              ? locale === "ar"
                ? "دورات الطبخ"
                : "Cooking"
              : locale === "ar"
                ? "الفنون والأشغال"
                : "Arts & Crafts"}
          </Link>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-zinc-900 dark:text-white">
            {locale === "ar" && classData.titleAr
              ? classData.titleAr
              : classData.title}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Main Image */}
            {classData.image && (
              <div className="relative mb-8 h-[32rem] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-2xl dark:border-zinc-800">
                <Image
                  src={classData.image}
                  alt={
                    locale === "ar" && classData.titleAr
                      ? classData.titleAr
                      : classData.title
                  }
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0"></div>
                
                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${colorScheme.badge}`}>
                      {classData.category === "COOKING"
                        ? locale === "ar" ? "طبخ" : "Cooking"
                        : locale === "ar" ? "فنون" : "Arts & Crafts"}
                    </span>
                    <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                      {classData.subCategory.replace("_", " ")}
                    </span>
                    {avgRating > 0 && (
                      <div className="flex items-center gap-1 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
                        <span className="text-yellow-400">★</span>
                        <span className="text-sm font-semibold text-white">{avgRating.toFixed(1)}</span>
                        <span className="text-sm text-white/80">
                          ({classData.reviews.length})
                        </span>
                      </div>
                    )}
                  </div>
                  <h1 className="text-4xl font-bold text-white md:text-5xl">
                    {locale === "ar" && classData.titleAr
                      ? classData.titleAr
                      : classData.title}
                  </h1>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
                {locale === "ar" ? "عن الدورة" : "About This Class"}
              </h2>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                {locale === "ar" && classData.descriptionAr
                  ? classData.descriptionAr
                  : classData.description}
              </p>
            </div>

            {/* Class Details */}
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-6 shadow-lg dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900/50">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {locale === "ar" ? "المدة" : "Duration"}
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {classData.durationMinutes} {locale === "ar" ? "دقيقة" : "minutes"}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-6 shadow-lg dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900/50">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {locale === "ar" ? "السعر" : "Price"}
                </div>
                <div className={`text-3xl font-bold bg-gradient-to-r ${colorScheme.from} ${colorScheme.to} bg-clip-text text-transparent`}>
                  {classData.price} {classData.currency}
                </div>
              </div>
            </div>

            {/* Trainer Info */}
            <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <div className="bg-gradient-to-r from-zinc-50 to-white p-6 dark:from-zinc-800 dark:to-zinc-900">
                <h2 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
                  {locale === "ar" ? "المدرب" : "Your Trainer"}
                </h2>
                <div className="flex items-center gap-4">
                  {classData.trainer.profileImage && (
                    <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-zinc-200 dark:ring-zinc-700">
                      <Image
                        src={classData.trainer.profileImage}
                        alt={classData.trainer.fullName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="mb-1 text-xl font-bold text-zinc-900 dark:text-white">
                      {classData.trainer.fullName}
                    </div>
                    <Link
                      href={`/${locale}/trainers/${classData.trainer.id}`}
                      className={`inline-flex items-center gap-1 font-semibold transition bg-gradient-to-r ${colorScheme.from} ${colorScheme.to} bg-clip-text text-transparent hover:opacity-80`}
                    >
                      {locale === "ar" ? "عرض الملف الشخصي" : "View Profile"}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews */}
            {classData.reviews.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
                  {locale === "ar" ? "التقييمات" : "Reviews"}
                </h2>
                <div className="space-y-4">
                  {classData.reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex gap-1 text-xl text-yellow-500 dark:text-yellow-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                          ))}
                        </div>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          {new Date(review.createdAt).toLocaleDateString(
                            locale === "ar" ? "ar-SA" : "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-zinc-600 dark:text-zinc-400">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Available Sessions */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className={`bg-gradient-to-r ${colorScheme.from} ${colorScheme.to} p-6`}>
                <h3 className="text-xl font-bold text-white">
                  {locale === "ar" ? "الجلسات المتاحة" : "Available Sessions"}
                </h3>
              </div>

              <div className="p-6">
                {classData.sessions.length > 0 ? (
                  <div className="space-y-4">
                    {classData.sessions.map((session) => {
                      const bookedSeats = session.bookings.reduce(
                        (sum, b) => sum + b.numberOfParticipants,
                        0
                      );
                      const availableSeats =
                        (session.seatsTotal || classData.seatsTotal) - bookedSeats;
                      const isFull = availableSeats <= 0;

                      return (
                        <div
                          key={session.id}
                          className={`rounded-xl border p-4 transition ${
                            isFull 
                              ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50" 
                              : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/30 dark:from-emerald-950/30 dark:to-zinc-900"
                          }`}
                        >
                          <div className="mb-2 font-bold text-zinc-900 dark:text-white">
                            {new Date(session.startDateTime).toLocaleDateString(
                              locale === "ar" ? "ar-SA" : "en-US",
                              {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </div>
                          <div className="mb-3 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(session.startDateTime).toLocaleTimeString(
                              locale === "ar" ? "ar-SA" : "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}{" "}
                            -{" "}
                            {new Date(session.endDateTime).toLocaleTimeString(
                              locale === "ar" ? "ar-SA" : "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </div>
                          <div className="mb-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
                                isFull 
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }`}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {availableSeats}{" "}
                              {locale === "ar" ? "مقعد متاح" : "seats available"}
                            </span>
                          </div>
                          <Link
                            href={
                              isFull
                                ? "#"
                                : `/${locale}/classes/${classData.slug}/book?sessionId=${session.id}`
                            }
                            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold shadow-lg transition ${
                              isFull
                                ? "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500"
                                : `bg-gradient-to-r ${colorScheme.from} ${colorScheme.to} text-white hover:shadow-xl hover:scale-105`
                            }`}
                          >
                            {isFull ? (
                              <>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {locale === "ar" ? "ممتلئ" : "Full"}
                              </>
                            ) : (
                              <>
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {locale === "ar" ? "احجز الآن" : "Book Now"}
                              </>
                            )}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="mb-4 inline-flex rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                      <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {locale === "ar"
                        ? "لا توجد جلسات متاحة حالياً"
                        : "No sessions available"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                      {locale === "ar"
                        ? "تابعونا للحصول على التحديثات!"
                        : "Check back soon!"}
                    </p>
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
