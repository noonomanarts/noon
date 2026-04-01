import Image from "next/image";
import Link from "next/link";

import { isLocale, type Locale } from "@/lib/locale";
import { getHomeContent } from "@/lib/homeContent";
import AnimatedCounter from "@/components/site/AnimatedCounter";
import PartnersCarousel from "@/components/site/PartnersCarousel";
import { resolveHeaderColor } from "@/lib/headerBranding";
import { findClassSessions, findManyClasses } from "@/lib/db/classes";
import { countUsersByRole } from "@/lib/db/users";
import { countEventBookings } from "@/lib/db/events";
import { query } from "@/lib/db/pool";
import { getAdminSettingsByKey } from "@/lib/db/adminSettings";
import {
  getSitePageByKey,
  makeSitePageSettingsKey,
  sanitizeSitePageSettings,
  type SitePageSettings,
} from "@/lib/admin/sitePages";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { FiArrowRight, FiBookOpen, FiCalendar, FiPenTool, FiScissors, FiUser } from "react-icons/fi";
import { GiChefToque, GiCookingPot, GiKnifeFork, GiPalette } from "react-icons/gi";
import { HiOutlineBanknotes } from "react-icons/hi2";

type UpcomingCard = {
  id: string;
  slug: string;
  title: string;
  datetimeText: string;
  priceText: string;
  trainerName: string;
  imageSrc: string;
  href: string;
};

type DynamicHomeStats = {
  studentsDelta: number;
  classesDelta: number;
  eventsDelta: number;
  yearsValue: number | null;
};

const DISPLAY_TIMEZONE = "Asia/Muscat";

const heroSlides = [
  "/images/slides/1.jpg",
  "/images/slides/2.jpg",
  "/images/slides/3.jpg",
  "/images/slides/4.jpg",
  "/images/slides/5.jpg",
  "/images/slides/6.jpg",
];

function isVideoSource(source: string): boolean {
  const normalized = source.trim().toLowerCase();
  if (!normalized) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/.test(normalized);
}

function normalizeHexColor(value: string, fallback: string): string {
  const input = value.trim().toLowerCase();
  const match = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!match) return fallback;

  if (match[1].length === 3) {
    const [r, g, b] = match[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return input;
}

function getReadableTextColor(hex: string): "#ffffff" | "#23150f" {
  const normalized = normalizeHexColor(hex, "#000000");
  const raw = normalized.slice(1);
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#23150f" : "#ffffff";
}

function resolveHeroHref(locale: Locale, value: string, fallback: string): string {
  const normalized = value.trim();
  if (!normalized) return `/${locale}${fallback}`;
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(normalized)) return normalized;
  if (/^\/(en|ar)(?=\/|$)/.test(normalized)) return normalized;
  if (normalized.startsWith("/")) return `/${locale}${normalized}`;
  return `/${locale}${fallback}`;
}

function renderCourseIcon(icon: string, type: "cooking" | "arts") {
  if (type === "cooking") {
    if (icon === "chef-hat") {
      return <GiChefToque className="h-28 w-28 text-teal-600 transition duration-300 group-hover:scale-110 group-hover:text-teal-500 dark:text-teal-300 dark:group-hover:text-teal-200" />;
    }
    if (icon === "utensils") {
      return <GiKnifeFork className="h-28 w-28 text-teal-600 transition duration-300 group-hover:scale-110 group-hover:text-teal-500 dark:text-teal-300 dark:group-hover:text-teal-200" />;
    }
    return <GiCookingPot className="h-28 w-28 text-teal-600 transition duration-300 group-hover:scale-110 group-hover:text-teal-500 dark:text-teal-300 dark:group-hover:text-teal-200" />;
  }

  if (icon === "craft") {
    return <FiScissors className="h-24 w-24 text-purple-600 transition duration-300 group-hover:scale-110 group-hover:text-purple-500 dark:text-purple-300 dark:group-hover:text-purple-200" />;
  }
  if (icon === "brush") {
    return <FiPenTool className="h-24 w-24 text-purple-600 transition duration-300 group-hover:scale-110 group-hover:text-purple-500 dark:text-purple-300 dark:group-hover:text-purple-200" />;
  }
  return <GiPalette className="h-28 w-28 text-purple-600 transition duration-300 group-hover:scale-110 group-hover:text-purple-500 dark:text-purple-300 dark:group-hover:text-purple-200" />;
}

