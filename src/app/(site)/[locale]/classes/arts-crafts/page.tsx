import { isLocale, type Locale } from "@/lib/locale";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";

export default async function ArtsCraftsClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Fetch published arts & crafts classes with upcoming sessions
  const classes = await prisma.class.findMany({
    where: {
      category: "ARTS_CRAFTS",
      status: "PUBLISHED",
    },
    include: {
      trainer: {
        select: {
          fullName: true,
          profileImage: true,
        },
      },
      sessions: {
        where: {
          startDateTime: { gte: new Date() },
          isCancelled: false,
        },
        orderBy: { startDateTime: "asc" },
        take: 3,
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
            Arts & Crafts Classes
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {locale === "ar" ? "الفنون والأشغال اليدوية" : "Arts & Crafts Classes"}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            {locale === "ar"
              ? "اكتشف إبداعك مع دوراتنا الفنية والحرفية"
              : "Discover your creativity with our arts and crafts classes"}
          </p>
        </div>

        {/* Classes Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => {
            const nextSession = classItem.sessions[0];
            
            return (
              <Link
                key={classItem.id}
                href={`/${locale}/classes/${classItem.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Class Image */}
                {classItem.image && (
                  <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-pink-950">
                    <Image
                      src={classItem.image}
                      alt={locale === "ar" && classItem.titleAr ? classItem.titleAr : classItem.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>
                    
                    {/* Price Badge */}
                    <div className="absolute right-4 top-4">
                      <div className="rounded-full bg-white/95 px-4 py-2 backdrop-blur-sm dark:bg-zinc-900/95">
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {classItem.price}
                        </span>
                        <span className="ml-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                          {classItem.currency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Class Info */}
                <div className="p-6">
                  <h3 className="mb-3 line-clamp-2 text-xl font-bold text-zinc-900 dark:text-white">
                    {locale === "ar" && classItem.titleAr
                      ? classItem.titleAr
                      : classItem.title}
                  </h3>

                  {/* Trainer */}
                  <div className="mb-3 flex items-center gap-2">
                    {classItem.trainer.profileImage && (
                      <div className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-purple-100 dark:ring-purple-900/30">
                        <Image
                          src={classItem.trainer.profileImage}
                          alt={classItem.trainer.fullName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      {classItem.trainer.fullName}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mb-4 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {locale === "ar" && classItem.descriptionAr
                      ? classItem.descriptionAr
                      : classItem.description}
                  </p>

                  {/* Next Session */}
                  {nextSession && (
                    <div className="mb-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 p-3 dark:from-purple-950/30 dark:to-pink-950/30">
                      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {locale === "ar" ? "الجلسة القادمة" : "Next Session"}
                      </div>
                      <div className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                        {new Date(nextSession.startDateTime).toLocaleDateString(
                          locale === "ar" ? "ar-SA" : "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* Book Button */}
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-xl dark:from-purple-500 dark:to-pink-500">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {locale === "ar" ? "احجز الآن" : "Book Now"}
                  </button>
                </div>
              </Link>
            );
          })}
        </div>

        {classes.length === 0 && (
          <div className="py-20 text-center">
            <div className="inline-flex flex-col items-center">
              <div className="mb-6 rounded-full bg-purple-100 p-6 dark:bg-purple-900/30">
                <svg className="h-12 w-12 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
                {locale === "ar" ? "لا توجد دورات متاحة حالياً" : "No Classes Available"}
              </h3>
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                {locale === "ar"
                  ? "تابعونا للحصول على التحديثات!"
                  : "Stay tuned for updates!"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
