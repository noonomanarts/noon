import Link from "next/link";

import { getDefaultSitePageSettings, getSitePageByKey } from "@/lib/admin/sitePages";
import { isLocale, type Locale } from "@/lib/locale";
import { markdownToSafeHtml } from "@/lib/markdown";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

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

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 space-y-2">
      <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)] sm:text-3xl">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm leading-7 text-[color:var(--text-muted)]">{subtitle}</p> : null}
    </div>
  );
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
      label: isArabic ? "مجالات الخبرة" : "Experience Areas",
      value: String(Math.max(whatWeDoItems.length, 1)),
    },
    {
      label: isArabic ? "أعضاء الفريق" : "Core Team",
      value: String(Math.max(teamMembers.length, 1)),
    },
    {
      label: isArabic ? "مدربون مميزون" : "Featured Trainers",
      value: String(Math.max(trainerHighlights.length, 1)),
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-12" dir={isArabic ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-teal/15 blur-3xl" />
        <div className="absolute right-0 top-16 h-96 w-96 rounded-full bg-coral/12 blur-3xl" />
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_80px_-45px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-coral/35 bg-coral/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-coral">
              {isArabic ? "قصتنا" : "Our Story"}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-[color:var(--text)] sm:text-5xl">
              {heading}
            </h1>
            {intro ? (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
                {intro}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2"
                >
                  <p className="text-xs font-semibold text-[color:var(--text)]">{item.value}</p>
                  <p className="text-[11px] text-[color:var(--text-muted)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--noon-teal)_26%,transparent),color-mix(in_oklab,var(--noon-coral)_24%,transparent))] blur-2xl" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--muted)]">
              <MediaSurface
                src={settings.aboutPage.heroImageSrc}
                fallbackLabel={isArabic ? "صورة الغلاف" : "Hero image"}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
          <SectionTitle title={aboutTitle} />
          <div
            className="prose prose-sm max-w-none text-[color:var(--text-muted)] dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: aboutBodyHtml }}
          />
        </article>

        <article className="rounded-3xl border border-[color:var(--border)] bg-[linear-gradient(165deg,color-mix(in_oklab,var(--noon-teal)_10%,transparent),transparent_42%)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]">
              <MediaSurface
                src={settings.aboutPage.founderImageSrc}
                fallbackLabel={isArabic ? "المؤسس" : "Founder"}
                className="h-full w-full"
              />
            </div>
            <h3 className="text-xl font-semibold text-[color:var(--text)]">{founderTitle}</h3>
          </div>
          <div
            className="prose prose-sm max-w-none text-[color:var(--text-muted)] dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: founderBodyHtml }}
          />
          {founderQuote ? (
            <blockquote className="mt-4 rounded-2xl border border-coral/25 bg-coral/8 px-4 py-3 text-sm italic text-[color:var(--text)]">
              “{founderQuote}”
            </blockquote>
          ) : null}
        </article>
      </section>

      <section className="mt-12">
        <SectionTitle
          title={whatWeDoTitle}
          subtitle={isArabic ? "محاور التجربة التي تقدمها نون" : "The core experience pillars at Noon."}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {whatWeDoItems.map((item, index) => (
            <article
              key={`${item}-${index}`}
              className="group rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">
                {(index + 1).toString().padStart(2, "0")}
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text)]">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle title={teamTitle} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {teamMembers.map((member, index) => (
            <article
              key={`${member.name}-${index}`}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm"
            >
              <div className="mb-3 aspect-square w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]">
                <MediaSurface
                  src={member.imageSrc}
                  fallbackLabel={isArabic ? "فريق" : "Team"}
                  className="h-full w-full"
                />
              </div>
              <p className="text-sm font-semibold text-[color:var(--text)]">{member.name}</p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{member.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)] sm:text-3xl">{trainersTitle}</h2>
          <Link
            href={`/${locale}/trainers`}
            className="inline-flex items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--muted)]"
          >
            {trainersCta}
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trainerHighlights.map((trainer, index) => (
            <article
              key={`${trainer.name}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-sm"
            >
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]">
                <MediaSurface
                  src={trainer.imageSrc}
                  fallbackLabel={isArabic ? "مدرب" : "Trainer"}
                  className="h-full w-full"
                />
              </div>
              <p className="text-sm font-semibold text-[color:var(--text)]">{trainer.name}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[linear-gradient(130deg,color-mix(in_oklab,var(--noon-coral)_14%,transparent),transparent_55%)] p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]">
            <MediaSurface
              src={settings.aboutPage.familyImageSrc}
              fallbackLabel={isArabic ? "عائلة نون" : "Noon family"}
              className="aspect-[4/3] w-full"
            />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)] sm:text-3xl">{familyTitle}</h2>
            <div
              className="prose prose-sm mt-3 max-w-none text-[color:var(--text-muted)] dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: familyBodyHtml }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
