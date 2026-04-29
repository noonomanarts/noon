import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { FiArrowRight, FiCalendar, FiClock, FiUsers } from "react-icons/fi";
import { HiPaintBrush } from "react-icons/hi2";

import { findManyClasses } from "@/lib/db/classes";
import { getClassRepeatRequestSummaries } from "@/lib/db/classRepeatRequests";
import { ClassCategory } from "@/lib/db/types";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { formatDurationClock } from "@/lib/formatDuration";
import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";
import ClassListingHeader from "@/components/site/ClassListingHeader";
import RequestRepeatButton from "@/components/site/RequestRepeatButton";
import { getUserById } from "@/lib/db/users";

const DISPLAY_TIMEZONE = "Asia/Muscat";

function getCurrentTimestamp(): number {
  return new Date().getTime();
}

function hasWorkshopEnded(cls: { status: string; endDateTime: Date | string | null }): boolean {
  return cls.status === "COMPLETED"
    || (cls.endDateTime ? new Date(cls.endDateTime).getTime() < getCurrentTimestamp() : false);
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
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;
  const currentUser = sessionId ? await getUserById(sessionId) : null;

  const classes = await findManyClasses({
    category: ClassCategory.ARTS_CRAFTS,
    status: ["PUBLISHED", "COMPLETED"],
  });

  const classesWithDates = classes.map((cls) => ({
    ...cls,
    startDateTime: cls.startDateTime ?? null,
    endDateTime: cls.endDateTime ?? null,
    seatsAvailable: Math.max(0, (cls.seatsTotal ?? 0) - (cls.seatsBooked ?? 0)),
  }));

  const repeatSummaries = await getClassRepeatRequestSummaries(
    classesWithDates.map((cls) => cls.id),
    currentUser?.id ?? null
  );

  const t = {
    title: isArabic ? "ورش الفنون والمهارات اليدوية" : "Arts & Crafts Classes",
    subtitle: isArabic
      ? "ورش إبداعية عملية لتجارب فنية ممتعة ومهارية."
      : "Hands-on creative workshops for expressive and skillful art experiences.",
    bookNow: isArabic ? "عرض التفاصيل والحجز" : "View Details & Book",
    available: isArabic ? "متاح" : "available",
    noClasses: isArabic
      ? "لا توجد دروس فنون وحرف منشورة حالياً."
      : "No published arts & crafts classes right now.",
    activeClasses: isArabic ? "الورش النشطة" : "Active Workshops",
    endedClasses: isArabic ? "ورش منتهية" : "Ended Workshops",
    endedSubtitle: isArabic ? "يمكنك طلب إعادة أي ورشة انتهت." : "You can request any ended workshop to be repeated.",
    duration: isArabic ? "المدة" : "Duration",
    noSchedule: isArabic ? "الموعد سيُعلن قريباً" : "Schedule coming soon",
    workshopEnded: isArabic ? "انتهت الورشة" : "Workshop ended",
    backToClasses: isArabic ? "العودة إلى الورش" : "Back to classes",
  };

  const pageTitle = (isArabic ? pageSettings?.headingAr : pageSettings?.headingEn)?.trim() || t.title;
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(isArabic ? "ar-OM-u-nu-latn" : "en-OM", {
      month: "short",
      day: "numeric",
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString(isArabic ? "ar-OM-u-nu-latn" : "en-OM", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  const activeClasses = classesWithDates.filter(
    (cls) => cls.status === "PUBLISHED" && !hasWorkshopEnded(cls)
  );
  const endedClasses = classesWithDates
    .filter((cls) => hasWorkshopEnded(cls))
    .sort((a, b) => {
      const aTime = a.endDateTime ? new Date(a.endDateTime).getTime() : 0;
      const bTime = b.endDateTime ? new Date(b.endDateTime).getTime() : 0;
      return bTime - aTime;
    });

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
        {classesWithDates.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-12 text-center shadow-sm">
            <HiPaintBrush className="mx-auto mb-4 h-16 w-16 text-[color:var(--text-subtle)]" />
            <p className="text-base text-[color:var(--text-muted)]">{t.noClasses}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {activeClasses.length > 0 ? (
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.activeClasses}</h2>
                <div className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-3">
                  {activeClasses.map((cls) => (
                    <article
                      key={cls.id}
                      className="group overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[3/4]">
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

                        <div className="absolute right-2 top-2 rounded-full bg-[color:var(--surface)]/95 px-2 py-1 text-[11px] font-semibold text-[color:var(--text)] shadow-sm backdrop-blur sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                          {formatAmountWithCurrency(cls.price, cls.currency)}
                        </div>
                      </div>

                      <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
                        <h3 className="line-clamp-2 text-sm font-semibold text-[color:var(--text)] sm:text-lg">
                          {isArabic && cls.titleAr ? cls.titleAr : cls.title}
                        </h3>

                        {cls.description ? (
                          <p className="line-clamp-2 text-xs leading-5 text-[color:var(--text-muted)] sm:text-sm sm:leading-6">
                            {isArabic && cls.descriptionAr ? cls.descriptionAr : cls.description}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--text-muted)] sm:gap-3 sm:text-xs">
                          {cls.durationMinutes ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-2.5 py-1">
                              <FiClock className="size-3.5" />
                              {t.duration}: {formatDurationClock(cls.durationMinutes)}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-2.5 py-1">
                            <FiUsers className="size-3.5" />
                            {cls.seatsAvailable} {t.available}
                          </span>
                        </div>

                        {cls.startDateTime ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-2 sm:px-3">
                              <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--text)] sm:gap-2 sm:text-xs">
                                <FiCalendar className="size-3.5 text-[color:var(--primary)]" />
                                {formatDate(cls.startDateTime)} · {formatTime(cls.startDateTime)}
                              </p>
                              <p className="text-[11px] text-[color:var(--text-muted)] sm:text-xs">
                                {cls.seatsAvailable} {t.available}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[color:var(--text-subtle)]">{t.noSchedule}</p>
                        )}

                        <Link
                          href={`/${locale}/classes/${cls.slug}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--primary)] px-3 py-2 text-xs font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)] sm:px-4 sm:py-2.5 sm:text-sm"
                        >
                          {t.bookNow}
                          <FiArrowRight className="size-4" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {endedClasses.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.endedClasses}</h2>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.endedSubtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-3">
                  {endedClasses.map((cls) => (
                    <article
                      key={cls.id}
                      className="group overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[3/4]">
                        {cls.image ? (
                          <Image
                            src={cls.image}
                            alt={isArabic && cls.titleAr ? cls.titleAr : cls.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[color:var(--muted)]">
                            <HiPaintBrush className="h-20 w-20 text-[color:var(--text-subtle)]" />
                          </div>
                        )}

                        <div className="absolute right-2 top-2 rounded-full bg-[color:var(--surface)]/95 px-2 py-1 text-[11px] font-semibold text-[color:var(--text)] shadow-sm backdrop-blur sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
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
                              {t.duration}: {formatDurationClock(cls.durationMinutes)}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-2.5 py-1">
                            <FiUsers className="size-3.5" />
                            {cls.seatsAvailable} {t.available}
                          </span>
                        </div>

                        <RequestRepeatButton
                          classId={cls.id}
                          locale={locale}
                          initialCount={repeatSummaries[cls.id]?.requestsCount ?? 0}
                          initialRequested={repeatSummaries[cls.id]?.requestedByCurrentUser ?? false}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
