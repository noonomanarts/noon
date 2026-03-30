import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiCalendar, FiClock, FiUsers } from "react-icons/fi";
import { HiPaintBrush } from "react-icons/hi2";

import { findClassSessions, findManyClasses } from "@/lib/db/classes";
import { ClassCategory } from "@/lib/db/types";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";
import ClassListingHeader from "@/components/site/ClassListingHeader";

const DISPLAY_TIMEZONE = "Asia/Muscat";

function formatDurationHours(minutes: number | null | undefined): string {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) return "0";
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, "");
}

export default async function ArtsCraftsClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";
  const pageSettings = await getPublicSitePageSettings("classes_arts_crafts");

  const classes = await findManyClasses({
    category: ClassCategory.ARTS_CRAFTS,
    status: "PUBLISHED",
  });

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
    title: isArabic ? "دروس الفنون والحرف" : "Arts & Crafts Classes",
    subtitle: isArabic
      ? "ورش إبداعية عملية لتجارب فنية ممتعة ومهارية."
      : "Hands-on creative workshops for expressive and skillful art experiences.",
    bookNow: isArabic ? "عرض التفاصيل والحجز" : "View Details & Book",
    available: isArabic ? "متاح" : "available",
    noClasses: isArabic
      ? "لا توجد دروس فنون وحرف منشورة حالياً."
      : "No published arts & crafts classes right now.",
    duration: isArabic ? "المدة" : "Duration",
    hours: isArabic ? "ساعة" : "hours",
    noUpcomingSessions: isArabic ? "لا توجد مواعيد قادمة حالياً." : "No upcoming sessions yet.",
    backToClasses: isArabic ? "العودة إلى الدورات" : "Back to classes",
  };

  const pageTitle = (isArabic ? pageSettings?.headingAr : pageSettings?.headingEn)?.trim() || t.title;
  const pageSubtitle = (isArabic ? pageSettings?.subheadingAr : pageSettings?.subheadingEn)?.trim() || t.subtitle;

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(isArabic ? "ar-OM" : "en-OM", {
      month: "short",
      day: "numeric",
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString(isArabic ? "ar-OM" : "en-OM", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  return (
    <div className="route-sharp pb-14">
      <ClassListingHeader
        locale={locale}
        title={pageTitle}
        backgroundColor={pageSettings?.classListingHero.backgroundColor || "#cb8578"}
        textColor={pageSettings?.classListingHero.textColor || "#ffffff"}
        slideImages={pageSettings?.classListingHero.slideImages || ["/images/art.png"]}
        autoplayMs={pageSettings?.classListingHero.autoplayMs}
        backLabel={t.backToClasses}
      />

      <section className="mx-auto mt-4 w-full max-w-6xl px-4">
        {classesWithSessions.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-12 text-center shadow-sm">
            <HiPaintBrush className="mx-auto mb-4 h-16 w-16 text-[color:var(--text-subtle)]" />
            <p className="text-base text-[color:var(--text-muted)]">{t.noClasses}</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {classesWithSessions.map((cls) => (
              <article
                key={cls.id}
                className="group overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-square overflow-hidden">
                  {cls.image ? (
                    <Image
                      src={cls.image}
                      alt={isArabic && cls.titleAr ? cls.titleAr : cls.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[color:var(--muted)]">
                      <HiPaintBrush className="h-20 w-20 text-[color:var(--text-subtle)]" />
                    </div>
                  )}

                  <div className="absolute right-4 top-4 rounded-full bg-[color:var(--surface)]/95 px-3 py-1 text-xs font-semibold text-[color:var(--text)] shadow-sm backdrop-blur">
                    {formatAmountWithCurrency(cls.price, cls.currency)}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <h3 className="line-clamp-1 text-lg font-semibold text-[color:var(--text)]">
                    {isArabic && cls.titleAr ? cls.titleAr : cls.title}
                  </h3>

                  {cls.description ? (
                    <p className="line-clamp-2 text-sm leading-6 text-[color:var(--text-muted)]">
                      {isArabic && cls.descriptionAr ? cls.descriptionAr : cls.description}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-muted)]">
                    {cls.durationMinutes ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-2.5 py-1">
                        <FiClock className="size-3.5" />
                        {t.duration}: {formatDurationHours(cls.durationMinutes)} {t.hours}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-2.5 py-1">
                      <FiUsers className="size-3.5" />
                      {cls.sessions.reduce((sum, s) => sum + s.seatsAvailable, 0)} {t.available}
                    </span>
                  </div>

                  {cls.sessions.length > 0 ? (
                    <div className="space-y-2">
                      {cls.sessions.slice(0, 2).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2"
                        >
                          <p className="inline-flex items-center gap-2 text-xs font-medium text-[color:var(--text)]">
                            <FiCalendar className="size-3.5 text-[color:var(--primary)]" />
                            {formatDate(session.startTime)} · {formatTime(session.startTime)}
                          </p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            {session.seatsAvailable} {t.available}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[color:var(--text-subtle)]">{t.noUpcomingSessions}</p>
                  )}

                  <Link
                    href={`/${locale}/classes/${cls.slug}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] px-4 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
                  >
                    {t.bookNow}
                    <FiArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
