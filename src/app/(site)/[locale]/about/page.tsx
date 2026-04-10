import type { CSSProperties } from "react";
import Link from "next/link";

import ClassHeaderSlideshow from "@/components/site/ClassHeaderSlideshow";
import { getDefaultSitePageSettings, getSitePageByKey } from "@/lib/admin/sitePages";
import { findTrainers } from "@/lib/db/trainers";
import { isLocale, type Locale } from "@/lib/locale";
import { markdownToSafeHtml } from "@/lib/markdown";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

import styles from "./page.module.css";

function MediaSurface({
  src,
  fallbackLabel,
  className,
}: {
  src: string;
  fallbackLabel: string;
  className: string;
}) {
  if (src.trim()) {
    return (
      <div
        className={className}
        style={{
          backgroundImage: `url("${src}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center text-xs text-[color:var(--text-muted)]`}>
      {fallbackLabel}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <header>
      <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)] sm:text-3xl">{title}</h2>
    </header>
  );
}

function formatOfferCard(item: string, locale: Locale) {
  const normalized = item.trim();
  const punctuation = locale === "ar" ? ["،", ":", "-", "("] : [":", ",", "-", "("];

  for (const marker of punctuation) {
    const index = normalized.indexOf(marker);
    if (index > 0) {
      const title = normalized.slice(0, index).trim();
      const description = normalized
        .slice(index + 1)
        .replace(/^\)+/, "")
        .trim();

      if (title && description) {
        return { title, description };
      }
    }
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    const splitIndex = locale === "ar" ? 3 : 2;
    return {
      title: words.slice(0, splitIndex).join(" "),
      description: words.slice(splitIndex).join(" "),
    };
  }

  return {
    title: normalized,
    description: locale === "ar" ? "جزء من تجربة نون العملية والإبداعية." : "Part of the hands-on Noon experience.",
  };
}

