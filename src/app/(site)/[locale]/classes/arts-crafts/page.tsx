import { isLocale, type Locale } from "@/lib/locale";
import Image from "next/image";
import Link from "next/link";
import { MdCalendarMonth, MdAccessTime, MdPerson } from "react-icons/md";
import { HiSparkles, HiPaintBrush } from "react-icons/hi2";
import { findManyClasses, findClassSessions } from "@/lib/db/classes";
import { ClassCategory } from "@/lib/db/types";

export default async function ArtsCraftsClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Fetch arts & crafts classes
  const classes = await findManyClasses({
    category: ClassCategory.ARTS_CRAFTS,
    status: "PUBLISHED",
  });

  // Get upcoming sessions for each class
  const classesWithSessions = await Promise.all(
    classes.map(async (cls) => {
      const sessions = await findClassSessions(cls.id, {
        upcomingOnly: true,
        limit: 3,
      });
      return { ...cls, sessions };
    })
  );

  const t = {
    title: locale === "ar" ? "دروس الفنون والحرف" : "Arts & Crafts Classes",
    subtitle:
      locale === "ar"
        ? "أطلق العنان لإبداعك مع ورش عمل فنية متنوعة"
        : "Unleash your creativity with diverse artistic workshops",
    bookNow: locale === "ar" ? "احجز الآن" : "Book Now",
    perPerson: locale === "ar" ? "للشخص" : "per person",
    seats: locale === "ar" ? "مقاعد" : "seats",
    available: locale === "ar" ? "متاح" : "available",
    noClasses:
      locale === "ar"
        ? "لا توجد دروس فنون وحرف متاحة حالياً"
        : "No arts & crafts classes available at the moment",
    duration: locale === "ar" ? "المدة" : "Duration",
    minutes: locale === "ar" ? "دقيقة" : "min",
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(locale === "ar" ? "ar-OM" : "en-OM", {
      weekday: "short",
      month: "short",
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple to-purple-dark py-20">
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/20 px-6 py-3 text-lg font-semibold text-white backdrop-blur-sm">
            <HiPaintBrush className="h-7 w-7" />
            {t.title}
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            {t.title}
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-white/90">{t.subtitle}</p>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="mx-auto max-w-7xl px-4 py-16">
        {classesWithSessions.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <HiPaintBrush className="mx-auto mb-4 h-16 w-16 text-zinc-400" />
            <p className="text-xl text-zinc-600 dark:text-zinc-400">{t.noClasses}</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {classesWithSessions.map((cls) => (
              <div
                key={cls.id}
                className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Image */}
                <div className="relative h-56 w-full overflow-hidden">
                  {cls.image ? (
                    <Image
                      src={cls.image}
                      alt={cls.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple to-purple-light">
                      <HiPaintBrush className="h-24 w-24 text-white opacity-50" />
                    </div>
                  )}
                  {/* Price Badge */}
                  <div className="absolute bottom-4 right-4 rounded-full bg-white/95 px-4 py-2 font-bold text-purple shadow-lg backdrop-blur-sm dark:bg-zinc-900/95">
                    {cls.price} {cls.currency}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="mb-3 text-xl font-bold text-zinc-900 dark:text-white">
                    {locale === "ar" && cls.titleAr ? cls.titleAr : cls.title}
                  </h3>

                  {cls.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {locale === "ar" && cls.descriptionAr
                        ? cls.descriptionAr
                        : cls.description}
                    </p>
                  )}

                  {/* Duration */}
                  {cls.durationMinutes && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <MdAccessTime className="h-4 w-4 text-teal" />
                      <span>
                        {t.duration}: {cls.durationMinutes} {t.minutes}
                      </span>
                    </div>
                  )}

                  {/* Upcoming Sessions */}
                  {cls.sessions.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {cls.sessions.slice(0, 2).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <MdCalendarMonth className="h-4 w-4 text-purple" />
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {formatDate(session.startTime)} - {formatTime(session.startTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
                            <MdPerson className="h-4 w-4" />
                            <span>
                              {session.seatsAvailable} {t.available}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Book Now Button */}
                  <Link
                    href={`/${locale}/classes/${cls.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple to-purple-light px-6 py-3 font-bold text-white transition-all hover:opacity-90 hover:shadow-lg"
                  >
                    <HiSparkles className="h-5 w-5" />
                    {t.bookNow}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
