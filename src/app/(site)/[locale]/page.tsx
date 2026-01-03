import Image from "next/image";
import Link from "next/link";

import { isLocale, type Locale } from "@/lib/locale";
import { getHomeContent } from "@/lib/homeContent";

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
          <h2 className="noon-text text-xl font-semibold tracking-tight">
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

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-black/5 dark:border-white/10">
        <div className="absolute inset-0">
          <Image
            src={content.hero.backgroundImageSrc ?? "/og-image.png"}
            alt=""
            fill
            priority
            className="object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-linear-to-b from-white/90 via-white/95 to-white dark:from-zinc-950/70 dark:via-zinc-950/80 dark:to-zinc-950" />
        </div>

        <div className="relative">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <p className="noon-pill px-4 py-2 text-xs font-semibold">
                Noon · Oman
              </p>
              <h1 className="noon-text text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                {content.hero.headline}
              </h1>
              {content.hero.subheadline ? (
                <p className="noon-text-muted max-w-xl text-base leading-7">
                  {content.hero.subheadline}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/classes/cooking`}
                  className="noon-btn noon-btn-lg noon-btn-primary"
                >
                  {content.hero.ctaExploreClasses}
                </Link>
                <Link
                  href={`/${locale}/group-booking-events/cooking-competition`}
                  className="noon-btn noon-btn-lg noon-btn-secondary"
                >
                  {locale === "ar" ? "حجز فعالية" : "Book an event"}
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-4/3 overflow-hidden rounded-3xl border noon-border noon-muted shadow-lg">
                <Image
                  src={content.hero.backgroundImageSrc ?? "/og-image.png"}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our courses */}
      <Section title={content.courses.title}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href={`/${locale}/classes/cooking`}
            className="noon-card group rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="noon-text text-sm font-semibold">
                  {content.courses.cookingLabel}
                </div>
                <div className="noon-text-muted mt-1 text-sm">
                  {locale === "ar"
                    ? "وصفات، مهارات، وتجربة ممتعة."
                    : "Recipes, skills, and a great experience."}
                </div>
              </div>
              <span className="noon-btn noon-btn-sm noon-btn-primary">
                {locale === "ar" ? "عرض" : "Explore"}
              </span>
            </div>
          </Link>

          <Link
            href={`/${locale}/classes/arts-crafts`}
            className="noon-card group rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="noon-text text-sm font-semibold">
                  {content.courses.artsLabel}
                </div>
                <div className="noon-text-muted mt-1 text-sm">
                  {locale === "ar"
                    ? "حِرف، فنون، ووقت إبداعي."
                    : "Crafts, art, and creative time."}
                </div>
              </div>
              <span className="noon-btn noon-btn-sm noon-btn-primary">
                {locale === "ar" ? "عرض" : "Explore"}
              </span>
            </div>
          </Link>
        </div>
      </Section>

      {/* Numbers */}
      <Section title={content.numbers.title}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {content.numbers.items.map((item) => (
            <div
              key={`${item.value}-${item.label}`}
              className="noon-card rounded-3xl border p-6 text-center shadow-sm"
            >
              <div className="noon-text text-2xl font-semibold tracking-tight">
                {item.value}
              </div>
              <div className="noon-text-muted mt-1 text-sm">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </Section>

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
