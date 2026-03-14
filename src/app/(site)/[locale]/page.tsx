import Image from "next/image";
import Link from "next/link";

import { isLocale, type Locale } from "@/lib/locale";
import { getHomeContent } from "@/lib/homeContent";
import AnimatedCounter from "@/components/site/AnimatedCounter";
import PartnersCarousel from "@/components/site/PartnersCarousel";
import { resolveHeaderColor } from "@/lib/headerBranding";
import { findClassSessions, findManyClasses } from "@/lib/db/classes";
import { getAdminSettingsByKey } from "@/lib/db/adminSettings";
import {
  getSitePageByKey,
  makeSitePageSettingsKey,
  sanitizeSitePageSettings,
  type SitePageSettings,
} from "@/lib/admin/sitePages";
import { FiArrowRight, FiClock, FiPenTool, FiScissors } from "react-icons/fi";
import { GiChefToque, GiCookingPot, GiKnifeFork, GiPalette } from "react-icons/gi";

type UpcomingCard = {
  id: string;
  title: string;
  datetimeText: string;
  priceText: string;
  imageSrc: string;
  href: string;
};

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
    const classes = await findManyClasses({ status: "PUBLISHED", limit: 16 });
    const sessionsByClass = await Promise.all(
      classes.map(async (classItem) => {
        const sessions = await findClassSessions(classItem.id, {
          upcomingOnly: true,
          limit: 1,
        });
        return { classItem, sessions };
      })
    );

    const upcoming = sessionsByClass
      .flatMap(({ classItem, sessions }) =>
        sessions.map((session) => ({
          id: `${classItem.id}-${session.id}`,
          title:
            locale === "ar" && classItem.titleAr
              ? classItem.titleAr
              : classItem.title,
          imageSrc: classItem.image || "/og-image.png",
          startTime: new Date(session.startTime),
          priceText: `${classItem.price.toFixed(3)} ${classItem.currency}`,
          href: `/${locale}/classes/${classItem.slug}`,
        }))
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 3)
      .map((item) => {
        const localeCode = locale === "ar" ? "ar-OM" : "en-OM";
        const date = item.startTime.toLocaleDateString(localeCode, {
          month: "short",
          day: "numeric",
        });
        const time = item.startTime.toLocaleTimeString(localeCode, {
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          id: item.id,
          title: item.title,
          datetimeText: `${date} · ${time}`,
          priceText: item.priceText,
          imageSrc: item.imageSrc,
          href: item.href,
        };
      });

    if (upcoming.length > 0) {
      return upcoming;
    }
  } catch {
    // Fallback to static content when database is unavailable.
  }

  return fallback;
}

