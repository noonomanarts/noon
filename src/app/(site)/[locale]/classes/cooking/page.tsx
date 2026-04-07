import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiBookOpen, FiCalendar, FiUser } from "react-icons/fi";
import { GiChefToque } from "react-icons/gi";
import { HiOutlineBanknotes } from "react-icons/hi2";

import { findManyClasses } from "@/lib/db/classes";
import { ClassCategory } from "@/lib/db/types";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";
import ClassListingHeader from "@/components/site/ClassListingHeader";

const DISPLAY_TIMEZONE = "Asia/Muscat";

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
  trainer: { id: string; fullName: string; profileImage: string | null } | null;
  startDateTime: Date | null;
  seatsAvailable: number;
};

function ClassCard({
  cls,
  locale,
  t,
  subCategoryLabel,
  formatDate,
  formatTime,
}: {
  cls: ClassWithSessions;
  locale: Locale;
  t: Record<string, string>;
  subCategoryLabel: string;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}) {
  const title = locale === "ar" && cls.titleAr ? cls.titleAr : cls.title;
  const trainerName = cls.trainer?.fullName ?? null;
  const datetimeText = cls.startDateTime
    ? `${formatDate(cls.startDateTime)} · ${formatTime(cls.startDateTime)}`
    : t.noUpcomingSessions;
  const priceText = formatAmountWithCurrency(cls.price, cls.currency);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={`/${locale}/classes/${cls.slug}`}
        className="relative block aspect-[3/4] overflow-hidden"
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
        <span
          className={`absolute top-3 inline-flex max-w-[70%] items-center gap-1.5 bg-black/65 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm ${
            locale === "ar" ? "left-3" : "right-3"
          }`}
        >
          <GiChefToque className="size-3.5 shrink-0 text-yellow-300" />
          <span className="truncate">{subCategoryLabel}</span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col space-y-3 p-4 sm:p-5">
        <h3 className="line-clamp-2 inline-flex items-start gap-2 text-base font-semibold text-[color:var(--text)] sm:text-lg">
          <FiBookOpen className="mt-0.5 size-4 shrink-0 text-purple-500" />
          <span>{title}</span>
        </h3>
        <p className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--text)] sm:text-base">
          <FiCalendar className="size-5 shrink-0 text-teal-500" />
          {datetimeText}
        </p>
        {trainerName ? (
          <p className="inline-flex items-center gap-2 text-xs text-[color:var(--text-muted)] sm:text-sm">
            <FiUser className="size-4 shrink-0 text-indigo-500" />
            {trainerName}
          </p>
        ) : null}
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

function getSubCategoryLabel(subCategory: string | null, t: Record<string, string>): string {
  if (subCategory === "APPETIZERS_SNACKS" || subCategory === "APPETIZERS") return t.appetizers;
  if (subCategory === "MAIN_DISHES") return t.mainDishes;
  if (subCategory === "DESSERTS_BAKING" || subCategory === "DESSERTS") return t.desserts;
  if (subCategory === "MOM_AND_KID") return t.momAndKid;
  return t.other;
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

  const classesWithSessions: ClassWithSessions[] = classes.map((cls) => ({
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
    trainer: cls.trainer ? { id: cls.trainer.id, fullName: cls.trainer.fullName, profileImage: cls.trainer.profileImage } : null,
    startDateTime: cls.startDateTime ?? null,
    seatsAvailable: cls.seatsTotal - (cls.seatsBooked ?? 0),
  }));

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

  return (
    <div className="route-sharp pb-14">
      <ClassListingHeader
        locale={locale}
        title={pageTitle}
        backgroundColor={pageSettings?.classListingHero.backgroundColor || "#cb8578"}
        textColor={pageSettings?.classListingHero.textColor || "#ffffff"}
        slideImages={pageSettings?.classListingHero.slideImages || ["/images/cooking.png"]}
        autoplayMs={pageSettings?.classListingHero.autoplayMs}
        backLabel={t.backToClasses}
      />

      <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col gap-12 px-4">
        {classesWithSessions.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-12 text-center shadow-sm">
            <GiChefToque className="mx-auto mb-4 h-16 w-16 text-[color:var(--text-subtle)]" />
            <p className="text-base text-[color:var(--text-muted)]">{t.noClasses}</p>
          </div>
        ) : (
          <section>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {classesWithSessions.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  locale={locale}
                  t={t}
                  subCategoryLabel={getSubCategoryLabel(cls.subCategory, t)}
                  formatDate={formatDate}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
