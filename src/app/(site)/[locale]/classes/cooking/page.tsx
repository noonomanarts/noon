import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiCalendar, FiClock, FiUsers } from "react-icons/fi";
import { GiChefToque } from "react-icons/gi";

import { findClassSessions, findManyClasses } from "@/lib/db/classes";
import { ClassCategory } from "@/lib/db/types";
import { isLocale, type Locale } from "@/lib/locale";

type ClassWithSessions = {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  subCategory: string | null;
  image: string | null;
  price: number;
  currency: string;
  durationMinutes: number | null;
  sessions: {
    id: string;
    startTime: Date;
    seatsAvailable: number;
  }[];
};

function ClassCard({
  cls,
  locale,
  t,
  formatDate,
  formatTime,
}: {
  cls: ClassWithSessions;
  locale: Locale;
  t: Record<string, string>;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-56 overflow-hidden">
        {cls.image ? (
          <Image
            src={cls.image}
            alt={locale === "ar" && cls.titleAr ? cls.titleAr : cls.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[color:var(--muted)]">
            <GiChefToque className="h-20 w-20 text-[color:var(--text-subtle)]" />
          </div>
        )}

        <div className="absolute right-4 top-4 rounded-full bg-[color:var(--surface)]/95 px-3 py-1 text-xs font-semibold text-[color:var(--text)] shadow-sm backdrop-blur">
          {cls.price.toFixed(3)} {cls.currency}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <h3 className="line-clamp-1 text-lg font-semibold text-[color:var(--text)]">
          {locale === "ar" && cls.titleAr ? cls.titleAr : cls.title}
        </h3>

        {cls.description ? (
          <p className="line-clamp-2 text-sm leading-6 text-[color:var(--text-muted)]">
            {locale === "ar" && cls.descriptionAr ? cls.descriptionAr : cls.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-muted)]">
          {cls.durationMinutes ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-2.5 py-1">
              <FiClock className="size-3.5" />
              {t.duration}: {cls.durationMinutes} {t.minutes}
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
  );
}

function SubCategorySection({
  title,
  classes,
  locale,
  t,
  formatDate,
  formatTime,
}: {
  title: string;
  classes: ClassWithSessions[];
  locale: Locale;
  t: Record<string, string>;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}) {
  if (classes.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--muted)]">
          <GiChefToque className="h-6 w-6 text-coral" />
        </span>
        <h2 className="text-2xl font-semibold text-[color:var(--text)]">{title}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            locale={locale}
            t={t}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        ))}
      </div>
    </section>
  );
}

export default async function CookingClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const classes = await findManyClasses({
    category: ClassCategory.COOKING,
    status: "PUBLISHED",
  });

  const classesWithSessions: ClassWithSessions[] = await Promise.all(
    classes.map(async (cls) => {
      const sessions = await findClassSessions(cls.id as string, {
        upcomingOnly: true,
        limit: 3,
      });
      return {
        id: cls.id as string,
        slug: cls.slug as string,
        title: cls.title as string,
        titleAr: cls.titleAr as string | null,
        description: cls.description as string | null,
        descriptionAr: cls.descriptionAr as string | null,
        subCategory: cls.subCategory as string | null,
        image: cls.image as string | null,
        price: cls.price as number,
        currency: cls.currency as string,
        durationMinutes: cls.durationMinutes as number | null,
        sessions,
      };
    })
  );

  const subCategories = {
    APPETIZERS: classesWithSessions.filter(
      (c) => c.subCategory === "APPETIZERS_SNACKS" || c.subCategory === "APPETIZERS"
    ),
    MAIN_DISHES: classesWithSessions.filter((c) => c.subCategory === "MAIN_DISHES"),
    DESSERTS: classesWithSessions.filter(
      (c) => c.subCategory === "DESSERTS_BAKING" || c.subCategory === "DESSERTS"
    ),
    MOM_AND_KID: classesWithSessions.filter((c) => c.subCategory === "MOM_AND_KID"),
    OTHER: classesWithSessions.filter(
      (c) =>
        !["APPETIZERS_SNACKS", "APPETIZERS", "MAIN_DISHES", "DESSERTS_BAKING", "DESSERTS", "MOM_AND_KID"].includes(
          c.subCategory as string
        )
    ),
  };

  const t: Record<string, string> = {
    title: isArabic ? "دروس الطبخ" : "Cooking Classes",
    subtitle: isArabic
      ? "برامج عملية بمستويات مختلفة من الأساسيات حتى الإتقان."
      : "Hands-on programs for every level, from fundamentals to mastery.",
    appetizers: isArabic ? "المقبلات والوجبات الخفيفة" : "Appetizers & Snacks",
    mainDishes: isArabic ? "الأطباق الرئيسية" : "Main Dishes",
    desserts: isArabic ? "الحلويات والمخبوزات" : "Desserts & Baking",
    momAndKid: isArabic ? "الأم والطفل" : "Mom & Kid",
    other: isArabic ? "أخرى" : "Other",
    bookNow: isArabic ? "عرض التفاصيل والحجز" : "View Details & Book",
    available: isArabic ? "متاح" : "available",
    noClasses: isArabic
      ? "لا توجد دروس طبخ منشورة حالياً."
      : "No published cooking classes right now.",
    duration: isArabic ? "المدة" : "Duration",
    minutes: isArabic ? "دقيقة" : "min",
    noUpcomingSessions: isArabic ? "لا توجد مواعيد قادمة حالياً." : "No upcoming sessions yet.",
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(isArabic ? "ar-OM" : "en-OM", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString(isArabic ? "ar-OM" : "en-OM", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="route-sharp relative overflow-x-clip pb-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]">
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 pt-10">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            <GiChefToque className="h-4 w-4 text-coral" />
            {isArabic ? "فئة الدورات" : "Class Category"}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
            {t.subtitle}
          </p>
          <div className="mt-6 inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2 text-sm font-semibold text-[color:var(--text)]">
            {classesWithSessions.length} {isArabic ? "دورة منشورة" : "published classes"}
          </div>
        </div>
      </section>

      <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-12 px-4">
        <SubCategorySection
          title={t.appetizers}
          classes={subCategories.APPETIZERS}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <SubCategorySection
          title={t.mainDishes}
          classes={subCategories.MAIN_DISHES}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <SubCategorySection
          title={t.desserts}
          classes={subCategories.DESSERTS}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <SubCategorySection
          title={t.momAndKid}
          classes={subCategories.MOM_AND_KID}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <SubCategorySection
          title={t.other}
          classes={subCategories.OTHER}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />

        {classesWithSessions.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-12 text-center shadow-sm">
            <GiChefToque className="mx-auto mb-4 h-16 w-16 text-[color:var(--text-subtle)]" />
            <p className="text-base text-[color:var(--text-muted)]">{t.noClasses}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