async function resolveHomePageSettings(): Promise<SitePageSettings | null> {
  const homePage = getSitePageByKey("home");
  if (!homePage) return null;

  try {
    const key = makeSitePageSettingsKey(homePage.key);
    const saved = await getAdminSettingsByKey<Partial<SitePageSettings>>(key);
    return sanitizeSitePageSettings(homePage, saved);
  } catch {
    return sanitizeSitePageSettings(homePage, null);
  }
}

async function resolveUpcomingItems(
  locale: Locale,
  fallback: UpcomingCard[]
): Promise<UpcomingCard[]> {
  try {
    const classes = await findManyClasses({ status: "PUBLISHED", limit: 48 });
    const noTrainerLabel = locale === "ar" ? "المدرب غير محدد" : "Trainer TBD";
    const localeCode = locale === "ar" ? "ar-OM-u-nu-latn" : "en-OM";

    // Collect ALL upcoming sessions across all classes — each session becomes its own card
    const sessionCards: (UpcomingCard & { sessionStart: Date })[] = [];

    await Promise.all(
      classes.map(async (classItem) => {
        const sessions = await findClassSessions(classItem.id, {
          upcomingOnly: true,
          includeCancelled: false,
        });

        for (const session of sessions) {
          const dt = new Date(session.startTime);
          const datetimeText = `${dt.toLocaleDateString(localeCode, {
            month: "short",
            day: "numeric",
            timeZone: DISPLAY_TIMEZONE,
          })} · ${dt.toLocaleTimeString(localeCode, {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: DISPLAY_TIMEZONE,
          })}`;

          sessionCards.push({
            id: `${classItem.id}_${session.id}`,
            title: locale === "ar" && classItem.titleAr ? classItem.titleAr : classItem.title,
            datetimeText,
            priceText: formatAmountWithCurrency(classItem.price, classItem.currency),
            trainerName: classItem.trainer?.fullName?.trim() || noTrainerLabel,
            imageSrc: classItem.image || "/og-image.png",
            slug: String(classItem.slug),
            href: `/${locale}/classes/${classItem.slug}`,
            sessionStart: dt,
          });
        }
      })
    );

    // Sort by nearest session first, take 3
    const nearest = sessionCards
      .sort((a, b) => a.sessionStart.getTime() - b.sessionStart.getTime())
      .slice(0, 3)
      .map(({ sessionStart: _sessionStart, ...item }) => item);

    if (nearest.length > 0) {
      return nearest;
    }
  } catch {
    // Fallback to static content when database is unavailable.
  }

  return fallback;
}

function parseCounterValue(value: string): { numeric: number; suffix: string } {
  const match = String(value).match(/(\d+)/);
  if (!match) {
    return { numeric: 0, suffix: "+" };
  }

  const numeric = Number(match[1]);
  const rawSuffix = String(value).replace(match[1], "").trim();
  return {
    numeric: Number.isFinite(numeric) ? numeric : 0,
    suffix: rawSuffix || "+",
  };
}

