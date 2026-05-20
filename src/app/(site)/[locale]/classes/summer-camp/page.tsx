import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiCalendar, FiClock, FiSun } from "react-icons/fi";
import { HiPaintBrush, HiSparkles } from "react-icons/hi2";

import { findManyClasses } from "@/lib/db/classes";
import { ClassCategory } from "@/lib/db/types";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { formatDurationClock } from "@/lib/formatDuration";
import { isLocale, type Locale } from "@/lib/locale";

const DISPLAY_TIMEZONE = "Asia/Muscat";

type ScheduleSession = { startDateTime: string; endDateTime: string };

function formatDate(date: Date | string, locale: string) {
  return new Date(date).toLocaleDateString(locale === "ar" ? "ar-OM-u-nu-latn" : "en-OM", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIMEZONE,
  });
}

function formatTime(date: Date | string, locale: string) {
  return new Date(date).toLocaleTimeString(locale === "ar" ? "ar-OM-u-nu-latn" : "en-OM", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DISPLAY_TIMEZONE,
  });
}

function ScheduleSessionsList({
  sessions,
  locale,
  dayLabel,
}: {
  sessions: ScheduleSession[];
  locale: string;
  dayLabel: string;
}) {
  if (sessions.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {sessions.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg bg-[color:var(--muted)] px-2.5 py-1.5 text-[11px] sm:text-xs"
        >
          <FiCalendar className="size-3 shrink-0 text-[color:var(--primary)]" />
          <span className="font-medium text-[color:var(--text)]">
            {dayLabel} {i + 1}:
          </span>
          <span className="text-[color:var(--text-muted)]">
            {formatDate(s.startDateTime, locale)} · {formatTime(s.startDateTime, locale)}–{formatTime(s.endDateTime, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function SummerCampPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const allArtsClasses = await findManyClasses({
    category: ClassCategory.ARTS_CRAFTS,
    status: ["PUBLISHED", "COMPLETED"],
  });

  const classes = allArtsClasses.filter((cls) => cls.subCategory === "SUMMER_CAMP");

  const t = {
    title: isArabic ? "المخيم الصيفي" : "Summer Camp",
    subtitle: isArabic
      ? "برنامج فنون يومي ممتع للأطفال يمتد لعدة أيام متتالية."
      : "A multi-day arts programme full of creativity and fun for kids.",
    bookNow: isArabic ? "عرض التفاصيل والحجز" : "View Details & Book",
    noClasses: isArabic
      ? "لا توجد دورات مخيم صيفي منشورة حالياً."
      : "No Summer Camp programmes published right now.",
    duration: isArabic ? "المدة" : "Duration",
    noSchedule: isArabic ? "الموعد سيُعلن قريباً" : "Schedule coming soon",
    day: isArabic ? "يوم" : "Day",
    discountTitle: isArabic ? "عروض المخيم الصيفي" : "Summer Camp Discount",
    discountMulti: isArabic
      ? "احجز في ورشتين أو سجّل طفلين فأكثر — واحصل على خصم 10% تلقائياً."
      : "Book 2 workshops or register 2 kids and get an automatic 10% discount.",
    discountSingle: isArabic
      ? "عند حجز ورشة واحدة لطفل واحد، ستحصل على كود خصم 10% للاستخدام في المرة القادمة."
      : "Register a single child in one workshop and you'll receive a 10% promo code for your next booking.",
  };

  return (
    <div className="route-sharp pb-14">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-300 to-yellow-200 px-4 py-12 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <FiSun className="absolute left-8 top-8 h-20 w-20 text-orange-800" />
          <HiSparkles className="absolute bottom-6 right-10 h-16 w-16 text-yellow-900" />
        </div>
        <h1 className="relative text-3xl font-extrabold tracking-tight text-amber-950 sm:text-4xl">
          {t.title}
        </h1>
        <p className="relative mt-3 text-base text-amber-900/80 sm:text-lg">{t.subtitle}</p>
      </div>

      {/* Discount info banner */}
      <section className="mx-auto mt-6 w-full max-w-6xl px-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <HiSparkles className="size-4 shrink-0 text-amber-500" />
            {t.discountTitle}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300 list-disc list-inside">
            <li>{t.discountMulti}</li>
            <li>{t.discountSingle}</li>
          </ul>
        </div>
      </section>

      {/* Classes */}
      <section className="mx-auto mt-6 w-full max-w-6xl px-4">
        {classes.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-12 text-center shadow-sm">
            <HiPaintBrush className="mx-auto mb-4 h-16 w-16 text-[color:var(--text-subtle)]" />
            <p className="text-base text-[color:var(--text-muted)]">{t.noClasses}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map((cls) => {
              const sessions = (cls.scheduleSessions ?? []) as ScheduleSession[];
              return (
                <article
                  key={cls.id}
                  className="group overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {cls.image ? (
                      <Image
                        src={cls.image}
                        alt={isArabic && cls.titleAr ? cls.titleAr : cls.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[color:var(--muted)]">
                        <HiPaintBrush className="h-16 w-16 text-[color:var(--text-subtle)]" />
                      </div>
                    )}
                    <div className="absolute right-2 top-2 rounded-full bg-[color:var(--surface)]/95 px-2 py-1 text-[11px] font-semibold text-[color:var(--text)] shadow-sm backdrop-blur sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                      {formatAmountWithCurrency(cls.price, cls.currency)}
                    </div>
                  </div>

                  <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
                    <h3 className="line-clamp-2 text-sm font-semibold text-[color:var(--text)] sm:text-base">
                      {isArabic && cls.titleAr ? cls.titleAr : cls.title}
                    </h3>

                    {cls.description ? (
                      <p className="line-clamp-2 text-xs leading-5 text-[color:var(--text-muted)] sm:text-sm">
                        {isArabic && cls.descriptionAr ? cls.descriptionAr : cls.description}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
                      {cls.durationMinutes ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-2.5 py-1">
                          <FiClock className="size-3.5" />
                          {t.duration}: {formatDurationClock(cls.durationMinutes)}
                        </span>
                      ) : null}
                    </div>

                    {sessions.length > 0 ? (
                      <ScheduleSessionsList sessions={sessions} locale={locale} dayLabel={t.day} />
                    ) : cls.startDateTime ? (
                      <div className="flex items-center gap-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-2 text-[11px] font-medium text-[color:var(--text)] sm:text-xs">
                        <FiCalendar className="size-3.5 text-[color:var(--primary)]" />
                        {formatDate(cls.startDateTime, locale)} · {formatTime(cls.startDateTime, locale)}
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
