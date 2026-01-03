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
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
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
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/80 to-white dark:from-zinc-950/70 dark:via-zinc-950/80 dark:to-zinc-950" />
        </div>

        <div className="relative">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <p className="inline-flex w-fit items-center rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-200">
                Noon · Oman
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
                {content.hero.headline}
              </h1>
              {content.hero.subheadline ? (
                <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
                  {content.hero.subheadline}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/classes/cooking`}
                  className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900/50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                >
                  {content.hero.ctaExploreClasses}
                </Link>
                <Link
                  href={`/${locale}/group-booking-events/cooking-competition`}
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900/30"
                >
                  {locale === "ar" ? "حجز فعالية" : "Book an event"}
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-black/10 bg-zinc-100 shadow-lg dark:border-white/15 dark:bg-zinc-900">
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
            className="group rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/15 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {content.courses.cookingLabel}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {locale === "ar"
                    ? "وصفات، مهارات، وتجربة ممتعة."
                    : "Recipes, skills, and a great experience."}
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950">
                {locale === "ar" ? "عرض" : "Explore"}
              </span>
            </div>
          </Link>

          <Link
            href={`/${locale}/classes/arts-crafts`}
            className="group rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/15 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {content.courses.artsLabel}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {locale === "ar"
                    ? "حِرف، فنون، ووقت إبداعي."
                    : "Crafts, art, and creative time."}
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950">
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
              className="rounded-3xl border border-black/10 bg-white p-6 text-center shadow-sm dark:border-white/15 dark:bg-zinc-950"
            >
              <div className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {item.value}
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
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
              className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm dark:border-white/15 dark:bg-zinc-950"
            >
              <div className="relative aspect-[16/10] bg-zinc-100 dark:bg-zinc-900">
                <Image src={c.imageSrc} alt="" fill className="object-cover" />
              </div>
              <div className="space-y-3 p-6">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {c.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {c.datetimeText}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {c.priceText}
                  </div>
                  <Link
                    href={`/${locale}/classes/cooking`}
                    className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
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
              className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-zinc-950"
            >
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {item.title}
              </div>
              <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Partners */}
      <Section title={content.partners.title}>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {content.partners.description}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {content.partners.items.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-6 text-center text-sm font-semibold text-zinc-700 shadow-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {p.logoText ?? p.name}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