async function resolveDynamicHomeStats(): Promise<DynamicHomeStats> {
  try {
    const [roles, eventBookingsCount, classSessionsResult, firstActivityResult] = await Promise.all([
      countUsersByRole(),
      countEventBookings(),
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM class_sessions
         WHERE is_cancelled = FALSE`
      ),
      query<{ first_activity: Date | string | null }>(
        `SELECT LEAST(
            COALESCE((SELECT MIN(created_at) FROM classes), NOW()),
            COALESCE((SELECT MIN(created_at) FROM event_bookings), NOW())
          ) AS first_activity`
      ),
    ]);

    const studentsDelta = Math.max(0, Number(roles.CUSTOMER ?? 0));
    const classesDelta = Math.max(0, Number(classSessionsResult.rows[0]?.count ?? 0));
    const eventsDelta = Math.max(0, Number(eventBookingsCount ?? 0));

    const firstActivityRaw = firstActivityResult.rows[0]?.first_activity ?? null;
    const firstActivityDate = firstActivityRaw ? new Date(firstActivityRaw) : null;
    const yearsValue = firstActivityDate && !Number.isNaN(firstActivityDate.getTime())
      ? Math.max(1, new Date().getFullYear() - firstActivityDate.getFullYear() + 1)
      : null;

    return { studentsDelta, classesDelta, eventsDelta, yearsValue };
  } catch {
    return {
      studentsDelta: 0,
      classesDelta: 0,
      eventsDelta: 0,
      yearsValue: null,
    };
  }
}

function Section({
  title,
  isArabic,
  children,
  sectionClassName,
}: {
  title: string;
  isArabic: boolean;
  children: React.ReactNode;
  sectionClassName?: string;
}) {
  return (
    <section className={`py-14 sm:py-16 ${sectionClassName ?? ""}`}>
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-8 flex justify-center">
          <div className="w-full max-w-3xl text-center">
            <h2
              className="text-2xl font-semibold tracking-tight text-[color:var(--text)] sm:text-3xl"
              style={{
                fontFamily: isArabic
                  ? "var(--font-hero-ar), var(--font-arabic), sans-serif"
                  : "var(--font-home-title-en), var(--font-hero-en), var(--font-english), sans-serif",
              }}
            >
              {title}
            </h2>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const content = getHomeContent(locale);
  const homePageSettings = await resolveHomePageSettings();
  const headerColor = await resolveHeaderColor();
  const headerButtonTextColor = getReadableTextColor(headerColor);

  const heroHeadingFromSettings = isArabic
    ? homePageSettings?.headingAr
    : homePageSettings?.headingEn;
  const heroPrimaryCtaFromSettings = isArabic
    ? homePageSettings?.homeHero.primaryCtaAr
    : homePageSettings?.homeHero.primaryCtaEn;
  const heroSecondaryCtaFromSettings = isArabic
    ? homePageSettings?.homeHero.secondaryCtaAr
    : homePageSettings?.homeHero.secondaryCtaEn;
  const heroPrimaryHrefFromSettings = homePageSettings?.homeHero.primaryCtaHref;
  const heroSecondaryHrefFromSettings = homePageSettings?.homeHero.secondaryCtaHref;
  const heroPrimaryColorFromSettings = homePageSettings?.homeHero.primaryCtaColor;
  const heroSecondaryColorFromSettings = homePageSettings?.homeHero.secondaryCtaColor;
  const heroMediaTypeFromSettings = homePageSettings?.homeHero.backgroundMediaType;
  const heroImageFromSettings = homePageSettings?.homeHero.backgroundImageSrc;
  const heroVideoFromSettings = homePageSettings?.homeHero.backgroundVideoSrc;

  const heroHeadline =
    heroHeadingFromSettings?.trim() ||
    content.hero.headline?.trim() ||
    (isArabic
      ? "حيث يتحول الطبخ إلى تجربة"
      : "Where cooking becomes an experience.");

  const legacyHeroMedia =
    homePageSettings?.homeHero.slideImages?.find((item) => item.trim()) || heroSlides[0];
  const legacyHeroMediaIsVideo = isVideoSource(legacyHeroMedia);
  const heroMediaType = heroMediaTypeFromSettings ?? (legacyHeroMediaIsVideo ? "video" : "image");
  let heroBackgroundMedia =
    heroMediaType === "video"
      ? (heroVideoFromSettings?.trim() ||
          (legacyHeroMediaIsVideo ? legacyHeroMedia : ""))
      : (heroImageFromSettings?.trim() ||
          (!legacyHeroMediaIsVideo ? legacyHeroMedia : heroSlides[0]));
  let heroBackgroundIsVideo = heroMediaType === "video";

  if (!heroBackgroundMedia) {
    heroBackgroundMedia = heroSlides[0];
    heroBackgroundIsVideo = false;
  }
  const homeLayout = homePageSettings?.homeLayout;
  const homeUpcoming = homePageSettings?.homeUpcoming;
  const homeWhyNoon = homePageSettings?.homeWhyNoon;
  const homePartners = homePageSettings?.homePartners;
  const homeNumbers = homePageSettings?.homeNumbers;
  const showHero = homeLayout?.showHero ?? true;
  const showNumbers = homeLayout?.showNumbers ?? true;
  const showUpcoming = homeLayout?.showUpcoming ?? true;
  const showWhyNoon = homeLayout?.showWhyNoon ?? true;
  const showPartners = homeLayout?.showPartners ?? true;

  const heroUi = {
    cookingClasses:
      heroPrimaryCtaFromSettings?.trim() ||
      (isArabic ? "دورات الطبخ" : "Cooking classes"),
    artClasses:
      heroSecondaryCtaFromSettings?.trim() ||
      (isArabic ? "دورات الفنون والحرف" : "Arts & crafts classes"),
    cookingHref: resolveHeroHref(locale, heroPrimaryHrefFromSettings ?? "", "/classes/cooking"),
    artsHref: resolveHeroHref(locale, heroSecondaryHrefFromSettings ?? "", "/classes/arts-crafts"),
    cookingColor: normalizeHexColor(heroPrimaryColorFromSettings ?? "#f77d6b", "#f77d6b"),
    artsColor: normalizeHexColor(heroSecondaryColorFromSettings ?? "#17b0ad", "#17b0ad"),
  };

  const whyNoonTitle =
    (isArabic ? homeWhyNoon?.titleAr : homeWhyNoon?.titleEn)?.trim() ||
    content.whyNoon.title;
  const whyNoonItems = Array.from({ length: 3 }, (_, index) => {
    const fallbackItem = content.whyNoon.items[index] ?? {
      title: isArabic ? "سبب مميز" : "Key reason",
      description: isArabic ? "وصف قصير" : "Short description",
    };
    const settingsItem = homeWhyNoon?.items[index];

    return {
      title: (isArabic ? settingsItem?.titleAr : settingsItem?.titleEn)?.trim() || fallbackItem.title,
      description:
        (isArabic ? settingsItem?.descriptionAr : settingsItem?.descriptionEn)?.trim() ||
        fallbackItem.description,
    };
  });
  const whyNoonBackgroundImage = homeWhyNoon?.backgroundImageSrc?.trim() || "";
  const whyNoonSectionTitleColor = normalizeHexColor(
    homeWhyNoon?.sectionTitleColor ?? (whyNoonBackgroundImage ? "#ffffff" : "#23150f"),
    whyNoonBackgroundImage ? "#ffffff" : "#23150f"
  );
  const whyNoonCardTitleColor = normalizeHexColor(homeWhyNoon?.cardTitleColor ?? "#111827", "#111827");
  const partnersTitle =
    (isArabic ? homePartners?.titleAr : homePartners?.titleEn)?.trim() ||
    content.partners.title;
  const partnerItems = (
    homePartners?.items.length ? homePartners.items : content.partners.items
  )
    .map((item, index) => {
      const fallbackItem = content.partners.items[index] ?? {
        id: `partner-${index + 1}`,
        name: isArabic ? `شريك ${index + 1}` : `Partner ${index + 1}`,
      };
      const nameFromSettings =
        item && "nameEn" in item
          ? (isArabic ? item.nameAr : item.nameEn)
          : fallbackItem.name;
      const logoFromSettings = item && "logoSrc" in item ? item.logoSrc : "";

      return {
        id: fallbackItem.id ?? `partner-${index + 1}`,
        name: (nameFromSettings || fallbackItem.name || "").trim(),
        logoSrc: (logoFromSettings || "").trim(),
      };
    })
    .filter((item) => item.name || item.logoSrc);
  const baseNumbersItems = Array.from({ length: 4 }, (_, index) => {
    const fallbackItem = content.numbers.items[index] ?? { value: "0+", label: isArabic ? "المؤشر" : "Metric" };
    const settingsItem = homeNumbers?.items[index];

    return {
      value: (isArabic ? settingsItem?.valueAr : settingsItem?.valueEn)?.trim() || fallbackItem.value,
      label: (isArabic ? settingsItem?.labelAr : settingsItem?.labelEn)?.trim() || fallbackItem.label,
    };
  });
  const dynamicHomeStats = await resolveDynamicHomeStats();
  const numbersItems = baseNumbersItems.map((item, index) => {
    const parsed = parseCounterValue(item.value);
    let value = parsed.numeric;

    if (index === 0) {
      value += dynamicHomeStats.studentsDelta;
    } else if (index === 1) {
      value += dynamicHomeStats.classesDelta;
    } else if (index === 2) {
      value += dynamicHomeStats.eventsDelta;
    } else if (index === 3 && dynamicHomeStats.yearsValue !== null) {
      value = Math.max(value, dynamicHomeStats.yearsValue);
    }

    return {
      value: `${value}${parsed.suffix}`,
      label: item.label,
    };
  });
  const upcomingTitle =
    (isArabic ? homeUpcoming?.titleAr : homeUpcoming?.titleEn)?.trim() ||
    content.upcoming.title;
  const upcomingBookNowLabel =
    (isArabic ? homeUpcoming?.bookNowLabelAr : homeUpcoming?.bookNowLabelEn)?.trim() ||
    content.upcoming.bookNowLabel;
  const upcomingTrainerLabel = isArabic ? "المدرب" : "Trainer";
  const upcomingItems = await resolveUpcomingItems(locale, []);

  return (
    <div className="home-sharp relative overflow-x-clip pb-8">
      {showHero && (
        <section className="relative isolate h-screen min-h-screen overflow-hidden border-b border-black/20">
          {heroBackgroundIsVideo ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={heroBackgroundMedia}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          ) : (
            <Image
              src={heroBackgroundMedia}
              alt={isArabic ? "خلفية هيرو نون" : "Noon hero background"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,8,7,0.25)_0%,rgba(9,8,7,0.45)_45%,rgba(9,8,7,0.68)_100%)]" />
          <div className="relative z-10 mx-auto flex h-full min-h-screen w-full max-w-6xl items-center justify-center px-4 py-20 text-center">
            <div className="w-full max-w-5xl">
              <h1
                className="text-4xl font-black leading-[1.2] tracking-[0.01em] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-7xl"
                style={{
                  fontFamily: isArabic
                    ? "var(--font-hero-ar), var(--font-arabic), sans-serif"
                    : "var(--font-home-title-en), var(--font-hero-en), var(--font-english), sans-serif",
                }}
              >
                {heroHeadline}
              </h1>
              <div className="mt-10 grid gap-4 sm:mx-auto sm:max-w-4xl sm:grid-cols-2">
                <Link
                  href={heroUi.cookingHref}
                  className="inline-flex w-full items-center justify-center border border-white/45 px-6 py-4 text-base font-extrabold shadow-[0_14px_32px_-16px_rgba(0,0,0,0.85)] transition hover:brightness-95 sm:text-lg"
                  style={{
                    backgroundColor: heroUi.cookingColor,
                    color: "#ffffff",
                  }}
                >
                  {heroUi.cookingClasses}
                </Link>
                <Link
                  href={heroUi.artsHref}
                  className="inline-flex w-full items-center justify-center border border-white/45 px-6 py-4 text-base font-extrabold shadow-[0_14px_32px_-16px_rgba(0,0,0,0.85)] transition hover:brightness-95 sm:text-lg"
                  style={{
                    backgroundColor: heroUi.artsColor,
                    color: "#ffffff",
                  }}
                >
                  {heroUi.artClasses}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {showUpcoming && (
        <Section
          isArabic={isArabic}
          title={upcomingTitle}
          sectionClassName="bg-gradient-to-l from-zinc-100 via-zinc-200/55 to-zinc-100 dark:from-zinc-800/70 dark:via-zinc-700/45 dark:to-zinc-800/70"
        >
        {upcomingItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingItems.map((c) => (
              <article
                key={c.id}
                className="group flex h-full flex-col overflow-hidden rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <Link href={c.href} aria-label={c.title} className="relative block aspect-[3/4] overflow-hidden">
                  <Image src={c.imageSrc} alt={c.title} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                </Link>
                <div className="flex flex-1 flex-col space-y-3 p-4 sm:p-5">
                  <h3 className="line-clamp-2 inline-flex items-start gap-2 text-base font-semibold text-[color:var(--text)] sm:text-lg">
                    <FiBookOpen className="mt-0.5 size-4 shrink-0 text-purple-500" />
                    <span>{c.title}</span>
                  </h3>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text)] sm:text-base">
                    <FiCalendar className="size-5 shrink-0 text-teal-500" />
                    {c.datetimeText}
                  </p>
                  <p className="inline-flex items-center gap-2 text-xs text-[color:var(--text-muted)] sm:text-sm">
                    <FiUser className="size-4 shrink-0 text-indigo-500" />
                    <span className="font-semibold text-[color:var(--text)]">{upcomingTrainerLabel}:</span>
                    <span>{c.trainerName}</span>
                  </p>
                  <div className="mt-auto pt-2">
                    <p className="mb-3 inline-flex items-center gap-2 text-2xl font-black leading-none text-[color:var(--text)] sm:text-3xl">
                      <HiOutlineBanknotes className="size-6 shrink-0 text-emerald-600" />
                      {c.priceText}
                    </p>
                    <Link
                      href={`/${locale}/classes/${c.slug}/book`}
                      className="inline-flex w-full items-center justify-center gap-1 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition hover:brightness-95"
                      style={{ backgroundColor: headerColor, color: headerButtonTextColor }}
                    >
                      {upcomingBookNowLabel}
                      <FiArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center text-sm font-medium text-[color:var(--text-muted)] sm:p-10">
            {isArabic ? "لا توجد فصول متاحة حالياً." : "No classes are available right now."}
          </div>
        )}

        {showNumbers && (
          <div className="mt-12 border-t border-[color:var(--border)] pt-10">
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-8 sm:gap-y-12">
              {numbersItems.map((item, index) => {
                const match = String(item.value).match(/(\d+)/);
                const numericValue = match ? Number(match[1]) : 0;
                const suffix = match ? String(item.value).replace(match[1], "") : "";

                return (
                  <div
                    key={`home-number-${index}`}
                    className="text-center"
                  >
                    <div
                      className="text-5xl font-light leading-none tracking-[0.01em] text-[color:var(--text)] sm:text-6xl"
                      style={{
                        fontFamily: isArabic
                          ? "var(--font-hero-ar), var(--font-arabic), sans-serif"
                          : "var(--font-hero-en), var(--font-english), sans-serif",
                      }}
                    >
                      <AnimatedCounter value={numericValue} suffix={suffix} />
                    </div>
                    <div className="mt-3 text-sm font-medium tracking-wide text-[color:var(--text-muted)] sm:text-base">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </Section>
      )}

      {showWhyNoon && (
        <section className="relative overflow-hidden py-20 sm:py-24">
          {whyNoonBackgroundImage ? (
            <div
              className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-fixed"
              style={{ backgroundImage: `url(${whyNoonBackgroundImage})` }}
            />
          ) : null}
          {whyNoonBackgroundImage ? (
            <div className="pointer-events-none absolute inset-0 -z-10 bg-black/40" />
          ) : null}
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="mb-8 flex justify-center">
              <div className="w-full max-w-3xl text-center">
                <h2
                  className="text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{
                    color: whyNoonSectionTitleColor,
                    fontFamily: isArabic
                      ? "var(--font-hero-ar), var(--font-arabic), sans-serif"
                      : "var(--font-home-title-en), var(--font-hero-en), var(--font-english), sans-serif",
                  }}
                >
                  {whyNoonTitle}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {whyNoonItems.map((item, index) => (
                <div
                  key={`why-noon-${index}`}
                  className="rounded-none border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-base font-semibold" style={{ color: whyNoonCardTitleColor }}>
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showPartners && partnerItems.length > 0 && (
        <Section isArabic={isArabic} title={partnersTitle} sectionClassName="pt-14 pb-2 sm:pt-16 sm:pb-3">
        <PartnersCarousel items={partnerItems} isArabic={isArabic} />
        </Section>
      )}

    </div>
  );
}