function Section({
  title,
  description,
  isArabic,
  children,
}: {
  title: string;
  description?: string;
  isArabic: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
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
            {description ? (
              <p className="text-sm leading-6 text-[color:var(--text-muted)] sm:text-base">
                {description}
              </p>
            ) : null}
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
  const homeCourses = homePageSettings?.homeCourses;
  const homeUpcoming = homePageSettings?.homeUpcoming;
  const homeWhyNoon = homePageSettings?.homeWhyNoon;
  const homePartners = homePageSettings?.homePartners;
  const homeNumbers = homePageSettings?.homeNumbers;
  const showHero = homeLayout?.showHero ?? true;
  const showCourses = homeLayout?.showCourses ?? true;
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
    whyCaption: isArabic
      ? "الفرق الحقيقي في تجربة نون."
      : "What truly sets the Noon experience apart.",
  };

  const coursesUi = {
    cookingImageSrc: homeCourses?.cookingImageSrc?.trim() || "/images/cooking.png",
    artsImageSrc: homeCourses?.artsImageSrc?.trim() || "/images/art.png",
    cookingDisplayMode: homeCourses?.cookingDisplayMode ?? "icon",
    artsDisplayMode: homeCourses?.artsDisplayMode ?? "icon",
    cookingIcon: homeCourses?.cookingIcon ?? "cooking-pot",
    artsIcon: homeCourses?.artsIcon ?? "palette",
  };

  const whyNoonTitle =
    (isArabic ? homeWhyNoon?.titleAr : homeWhyNoon?.titleEn)?.trim() ||
    content.whyNoon.title;
  const whyNoonDescription =
    (isArabic ? homeWhyNoon?.descriptionAr : homeWhyNoon?.descriptionEn)?.trim() ||
    heroUi.whyCaption;
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
  const partnersTitle =
    (isArabic ? homePartners?.titleAr : homePartners?.titleEn)?.trim() ||
    content.partners.title;
  const partnersDescription =
    (isArabic ? homePartners?.descriptionAr : homePartners?.descriptionEn)?.trim() ||
    content.partners.description;
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
  const numbersItems = Array.from({ length: 4 }, (_, index) => {
    const fallbackItem = content.numbers.items[index] ?? { value: "0+", label: isArabic ? "المؤشر" : "Metric" };
    const settingsItem = homeNumbers?.items[index];

    return {
      value: (isArabic ? settingsItem?.valueAr : settingsItem?.valueEn)?.trim() || fallbackItem.value,
      label: (isArabic ? settingsItem?.labelAr : settingsItem?.labelEn)?.trim() || fallbackItem.label,
    };
  });
  const upcomingTitle =
    (isArabic ? homeUpcoming?.titleAr : homeUpcoming?.titleEn)?.trim() ||
    content.upcoming.title;
  const upcomingDescription =
    (isArabic ? homeUpcoming?.descriptionAr : homeUpcoming?.descriptionEn)?.trim() ||
    (isArabic ? "جلسات قادمة جاهزة للحجز." : "Handpicked sessions you can book right away.");
  const upcomingBookNowLabel =
    (isArabic ? homeUpcoming?.bookNowLabelAr : homeUpcoming?.bookNowLabelEn)?.trim() ||
    content.upcoming.bookNowLabel;
  const fallbackUpcomingItems: UpcomingCard[] = (content.upcoming.items as UpcomingCard[]).map((item, index) => ({
    ...item,
    id: item.id || `fallback-upcoming-${index + 1}`,
    href: `/${locale}/classes/cooking`,
  }));
  const configuredUpcomingItems = (homeUpcoming?.items ?? [])
    .map((item, index) => ({
      id: `configured-upcoming-${index + 1}`,
      title: (isArabic ? item.titleAr : item.titleEn).trim(),
      datetimeText: (isArabic ? item.datetimeTextAr : item.datetimeTextEn).trim(),
      priceText: (isArabic ? item.priceTextAr : item.priceTextEn).trim(),
      imageSrc: item.imageSrc.trim(),
      href: resolveHeroHref(locale, item.href, "/classes/cooking"),
    }))
    .filter((item) => item.title || item.datetimeText || item.priceText || item.imageSrc);
  const upcomingItems =
    configuredUpcomingItems.length > 0
      ? configuredUpcomingItems
      : await resolveUpcomingItems(locale, fallbackUpcomingItems);

  return (
    <div className="home-sharp relative overflow-x-clip pb-8">
      {showHero && (
        <section className="relative isolate min-h-[74vh] overflow-hidden border-b border-black/20 sm:min-h-[78vh]">
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
          <div className="relative z-10 mx-auto flex min-h-[74vh] w-full max-w-6xl items-center justify-center px-4 py-20 text-center sm:min-h-[78vh]">
            <div className="w-full max-w-5xl">
              <h1
                className="text-5xl font-black leading-[0.95] tracking-[0.01em] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-8xl"
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
                    color: getReadableTextColor(heroUi.cookingColor),
                  }}
                >
                  {heroUi.cookingClasses}
                </Link>
                <Link
                  href={heroUi.artsHref}
                  className="inline-flex w-full items-center justify-center border border-white/45 px-6 py-4 text-base font-extrabold shadow-[0_14px_32px_-16px_rgba(0,0,0,0.85)] transition hover:brightness-95 sm:text-lg"
                  style={{
                    backgroundColor: heroUi.artsColor,
                    color: getReadableTextColor(heroUi.artsColor),
                  }}
                >
                  {heroUi.artClasses}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {showCourses && (
        <Section
          isArabic={isArabic}
          title={
            isArabic
              ? (homeCourses?.titleAr.trim() || content.courses.title)
              : (homeCourses?.titleEn.trim() || content.courses.title)
          }
          description={
            isArabic
              ? (homeCourses?.subtitleAr.trim() || "برامج متجددة بلمسة إبداعية.")
              : (homeCourses?.subtitleEn.trim() || "Signature programs crafted for every level.")
          }
        >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Link
            href={`/${locale}/classes/cooking`}
            className="group overflow-hidden rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            {coursesUi.cookingDisplayMode === "image" ? (
              <div className="relative h-56 w-full overflow-hidden">
                <Image
                  src={coursesUi.cookingImageSrc}
                  alt={isArabic ? "دورات الطبخ" : "Cooking classes"}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
              </div>
            ) : (
              <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-800/30">
                {renderCourseIcon(coursesUi.cookingIcon, "cooking")}
              </div>
            )}
            <div className="space-y-2 p-5">
              <h3 className="text-lg font-semibold text-[color:var(--text)]">
                {isArabic
                  ? (homeCourses?.cookingTitleAr.trim() || "دورات الطبخ")
                  : (homeCourses?.cookingTitleEn.trim() || "Cooking classes")}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                {isArabic
                  ? (homeCourses?.cookingDescriptionAr.trim() || "من أساسيات الطبخ حتى التجارب المتقدمة بطابع عملي ممتع.")
                  : (homeCourses?.cookingDescriptionEn.trim() || "From foundations to advanced techniques in a practical, immersive format.")}
              </p>
              <div className="pt-2">
                <span
                  className="inline-flex w-full items-center justify-center gap-1 border border-black/20 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition hover:brightness-95"
                  style={{ backgroundColor: headerColor, color: headerButtonTextColor }}
                >
                  {isArabic ? "استكشف" : "Explore"}
                  <FiArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/classes/arts-crafts`}
            className="group overflow-hidden rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            {coursesUi.artsDisplayMode === "image" ? (
              <div className="relative h-56 w-full overflow-hidden">
                <Image
                  src={coursesUi.artsImageSrc}
                  alt={isArabic ? "فنون وحرف" : "Arts & crafts classes"}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
              </div>
            ) : (
              <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-purple-50 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/30">
                {renderCourseIcon(coursesUi.artsIcon, "arts")}
              </div>
            )}
            <div className="space-y-2 p-5">
              <h3 className="text-lg font-semibold text-[color:var(--text)]">
                {isArabic
                  ? (homeCourses?.artsTitleAr.trim() || "فنون وحرف")
                  : (homeCourses?.artsTitleEn.trim() || "Arts & crafts classes")}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                {isArabic
                  ? (homeCourses?.artsDescriptionAr.trim() || "جلسات إبداعية تدمج الحرفة والفن في بيئة ملهمة.")
                  : (homeCourses?.artsDescriptionEn.trim() || "Creative sessions that blend craftsmanship and artistic expression.")}
              </p>
              <div className="pt-2">
                <span
                  className="inline-flex w-full items-center justify-center gap-1 border border-black/20 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition hover:brightness-95"
                  style={{ backgroundColor: headerColor, color: headerButtonTextColor }}
                >
                  {isArabic ? "استكشف" : "Explore"}
                  <FiArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </Link>
        </div>
        </Section>
      )}

      {showUpcoming && (
        <Section isArabic={isArabic} title={upcomingTitle} description={upcomingDescription}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingItems.map((c) => (
            <article
              key={c.id}
              className="group overflow-hidden rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[16/11] overflow-hidden">
                <Image src={c.imageSrc} alt="" fill className="object-cover transition duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="space-y-3 p-5">
                <h3 className="line-clamp-1 text-base font-semibold text-[color:var(--text)]">{c.title}</h3>
                <p className="inline-flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
                  <FiClock className="size-3.5" />
                  {c.datetimeText}
                </p>
                <div className="space-y-3 pt-1">
                  <div className="text-sm font-semibold text-[color:var(--text)]">{c.priceText}</div>
                  <Link
                    href={c.href}
                    className="inline-flex w-full items-center justify-center gap-1 border border-black/20 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition hover:brightness-95"
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
        </Section>
      )}

      {showWhyNoon && (
        <Section isArabic={isArabic} title={whyNoonTitle} description={whyNoonDescription}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {whyNoonItems.map((item, index) => (
            <div
              key={`why-noon-${index}`}
              className="rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm"
            >
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-none bg-[color:var(--muted)] text-xs font-semibold text-[color:var(--text-muted)]">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="text-base font-semibold text-[color:var(--text)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{item.description}</p>
            </div>
          ))}
        </div>
        </Section>
      )}

      {showPartners && partnerItems.length > 0 && (
        <Section isArabic={isArabic} title={partnersTitle} description={partnersDescription}>
        <PartnersCarousel items={partnerItems} isArabic={isArabic} />
        </Section>
      )}

      {showNumbers && (
        <section className="py-12 sm:py-14">
          <div className="mx-auto w-full max-w-6xl px-4">
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
        </section>
      )}
    </div>
  );
}
