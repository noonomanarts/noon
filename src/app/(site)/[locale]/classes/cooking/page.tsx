import { isLocale, type Locale } from "@/lib/locale";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";

export default async function CookingClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Fetch published cooking classes with upcoming sessions
  const classes = await prisma.class.findMany({
    where: {
      category: "COOKING",
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

  // Group by sub-category
  const groupedClasses: Record<string, typeof classes> = {};
  classes.forEach((cls) => {
    if (!groupedClasses[cls.subCategory]) {
      groupedClasses[cls.subCategory] = [];
    }
    groupedClasses[cls.subCategory].push(cls);
  });

  const subCategoryLabels: Record<string, { en: string; ar: string }> = {
    APPETIZERS_SNACKS: { en: "Appetizers & Snacks", ar: "المقبلات والوجبات الخفيفة" },
    MAIN_DISHES: { en: "Main Dishes", ar: "الأطباق الرئيسية" },
    DESSERTS_BAKING: { en: "Desserts & Baking", ar: "الحلويات والمعجنات" },
    MOM_AND_KID: { en: "Mom & Kid", ar: "الأم والطفل" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
            </svg>
            Cooking Classes
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {locale === "ar" ? "دورات الطبخ" : "Cooking Classes"}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            {locale === "ar"
              ? "تعلم فن الطبخ مع مدربينا المحترفين في مطبخ نون"
              : "Learn the art of cooking with our professional trainers at Noon Kitchen"}
          </p>
        </div>

        {/* Classes by Sub-Category */}
        {Object.entries(groupedClasses).map(([subCategory, categoryClasses]) => (
          <section key={subCategory} className="mb-20">
            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-zinc-700"></div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                {subCategoryLabels[subCategory]?.[locale] || subCategory}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-zinc-700"></div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {categoryClasses.map((classItem) => {
                const nextSession = classItem.sessions[0];
                
                return (
                  <Link
                    key={classItem.id}
                    href={`/${locale}/classes/${classItem.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {/* Class Image */}
                    {classItem.image && (
                      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-950 dark:to-red-950">
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
                            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
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
                          <div className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-orange-100 dark:ring-orange-900/30">
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
                        <div className="mb-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 p-3 dark:from-orange-950/30 dark:to-red-950/30">
                          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {locale === "ar" ? "الجلسة القادمة" : "Next Session"}
                          </div>
                          <div className="text-sm font-semibold text-orange-900 dark:text-orange-300">
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
                      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:from-orange-700 hover:to-red-700 hover:shadow-xl dark:from-orange-500 dark:to-red-500">
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

            {categoryClasses.length === 0 && (
              <div className="py-12 text-center">
                <div className="inline-flex flex-col items-center">
                  <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                    <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {locale === "ar"
                      ? "لا توجد دورات متاحة حالياً في هذا القسم"
                      : "No classes available in this category at the moment"}
                  </p>
                </div>
              </div>
            )}
          </section>
        ))}

        {classes.length === 0 && (
          <div className="py-20 text-center">
            <div className="inline-flex flex-col items-center">
              <div className="mb-6 rounded-full bg-orange-100 p-6 dark:bg-orange-900/30">
                <svg className="h-12 w-12 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
