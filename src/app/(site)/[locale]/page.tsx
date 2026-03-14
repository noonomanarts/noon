import Image from "next/image";
import Link from "next/link";

import { isLocale, type Locale } from "@/lib/locale";
import { getHomeContent } from "@/lib/homeContent";
import AnimatedCounter from "@/components/site/AnimatedCounter";
import HeroSlideshow from "@/components/site/HeroSlideshow";
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
};

const heroSlides = [
  "/images/slides/1.jpg",
  "/images/slides/2.jpg",
  "/images/slides/3.jpg",
  "/images/slides/4.jpg",
  "/images/slides/5.jpg",
  "/images/slides/6.jpg",
];

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
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <h2
              className="text-2xl font-semibold tracking-tight text-[color:var(--text)] sm:text-3xl"
              style={{ fontFamily: "var(--font-hero-en), var(--font-english), serif" }}
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
  const upcomingItems = await resolveUpcomingItems(
    locale,
    content.upcoming.items as UpcomingCard[]
  );

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

  const heroHeadline =
    heroHeadingFromSettings?.trim() ||
    content.hero.headline?.trim() ||
    (isArabic
      ? "حيث يتحول الطبخ إلى تجربة"
      : "Where cooking becomes an experience.");

  const heroSlideImages =
    homePageSettings?.homeHero.slideImages &&
    homePageSettings.homeHero.slideImages.length > 0
      ? homePageSettings.homeHero.slideImages
      : heroSlides;

  const heroAutoplayMs = homePageSettings?.homeHero.autoplayMs ?? 3800;
  const homeLayout = homePageSettings?.homeLayout;
  const homeCourses = homePageSettings?.homeCourses;
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
    upcomingCaption: isArabic
      ? "جلسات قادمة جاهزة للحجز."
      : "Handpicked sessions you can book right away.",
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

  return (
    <div className="home-sharp relative overflow-x-clip pb-8">
      {showHero && (
        <section className="relative isolate min-h-[74vh] overflow-hidden border-b border-black/20 sm:min-h-[78vh]">
          <HeroSlideshow
            images={heroSlideImages}
            intervalMs={heroAutoplayMs}
            alt={isArabic ? "صور من فعاليات ودورات نون" : "Noon classes and events slideshow"}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,8,7,0.25)_0%,rgba(9,8,7,0.45)_45%,rgba(9,8,7,0.68)_100%)]" />
          <div className="relative z-10 mx-auto flex min-h-[74vh] w-full max-w-6xl items-center justify-center px-4 py-20 text-center sm:min-h-[78vh]">
            <div className="w-full max-w-5xl">
              <h1
                className="text-5xl font-black leading-[0.95] tracking-[0.01em] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-8xl"
                style={{
                  fontFamily: isArabic
                    ? "var(--font-hero-ar), var(--font-arabic), serif"
                    : "var(--font-hero-en), var(--font-english), serif",
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
              <span className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-[color:var(--primary)]">
                {isArabic ? "استكشف" : "Explore"}
                <FiArrowRight className="size-4" />
              </span>
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
              <span className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-[color:var(--primary)]">
                {isArabic ? "استكشف" : "Explore"}
                <FiArrowRight className="size-4" />
              </span>
            </div>
          </Link>
        </div>
        </Section>
      )}

      {showNumbers && (
        <section className="py-8 sm:py-10">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm sm:p-7">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {content.numbers.items.map((item) => {
                const match = String(item.value).match(/(\d+)/);
                const numericValue = match ? Number(match[1]) : 0;
                const suffix = match ? String(item.value).replace(match[1], "") : "";

                return (
                  <div
                    key={`${item.value}-${item.label}`}
                    className="rounded-none border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-5 text-center"
                  >
                    <div className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
                      <AnimatedCounter value={numericValue} suffix={suffix} />
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--text-muted)]">{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </section>
      )}

      {showUpcoming && (
        <Section title={content.upcoming.title} description={heroUi.upcomingCaption}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingItems.slice(0, 3).map((c) => (
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
                <div className="flex items-center justify-between pt-1">
                  <div className="text-sm font-semibold text-[color:var(--text)]">{c.priceText}</div>
                  <Link
                    href={`/${locale}/classes/cooking`}
                    className="inline-flex items-center gap-1 rounded-none bg-[color:var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
                  >
                    {content.upcoming.bookNowLabel}
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
        <Section title={content.whyNoon.title} description={heroUi.whyCaption}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {content.whyNoon.items.map((item, index) => (
            <div
              key={item.title}
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

      {showPartners && (
        <Section title={content.partners.title} description={content.partners.description}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {content.partners.items.map((p) => (
            <div
              key={p.id}
              className="flex min-h-24 items-center justify-center rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-5 text-center text-sm font-semibold text-[color:var(--text-muted)] shadow-sm transition hover:-translate-y-0.5 hover:text-[color:var(--text)]"
            >
              {p.logoText ?? p.name}
            </div>
          ))}
        </div>
        </Section>
      )}
    </div>
  );
}
