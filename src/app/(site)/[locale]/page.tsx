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
import { FiArrowRight, FiCalendar, FiClock } from "react-icons/fi";

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
  const heroSubheadingFromSettings = isArabic
    ? homePageSettings?.subheadingAr
    : homePageSettings?.subheadingEn;
  const heroPrimaryCtaFromSettings = isArabic
    ? homePageSettings?.homeHero.primaryCtaAr
    : homePageSettings?.homeHero.primaryCtaEn;
  const heroSecondaryCtaFromSettings = isArabic
    ? homePageSettings?.homeHero.secondaryCtaAr
    : homePageSettings?.homeHero.secondaryCtaEn;
  const heroTrustLineFromSettings = isArabic
    ? homePageSettings?.homeHero.trustLineAr
    : homePageSettings?.homeHero.trustLineEn;

  const heroHeadline =
    heroHeadingFromSettings?.trim() ||
    content.hero.headline?.trim() ||
    (isArabic
      ? "حيث يتحول الطبخ إلى تجربة"
      : "Where cooking becomes an experience.");
  const heroSubheadline =
    heroSubheadingFromSettings?.trim() || content.hero.subheadline?.trim() || "";

  const heroSlideImages =
    homePageSettings?.homeHero.slideImages &&
    homePageSettings.homeHero.slideImages.length > 0
      ? homePageSettings.homeHero.slideImages
      : heroSlides;

  const heroAutoplayMs = homePageSettings?.homeHero.autoplayMs ?? 3800;
  const heroKpis = content.numbers.items.slice(0, 3);

  const heroUi = {
    exploreClasses:
      heroPrimaryCtaFromSettings?.trim() || content.hero.ctaExploreClasses,
    bookEvent:
      heroSecondaryCtaFromSettings?.trim() ||
      (isArabic ? "احجز فعالية" : "Book an event"),
    trustLine:
      heroTrustLineFromSettings?.trim() ||
      (isArabic
        ? "تجربة موثوقة للمجموعات والعائلات والأفراد."
        : "Trusted classes and events for teams, families, and individuals."),
    numbersLabel: isArabic ? "أرقامنا" : "Our Impact",
    classesCaption: isArabic
      ? "برامج متجددة بلمسة إبداعية."
      : "Signature programs crafted for every level.",
    upcomingCaption: isArabic
      ? "جلسات قادمة جاهزة للحجز."
      : "Handpicked sessions you can book right away.",
    whyCaption: isArabic
      ? "الفرق الحقيقي في تجربة نون."
      : "What truly sets the Noon experience apart.",
  };

  return (
    <div className="relative overflow-x-clip pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem]">
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-teal/20 blur-3xl dark:bg-teal/10" />
        <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-coral/20 blur-3xl dark:bg-coral/10" />
      </div>

      <section className="relative isolate pt-8 sm:pt-10 lg:pt-12">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-7">
              <h1
                className="max-w-3xl text-4xl font-semibold leading-[1.03] tracking-tight text-[color:var(--text)] sm:text-5xl lg:text-6xl"
                style={{
                  fontFamily: isArabic
                    ? "var(--font-hero-ar), var(--font-arabic), serif"
                    : "var(--font-hero-en), var(--font-english), serif",
                }}
              >
                {heroHeadline}
              </h1>

              {heroSubheadline ? (
                <p className="max-w-2xl text-base leading-8 text-[color:var(--text-muted)] sm:text-lg">
                  {heroSubheadline}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/classes/cooking`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[color:var(--primary-hover)]"
                >
                  {heroUi.exploreClasses}
                  <FiArrowRight className="size-4" />
                </Link>
                <Link
                  href={`/${locale}/group-booking-events`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-3 text-sm font-semibold text-[color:var(--text)] transition hover:-translate-y-0.5 hover:bg-[color:var(--muted)]"
                >
                  {heroUi.bookEvent}
                  <FiCalendar className="size-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm leading-7 text-[color:var(--text-muted)] shadow-sm">
                {heroUi.trustLine}
              </div>

              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-sm">
                <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                  {heroUi.numbersLabel}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {heroKpis.map((item) => (
                    <div
                      key={`hero-kpi-${item.value}-${item.label}`}
                      className="rounded-2xl bg-[color:var(--muted)] px-4 py-3"
                    >
                      <p className="text-xl font-bold text-[color:var(--text)]">{item.value}</p>
                      <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-teal/35 via-transparent to-coral/35 blur-md" />
              <div className="relative rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-2xl">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
                  <HeroSlideshow
                    images={heroSlideImages}
                    intervalMs={heroAutoplayMs}
                    alt={isArabic ? "صور من فعاليات ودورات نون" : "Noon classes and events slideshow"}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section title={content.courses.title} description={heroUi.classesCaption}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Link
            href={`/${locale}/classes/cooking`}
            className="group overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative aspect-[5/4] overflow-hidden">
              <Image
                src="/images/cooking.png"
                alt={isArabic ? "دورات الطبخ" : "Cooking classes"}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
            </div>
            <div className="space-y-2 p-5">
              <h3 className="text-lg font-semibold text-[color:var(--text)]">
                {isArabic ? "دورات الطبخ" : "Cooking classes"}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                {isArabic
                  ? "من أساسيات الطبخ حتى التجارب المتقدمة بطابع عملي ممتع."
                  : "From foundations to advanced techniques in a practical, immersive format."}
              </p>
              <span className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-[color:var(--primary)]">
                {isArabic ? "استكشف" : "Explore"}
                <FiArrowRight className="size-4" />
              </span>
            </div>
          </Link>

          <Link
            href={`/${locale}/classes/arts-crafts`}
            className="group overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative aspect-[5/4] overflow-hidden">
              <Image
                src="/images/art.png"
                alt={isArabic ? "فنون وحرف" : "Arts & crafts classes"}
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
            </div>
            <div className="space-y-2 p-5">
              <h3 className="text-lg font-semibold text-[color:var(--text)]">
                {isArabic ? "فنون وحرف" : "Arts & crafts classes"}
              </h3>
              <p className="text-sm text-[color:var(--text-muted)]">
                {isArabic
                  ? "جلسات إبداعية تدمج الحرفة والفن في بيئة ملهمة."
                  : "Creative sessions that blend craftsmanship and artistic expression."}
              </p>
              <span className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-[color:var(--primary)]">
                {isArabic ? "استكشف" : "Explore"}
                <FiArrowRight className="size-4" />
              </span>
            </div>
          </Link>
        </div>
      </Section>

      <section className="py-8 sm:py-10">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm sm:p-7">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {content.numbers.items.map((item) => {
                const match = String(item.value).match(/(\d+)/);
                const numericValue = match ? Number(match[1]) : 0;
                const suffix = match ? String(item.value).replace(match[1], "") : "";

                return (
                  <div
                    key={`${item.value}-${item.label}`}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-5 text-center"
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

      <Section title={content.upcoming.title} description={heroUi.upcomingCaption}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingItems.slice(0, 3).map((c) => (
            <article
              key={c.id}
              className="group overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
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
                    className="inline-flex items-center gap-1 rounded-full bg-[color:var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
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

      <Section title={content.whyNoon.title} description={heroUi.whyCaption}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {content.whyNoon.items.map((item, index) => (
            <div
              key={item.title}
              className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm"
            >
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--muted)] text-xs font-semibold text-[color:var(--text-muted)]">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="text-base font-semibold text-[color:var(--text)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{item.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={content.partners.title} description={content.partners.description}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {content.partners.items.map((p) => (
            <div
              key={p.id}
              className="flex min-h-24 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-5 text-center text-sm font-semibold text-[color:var(--text-muted)] shadow-sm transition hover:-translate-y-0.5 hover:text-[color:var(--text)]"
            >
              {p.logoText ?? p.name}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
