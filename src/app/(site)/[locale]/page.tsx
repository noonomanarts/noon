import Image from "next/image";
import Link from "next/link";

import { isLocale, type Locale } from "@/lib/locale";
import { getHomeContent } from "@/lib/homeContent";
import HeroAnimation from "@/components/site/HeroAnimation";
import AnimatedCounter from "@/components/site/AnimatedCounter";
import BubblesAnimation from "@/components/site/BubblesAnimation";
import { findClassSessions, findManyClasses } from "@/lib/db/classes";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiUsers,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

type UpcomingCard = {
  id: string;
  title: string;
  datetimeText: string;
  priceText: string;
  imageSrc: string;
};

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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-12">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100" style={{ color: 'var(--text)' }}>
            {title}
          </h2>
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
  const content = getHomeContent(locale);
  const upcomingItems = await resolveUpcomingItems(
    locale,
    content.upcoming.items as UpcomingCard[]
  );
  const heroHeadline =
    content.hero.headline?.trim() ||
    (locale === "ar"
      ? "حيث يتحول الطبخ إلى تجربة"
      : "Where cooking becomes an experience.");
  const heroKpis = content.numbers.items.slice(0, 3);
  const heroUpcomingPreview = upcomingItems.slice(0, 2);
  const heroUi = {
    eyebrow: locale === "ar" ? "نون ستوديو • مسقط" : "Noon Studio • Muscat",
    bookEvent: locale === "ar" ? "احجز فعالية" : "Book an event",
    trustedBy: locale === "ar" ? "تجربة موثوقة للمجموعات والعائلات" : "Trusted by teams, families, and creators",
    featureOne: locale === "ar" ? "مدربون بخبرة عملية عالية" : "Expert-led, hands-on sessions",
    featureTwo: locale === "ar" ? "تجربة اجتماعية ممتعة ومُلهمة" : "Social and memorable experiences",
    featureThree: locale === "ar" ? "رحلة حجز سهلة وسريعة" : "Fast and frictionless booking flow",
    upcomingNow: locale === "ar" ? "قريباً في نون" : "Happening Soon at Noon",
    from: locale === "ar" ? "من" : "From",
    quickClass: locale === "ar" ? "دروس مختارة" : "Selected Classes",
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#f6efe3] dark:bg-[#050505]">
        <div className="absolute inset-0">
          <Image
            src={content.hero.backgroundImageSrc ?? "/og-image.png"}
            alt=""
            fill
            priority
            className="object-cover opacity-[0.18] dark:opacity-[0.14]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#fbf4e8]/90 via-[#f4e7d6]/92 to-[#efe0cc]/95 dark:from-[#030303]/90 dark:via-[#050505]/92 dark:to-[#090909]/95" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-teal/20 blur-3xl dark:bg-teal/15" />
            <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-coral/20 blur-3xl dark:bg-coral/15" />
            <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-yellow/20 blur-3xl dark:bg-yellow/10" />
          </div>
        </div>

        {/* Bubbles Animation */}
        <BubblesAnimation count={18} className="z-0 opacity-70" />

        <div className="relative z-10">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-16 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200">
                  <HiSparkles className="size-3.5 text-coral" />
                  {heroUi.eyebrow}
                </div>

                <h1
                  className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl lg:text-6xl"
                  style={{
                    fontFamily:
                      locale === "ar"
                        ? "var(--font-hero-ar), var(--font-arabic), serif"
                        : "var(--font-hero-en), var(--font-english), serif",
                  }}
                >
                  {heroHeadline}
                </h1>

                {content.hero.subheadline ? (
                  <p className="max-w-2xl text-base leading-7 text-zinc-700 dark:text-zinc-300 sm:text-lg">
                    {content.hero.subheadline}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/${locale}/classes/cooking`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-teal-500/30 transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                  >
                    {content.hero.ctaExploreClasses}
                    <FiArrowRight className="size-4" />
                  </Link>
                  <Link
                    href={`/${locale}/group-booking-events`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white/85 px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/75 dark:text-zinc-100 dark:hover:border-zinc-600"
                  >
                    {heroUi.bookEvent}
                    <FiCalendar className="size-4" />
                  </Link>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {heroUi.trustedBy}
                  </p>
                  <ul className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
                    <li className="inline-flex items-center gap-2">
                      <FiCheckCircle className="size-4 text-teal" />
                      {heroUi.featureOne}
                    </li>
                    <li className="inline-flex items-center gap-2">
                      <FiCheckCircle className="size-4 text-teal" />
                      {heroUi.featureTwo}
                    </li>
                    <li className="inline-flex items-center gap-2 sm:col-span-2">
                      <FiCheckCircle className="size-4 text-teal" />
                      {heroUi.featureThree}
                    </li>
                  </ul>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {heroKpis.map((item) => (
                    <div
                      key={`hero-kpi-${item.value}-${item.label}`}
                      className="rounded-2xl border border-zinc-200/70 bg-white/80 p-4 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70"
                    >
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{item.value}</p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/80 p-3 shadow-2xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
                    <Image
                      src={content.hero.backgroundImageSrc ?? "/og-image.png"}
                      alt=""
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-zinc-900/25 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/20 bg-black/35 p-4 text-white backdrop-blur">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/80">{heroUi.upcomingNow}</p>
                      <p className="mt-1 text-lg font-semibold">{heroUi.quickClass}</p>
                      <div className="mt-2 inline-flex items-center gap-2 text-xs text-white/90">
                        <FiUsers className="size-3.5" />
                        8-40
                        <span className="opacity-50">•</span>
                        <FiClock className="size-3.5" />
                        2-3h
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {heroUpcomingPreview.map((item) => (
                    <div
                      key={`hero-preview-${item.id}`}
                      className="rounded-2xl border border-zinc-200/80 bg-white/85 p-4 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80"
                    >
                      <p className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{item.datetimeText}</p>
                      <p className="mt-3 inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {heroUi.from} {item.priceText}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pointer-events-none absolute -bottom-8 -right-8 hidden h-36 w-36 rounded-full border border-zinc-200/70 bg-white/50 backdrop-blur lg:block dark:border-zinc-700 dark:bg-zinc-900/40">
                  <HeroAnimation
                    animationPath="/cooking.json"
                    className="h-full w-full p-6 opacity-90"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our courses */}
      <section className="py-12">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-2 sm:grid-cols-2">
            <Link
              href={`/${locale}/classes/cooking`}
              className="group w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src="/images/cooking.png"
                  alt={locale === "ar" ? "دورات الطبخ" : "Cooking classes"}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {locale === "ar" ? "دورات الطبخ" : "Cooking classes"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {locale === "ar"
                        ? "وصفات، مهارات، وتجربة ممتعة."
                        : "Recipes, skills, and a great experience."}
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition group-hover:bg-teal-700">
                    {locale === "ar" ? "استكشف" : "Explore"}
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/classes/arts-crafts`}
              className="group w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src="/images/art.png"
                  alt={locale === "ar" ? "فنون وحرف" : "Arts & crafts classes"}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {locale === "ar" ? "فنون وحرف" : "Arts & crafts classes"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {locale === "ar"
                        ? "حِرف، فنون، ووقت إبداعي."
                        : "Crafts, art, and creative time."}
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition group-hover:bg-purple-700">
                    {locale === "ar" ? "استكشف" : "Explore"}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="py-12">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {content.numbers.items.map((item) => {
              const match = String(item.value).match(/(\d+)/);
              const numericValue = match ? Number(match[1]) : 0;
              const suffix = match ? String(item.value).replace(match[1], "") : "";

              return (
                <div
                  key={`${item.value}-${item.label}`}
                  className="noon-card rounded-3xl border p-6 text-center shadow-sm"
                >
                  <div className="noon-text text-2xl font-semibold tracking-tight">
                    <AnimatedCounter value={numericValue} suffix={suffix} />
                  </div>
                  <div className="noon-text-muted mt-1 text-sm">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upcoming */}
      <Section title={content.upcoming.title}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingItems.slice(0, 3).map((c) => (
            <article
              key={c.id}
              className="noon-card overflow-hidden rounded-3xl border shadow-sm"
            >
              <div className="noon-muted relative aspect-16/10">
                <Image src={c.imageSrc} alt="" fill className="object-cover" />
              </div>
              <div className="space-y-3 p-6">
                <div>
                  <h3 className="noon-text text-base font-semibold">
                    {c.title}
                  </h3>
                  <p className="noon-text-muted mt-1 text-sm">
                    {c.datetimeText}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="noon-text text-sm font-semibold">
                    {c.priceText}
                  </div>
                  <Link
                    href={`/${locale}/classes/cooking`}
                    className="noon-btn noon-btn-sm noon-btn-primary"
                  >
                    {content.upcoming.bookNowLabel}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Why Noon */}
      <Section title={content.whyNoon.title}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {content.whyNoon.items.map((item) => (
            <div
              key={item.title}
              className="noon-card rounded-3xl border p-6 shadow-sm"
            >
              <div className="noon-text text-sm font-semibold">
                {item.title}
              </div>
              <div className="noon-text-muted mt-2 text-sm leading-6">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Partners */}
      <Section title={content.partners.title}>
        <p className="noon-text-muted max-w-3xl text-sm leading-6">
          {content.partners.description}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {content.partners.items.map((p) => (
            <div
              key={p.id}
              className="noon-card noon-text-muted flex items-center justify-center rounded-2xl border px-4 py-6 text-center text-sm font-semibold shadow-sm"
            >
              {p.logoText ?? p.name}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
