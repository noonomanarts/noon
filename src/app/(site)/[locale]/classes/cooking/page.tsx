import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiBookOpen, FiCalendar, FiUser } from "react-icons/fi";
import { GiChefToque } from "react-icons/gi";
import { HiOutlineBanknotes } from "react-icons/hi2";

import { findClassSessions, findManyClasses } from "@/lib/db/classes";
import { ClassCategory } from "@/lib/db/types";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";
import ClassListingHeader from "@/components/site/ClassListingHeader";

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
  const title = locale === "ar" && cls.titleAr ? cls.titleAr : cls.title;
  const nextSession = cls.sessions[0];
  const datetimeText = nextSession
    ? `${formatDate(nextSession.startTime)} · ${formatTime(nextSession.startTime)}`
    : t.noUpcomingSessions;
  const priceText = formatAmountWithCurrency(cls.price, cls.currency);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={`/${locale}/classes/${cls.slug}`}
        className="relative block aspect-square overflow-hidden"
        aria-label={title}
      >
        {cls.image ? (
          <Image
            src={cls.image}
            alt={title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[color:var(--muted)]">
            <GiChefToque className="h-20 w-20 text-[color:var(--text-subtle)]" />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col space-y-3 p-4 sm:p-5">
        <h3 className="line-clamp-2 inline-flex items-start gap-2 text-base font-semibold text-[color:var(--text)] sm:text-lg">
          <FiBookOpen className="mt-0.5 size-4 shrink-0 text-purple-500" />
          <span>{title}</span>
        </h3>
        <p className="inline-flex items-center gap-2 text-xs text-[color:var(--text-muted)] sm:text-sm">
          <FiCalendar className="size-4 shrink-0 text-teal-500" />
          {datetimeText}
        </p>
        <div className="mt-auto pt-2">
          <p className="mb-3 inline-flex items-center gap-2 text-2xl font-black leading-none text-[color:var(--text)] sm:text-3xl">
            <HiOutlineBanknotes className="size-6 shrink-0 text-emerald-600" />
            {priceText}
          </p>
          <Link
            href={`/${locale}/classes/${cls.slug}`}
            className="inline-flex w-full items-center justify-center gap-1 bg-[color:var(--primary)] px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-[color:var(--primary-foreground)] transition hover:brightness-95"
          >
            {t.bookNow}
            <FiArrowRight className="size-3.5" />
          </Link>
        </div>
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
  const pageSettings = await getPublicSitePageSettings("classes_cooking");

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
    backToClasses: isArabic ? "العودة إلى الدورات" : "Back to classes",
  };

  const pageTitle = (isArabic ? pageSettings?.headingAr : pageSettings?.headingEn)?.trim() || t.title;
  const pageSubtitle = (isArabic ? pageSettings?.subheadingAr : pageSettings?.subheadingEn)?.trim() || t.subtitle;

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
    <div className="route-sharp pb-14">
      <ClassListingHeader
        locale={locale}
        title={pageTitle}
        backgroundColor={pageSettings?.classListingHero.backgroundColor || "#cb8578"}
        slideImages={pageSettings?.classListingHero.slideImages || ["/images/cooking.png"]}
        autoplayMs={pageSettings?.classListingHero.autoplayMs}
        backLabel={t.backToClasses}
      />

      <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col gap-12 px-4">
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
