import Image from "next/image";
import Link from "next/link";

import { isLocale, type Locale } from "@/lib/locale";
import { getHomeContent } from "@/lib/homeContent";
import HeroAnimation from "@/components/site/HeroAnimation";
import AnimatedCounter from "@/components/site/AnimatedCounter";
import BubblesAnimation from "@/components/site/BubblesAnimation";

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
  const heroHeadline =
    locale === "ar"
      ? "حيث يتحول الطبخ إلى تجربة"
      : "Where cooking becomes an experience.";

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#f7edde]">
        <div className="absolute inset-0">
          <Image
            src={content.hero.backgroundImageSrc ?? "/og-image.png"}
            alt=""
            fill
            priority
            className="object-cover opacity-[0.08] dark:opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f9f1e6]/95 via-[#f7edde]/98 to-[#f3e7d4] dark:from-[#060606]/90 dark:via-[#050505]/95 dark:to-[#040404]" />
        </div>

        {/* Bubbles Animation */}
        <BubblesAnimation count={25} className="z-0" />

        <div className="relative z-10">
          <div className="mx-auto w-full max-w-5xl px-4 py-16">
            <div className="flex flex-col items-center gap-8 text-center">
              <HeroAnimation
                animationPath="/cooking.json"
                className="mx-auto h-64 w-64 sm:h-72 sm:w-72"
              />

              <div className="space-y-4">
                <h1
                  className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl"
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
                  <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
                    {content.hero.subheadline}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href={`/${locale}/classes/cooking`}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                >
                  {content.hero.ctaExploreClasses}
                </Link>
                <Link
                  href={`/${locale}/group-booking-events/cooking-competition`}
                  className="inline-flex items-center justify-center rounded-full border border-purple-200 bg-white/80 px-6 py-3 text-sm font-semibold text-purple-700 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/60 dark:border-purple-900/50 dark:bg-zinc-900/60 dark:text-purple-200 dark:hover:bg-purple-900/20"
                >
                  {locale === "ar" ? "حجز فعالية" : "Book an event"}
                </Link>
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
          {content.upcoming.items.slice(0, 3).map((c) => (
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
