import type { CSSProperties } from "react";
import Link from "next/link";

import { getDefaultSitePageSettings, getSitePageByKey } from "@/lib/admin/sitePages";
import { getReadableTextColor, resolveHeaderColor } from "@/lib/headerBranding";
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

function SectionHeader({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="space-y-2">
      <p className={styles.sectionLabel}>{label}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)] sm:text-3xl">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">{subtitle}</p> : null}
    </header>
  );
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

  if (!settings) return null;

  const headerColor = await resolveHeaderColor();
  const headerButtonTextColor = getReadableTextColor(headerColor);

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
    (isArabic ? "ماذا نقدم" : "What We Do");
  const whatWeDoItems = settings.aboutPage.whatWeDoItems
    .map((item) => pick(item.textEn, item.textAr))
    .filter(Boolean);

  const teamTitle =
    pick(settings.aboutPage.teamTitleEn, settings.aboutPage.teamTitleAr) ||
    (isArabic ? "فريق نون" : "The Noon Team");
  const teamMembers = settings.aboutPage.teamMembers
    .map((item) => ({
      name: pick(item.nameEn, item.nameAr),
      role: pick(item.roleEn, item.roleAr),
      imageSrc: item.imageSrc,
    }))
    .filter((item) => item.name || item.role || item.imageSrc);

  const trainersTitle =
    pick(settings.aboutPage.trainersTitleEn, settings.aboutPage.trainersTitleAr) ||
    (isArabic ? "مدربو نون" : "Noon Trainers");
  const trainersCta =
    pick(settings.aboutPage.trainersCtaEn, settings.aboutPage.trainersCtaAr) ||
    (isArabic ? "عرض جميع المدربين" : "View all trainers");
  const trainerHighlights = settings.aboutPage.trainerHighlights
    .map((item) => ({
      name: pick(item.nameEn, item.nameAr),
      imageSrc: item.imageSrc,
    }))
    .filter((item) => item.name || item.imageSrc);

  const familyTitle =
    pick(settings.aboutPage.familyTitleEn, settings.aboutPage.familyTitleAr) ||
    (isArabic ? "عائلة نون الكبيرة" : "The Bigger Noon Family");
  const familyBodyHtml = markdownToSafeHtml(
    pick(settings.aboutPage.familyBodyEn, settings.aboutPage.familyBodyAr)
  );

  const stats = [
    {
      value: String(Math.max(whatWeDoItems.length, 1)).padStart(2, "0"),
      label: isArabic ? "مجالات الخبرة" : "Experience Areas",
    },
    {
      value: String(Math.max(teamMembers.length, 1)).padStart(2, "0"),
      label: isArabic ? "أعضاء الفريق" : "Core Team",
    },
    {
      value: String(Math.max(trainerHighlights.length, 1)).padStart(2, "0"),
      label: isArabic ? "مدربون مميزون" : "Featured Trainers",
    },
  ];

  const ui = {
    ourStory: isArabic ? "قصتنا" : "Our Story",
    discoverTeam: isArabic ? "اكتشف الفريق" : "Discover the Team",
    signaturePrograms: isArabic ? "برامجنا" : "Signature Programs",
    studioPeople: isArabic ? "أشخاص الاستوديو" : "Studio People",
    trainersLabel: isArabic ? "مدربونا" : "Our Trainers",
    familyLabel: isArabic ? "مجتمع نون" : "Noon Community",
    viewClasses: isArabic ? "استعرض الدورات" : "Explore Classes",
    teamPlaceholder: isArabic ? "يتم تحديث أعضاء الفريق قريباً." : "Team profiles are being updated.",
    trainersPlaceholder: isArabic
      ? "سيتم عرض بطاقات المدربين المميزين هنا قريباً."
      : "Featured trainer cards will appear here soon.",
  };

  return (
    <div className={`${styles.aboutPage} relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:pt-12`} dir={isArabic ? "rtl" : "ltr"}>
      <section className={`${styles.heroShell} ${styles.reveal}`} style={revealStyle(50)}>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className={styles.kicker}>{ui.ourStory}</p>
            <h1 className={styles.heroTitle}>{heading}</h1>
            {intro ? <p className={styles.heroIntro}>{intro}</p> : null}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/classes`}
                className="inline-flex items-center border border-black/15 px-4 py-2 text-sm font-semibold transition hover:brightness-95"
                style={{ backgroundColor: headerColor, color: headerButtonTextColor }}
              >
                {ui.viewClasses}
              </Link>
              <Link
                href={`/${locale}/about#team`}
                className="inline-flex items-center border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:border-[color:var(--text-subtle)]"
              >
                {ui.discoverTeam}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <article key={item.label} className={styles.metricTile}>
                  <p className="text-2xl font-semibold leading-none text-[color:var(--text)]">{item.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">{item.label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className={styles.heroImageFrame}>
              <MediaSurface
                src={settings.aboutPage.heroImageSrc}
                fallbackLabel={isArabic ? "صورة الغلاف" : "Hero image"}
                className="h-full w-full"
              />
            </div>
            {founderQuote ? (
              <blockquote className={styles.quoteStrip}>
                <span className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                  {isArabic ? "رؤية المؤسس" : "Founder Vision"}
                </span>
                <p className="mt-2 text-sm leading-7 text-[color:var(--text)]">“{founderQuote}”</p>
              </blockquote>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <article className={`${styles.panel} ${styles.reveal}`} style={revealStyle(120)}>
          <SectionHeader label={ui.ourStory} title={aboutTitle} />
          <div className={`${styles.richText} mt-4`} dangerouslySetInnerHTML={{ __html: aboutBodyHtml }} />
        </article>

        <article className={`${styles.panel} ${styles.highlightPanel} ${styles.reveal}`} style={revealStyle(200)}>
          <SectionHeader label={isArabic ? "المؤسس" : "Founder"} title={founderTitle} />
          <div className="mt-4 grid gap-5 sm:grid-cols-[112px_1fr] sm:items-start">
            <div className={styles.founderImage}>
              <MediaSurface
                src={settings.aboutPage.founderImageSrc}
                fallbackLabel={isArabic ? "المؤسس" : "Founder"}
                className="h-full w-full"
              />
            </div>
            <div className={styles.richText} dangerouslySetInnerHTML={{ __html: founderBodyHtml }} />
          </div>
        </article>
      </section>

      <section className={`${styles.reveal} mt-12`} style={revealStyle(280)}>
        <SectionHeader
          label={ui.signaturePrograms}
          title={whatWeDoTitle}
          subtitle={
            isArabic
              ? "المحاور الأساسية التي تشكل تجربة نون التعليمية والإبداعية."
              : "The core pillars shaping Noon learning and creative experiences."
          }
        />

        {whatWeDoItems.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whatWeDoItems.map((item, index) => (
              <article key={`${item}-${index}`} className={styles.programCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                  {(index + 1).toString().padStart(2, "0")}
                </p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--text)]">{item}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section id="team" className={`${styles.reveal} mt-12`} style={revealStyle(360)}>
        <SectionHeader label={ui.studioPeople} title={teamTitle} />

        {teamMembers.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {teamMembers.map((member, index) => (
              <article key={`${member.name}-${index}`} className={styles.teamCard}>
                <div className={styles.teamImageWrap}>
                  <MediaSurface
                    src={member.imageSrc}
                    fallbackLabel={isArabic ? "فريق" : "Team"}
                    className="h-full w-full"
                  />
                </div>
                <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                  <p className="text-sm font-semibold text-[color:var(--text)]">{member.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[color:var(--text-muted)]">{member.role}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 border border-[color:var(--border)] p-6 text-sm text-[color:var(--text-muted)]">
            {ui.teamPlaceholder}
          </div>
        )}
      </section>

      <section className={`${styles.reveal} mt-12`} style={revealStyle(440)}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader label={ui.trainersLabel} title={trainersTitle} />
          <Link
            href={`/${locale}/trainers`}
            className="inline-flex items-center border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:border-[color:var(--text-subtle)]"
          >
            {trainersCta}
          </Link>
        </div>

        {trainerHighlights.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trainerHighlights.map((trainer, index) => (
              <article key={`${trainer.name}-${index}`} className={styles.trainerCard}>
                <div className="h-16 w-16 shrink-0 border border-[color:var(--border)] bg-[color:var(--muted)]">
                  <MediaSurface
                    src={trainer.imageSrc}
                    fallbackLabel={isArabic ? "مدرب" : "Trainer"}
                    className="h-full w-full"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                    {isArabic ? "مدرب" : "Trainer"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{trainer.name}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-[color:var(--border)] p-6 text-sm text-[color:var(--text-muted)]">
            {ui.trainersPlaceholder}
          </div>
        )}
      </section>

      <section className={`${styles.familyShell} ${styles.reveal} mt-12`} style={revealStyle(520)}>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className={styles.familyImage}>
            <MediaSurface
              src={settings.aboutPage.familyImageSrc}
              fallbackLabel={isArabic ? "عائلة نون" : "Noon family"}
              className="aspect-[4/3] w-full"
            />
          </div>
          <div>
            <SectionHeader label={ui.familyLabel} title={familyTitle} />
            <div className={`${styles.richText} mt-4`} dangerouslySetInnerHTML={{ __html: familyBodyHtml }} />
          </div>
        </div>
      </section>
    </div>
  );
}