function revealStyle(delay: number): CSSProperties {
  return { "--reveal-delay": `${delay}ms` } as CSSProperties;
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const resolvedSettings = await getPublicSitePageSettings("about");
  const fallbackPage = getSitePageByKey("about");
  const fallbackSettings = fallbackPage ? getDefaultSitePageSettings(fallbackPage) : null;
  const settings = resolvedSettings ?? fallbackSettings;
  const liveTrainers = await findTrainers({ activeOnly: true });

  if (!settings) return null;

  const pick = (en: string, ar: string) => (isArabic ? ar : en).trim();

  const heading = pick(settings.headingEn, settings.headingAr) || (isArabic ? "من نحن" : "About Us");
  const intro =
    pick(settings.subheadingEn, settings.subheadingAr) ||
    pick(settings.aboutPage.aboutBodyEn, settings.aboutPage.aboutBodyAr);

  const aboutTitle =
    pick(settings.aboutPage.aboutTitleEn, settings.aboutPage.aboutTitleAr) ||
    (isArabic ? "عن نون" : "About Noon");
  const aboutBodyHtml = markdownToSafeHtml(
    pick(settings.aboutPage.aboutBodyEn, settings.aboutPage.aboutBodyAr)
  );

  const founderTitle =
    pick(settings.aboutPage.founderTitleEn, settings.aboutPage.founderTitleAr) ||
    (isArabic ? "تعرف على المؤسسة" : "Meet the Founder");
  const founderBodyHtml = markdownToSafeHtml(
    pick(settings.aboutPage.founderBodyEn, settings.aboutPage.founderBodyAr)
  );
  const founderQuote = pick(settings.aboutPage.founderQuoteEn, settings.aboutPage.founderQuoteAr);

  const whatWeDoTitle =
    pick(settings.aboutPage.whatWeDoTitleEn, settings.aboutPage.whatWeDoTitleAr) ||
    (isArabic ? "ماذا نقدم" : "What We Offer");
  const whatWeDoItems = settings.aboutPage.whatWeDoItems
    .map((item) => pick(item.textEn, item.textAr))
    .filter(Boolean)
    .slice(0, 4);
  const whatWeDoBackgroundImage = settings.aboutPage.whatWeDoBackgroundImageSrc.trim();
  const whatWeDoTitleColor = settings.aboutPage.whatWeDoTitleColor;
  const whatWeDoCardTitleColor = settings.aboutPage.whatWeDoCardTitleColor;
  const whatWeDoCardTextColor = settings.aboutPage.whatWeDoCardTextColor;

  const trainersTitle =
    pick(settings.aboutPage.trainersTitleEn, settings.aboutPage.trainersTitleAr) ||
    (isArabic ? "مدربو نون" : "Noon Trainers");

  const familyTitle =
    pick(settings.aboutPage.familyTitleEn, settings.aboutPage.familyTitleAr) ||
    (isArabic ? "عائلة نون الكبيرة" : "The Bigger Noon Family");
  const familyBodyHtml = markdownToSafeHtml(
    pick(settings.aboutPage.familyBodyEn, settings.aboutPage.familyBodyAr)
  );
  const heroSlides = settings.aboutPage.heroSlideImages.filter((item) => item.trim().length > 0);
  const resolvedHeroSlides =
    heroSlides.length > 0
      ? heroSlides
      : settings.aboutPage.heroImageSrc.trim()
        ? [settings.aboutPage.heroImageSrc.trim()]
        : [];
  const aboutImageSrc =
    settings.aboutPage.aboutImageSrc.trim() || resolvedHeroSlides[0] || settings.aboutPage.heroImageSrc.trim();

  const ui = {
    trainersPlaceholder: isArabic
      ? "ستظهر ملفات المدربين هنا بمجرد إضافتهم وتفعيلهم."
      : "Trainer profiles will appear here as soon as they are added and activated.",
  };

  return (
    <div
      className={`${styles.aboutPage} relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:pt-12`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <section className={`${styles.heroShell} ${styles.reveal}`} style={revealStyle(50)}>
        <div className={styles.heroEditorialGrid}>
          <div className={styles.heroMediaColumn}>
            <ClassHeaderSlideshow
              key={`${locale}-${resolvedHeroSlides.join("|")}`}
              images={resolvedHeroSlides}
              alt={heading}
              intervalMs={settings.aboutPage.heroAutoplayMs}
              indicatorColor="#d65f4a"
              isRTL={isArabic}
              frameClassName={styles.heroSlideshowFrame}
            />
          </div>

          <article className={styles.heroCopyPanel}>
            <div className={styles.heroCopyInner}>
              <h1 className={styles.heroTitle}>{heading}</h1>
              {intro ? <p className={styles.heroIntro}>{intro}</p> : null}
            </div>
          </article>
        </div>
      </section>

      <section className={`${styles.splitSection} ${styles.reveal} mt-12`} style={revealStyle(120)}>
        <div className="grid gap-8 lg:grid-cols-[1fr_0.84fr] lg:items-center">
          <article className={styles.narrativePanel}>
            <SectionHeader title={aboutTitle} />
            <div className={`${styles.richText} mt-5`} dangerouslySetInnerHTML={{ __html: aboutBodyHtml }} />
          </article>

          <div className={styles.portraitFrame}>
            <MediaSurface
              src={aboutImageSrc}
              fallbackLabel={isArabic ? "صورة عن نون" : "About Noon image"}
              className="h-full w-full"
            />
          </div>
        </div>
      </section>

      <section className={`${styles.splitSection} ${styles.reveal} mt-12`} style={revealStyle(200)}>
        <div className="grid gap-8 lg:grid-cols-[0.84fr_1fr] lg:items-center">
          <div className={styles.portraitFrame}>
            <MediaSurface
              src={settings.aboutPage.founderImageSrc}
              fallbackLabel={isArabic ? "المؤسس" : "Founder"}
              className="h-full w-full"
            />
          </div>
          <article className={styles.narrativePanel}>
            <SectionHeader title={founderTitle} />
            <div className={`${styles.richText} mt-5`} dangerouslySetInnerHTML={{ __html: founderBodyHtml }} />
            {founderQuote ? <blockquote className={styles.inlineQuote}>“{founderQuote}”</blockquote> : null}
          </article>
        </div>
      </section>

      <section className={`${styles.offerSection} ${styles.reveal} mt-12`} style={revealStyle(280)}>
        {whatWeDoBackgroundImage ? (
          <div
            className={styles.offerBackground}
            style={{ backgroundImage: `url("${whatWeDoBackgroundImage}")` }}
            aria-hidden="true"
          />
        ) : null}
        <div className={styles.offerOverlay} aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:py-20 lg:px-8">
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2
                className="text-2xl font-semibold tracking-tight sm:text-3xl"
                style={{ color: whatWeDoTitleColor }}
              >
                {whatWeDoTitle}
              </h2>
            </div>
          </div>

          {whatWeDoItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {whatWeDoItems.map((item, index) => {
                const offer = formatOfferCard(item, locale);

                return (
                  <article key={`${item}-${index}`} className={styles.offerCard}>
                    <p className="text-lg font-semibold leading-tight" style={{ color: whatWeDoCardTitleColor }}>
                      {offer.title}
                    </p>
                    <p className="mt-3 text-sm leading-7" style={{ color: whatWeDoCardTextColor }}>
                      {offer.description}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section id="trainers" className={`${styles.reveal} mt-12`} style={revealStyle(360)}>
        <SectionHeader title={trainersTitle} />

        {liveTrainers.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {liveTrainers.map((trainer) => (
              <Link
                key={String(trainer.id)}
                href={`/${locale}/trainers/${trainer.id}`}
                className={styles.trainerProfileCard}
              >
                <div className={styles.trainerPortrait}>
                  <MediaSurface
                    src={typeof trainer.profileImage === "string" ? trainer.profileImage : ""}
                    fallbackLabel={isArabic ? "مدرب" : "Trainer"}
                    className="h-full w-full"
                  />
                </div>
                <p className="mt-4 text-lg font-semibold text-[color:var(--text)]">{trainer.fullName}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 border border-[color:var(--border)] p-6 text-sm text-[color:var(--text-muted)]">
            {ui.trainersPlaceholder}
          </div>
        )}
      </section>

      <section className={`${styles.splitSection} ${styles.reveal} mt-12`} style={revealStyle(440)}>
        <div className="grid gap-8 lg:grid-cols-[1fr_0.84fr] lg:items-center">
          <article className={styles.narrativePanel}>
            <SectionHeader title={familyTitle} />
            <div className={`${styles.richText} mt-5`} dangerouslySetInnerHTML={{ __html: familyBodyHtml }} />
          </article>

          <div className={styles.portraitFrame}>
            <MediaSurface
              src={settings.aboutPage.familyImageSrc}
              fallbackLabel={isArabic ? "عائلة نون" : "Noon family"}
              className="h-full w-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
