import Link from "next/link";

import { getDefaultSitePageSettings, getSitePageByKey } from "@/lib/admin/sitePages";
import { isLocale, type Locale } from "@/lib/locale";
import { markdownToSafeHtml } from "@/lib/markdown";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

function MediaBlock({ src, fallbackLabel, className }: { src: string; fallbackLabel: string; className: string }) {
  if (src.trim()) {
    return <div className={className} style={{ backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center" }} aria-hidden="true" />;
  }
  return <div className={`${className} flex items-center justify-center text-xs text-[color:var(--text-muted)]`}>{fallbackLabel}</div>;
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

  if (!settings) {
    return null;
  }

  const pick = (en: string, ar: string) => (isArabic ? ar : en).trim();

  const heading = pick(settings.headingEn, settings.headingAr) || (isArabic ? "من نحن" : "About Us");
  const intro = pick(settings.subheadingEn, settings.subheadingAr) || pick(settings.aboutPage.aboutBodyEn, settings.aboutPage.aboutBodyAr);

  const aboutTitle = pick(settings.aboutPage.aboutTitleEn, settings.aboutPage.aboutTitleAr) || (isArabic ? "عن نون" : "About Noon");
  const aboutBodyHtml = markdownToSafeHtml(pick(settings.aboutPage.aboutBodyEn, settings.aboutPage.aboutBodyAr));

  const founderTitle = pick(settings.aboutPage.founderTitleEn, settings.aboutPage.founderTitleAr) || (isArabic ? "تعرف على المؤسسة" : "Meet the Founder");
  const founderBodyHtml = markdownToSafeHtml(pick(settings.aboutPage.founderBodyEn, settings.aboutPage.founderBodyAr));
  const founderQuote = pick(settings.aboutPage.founderQuoteEn, settings.aboutPage.founderQuoteAr);

  const whatWeDoTitle = pick(settings.aboutPage.whatWeDoTitleEn, settings.aboutPage.whatWeDoTitleAr) || (isArabic ? "ماذا نقدم" : "What We Do");
  const whatWeDoItems = settings.aboutPage.whatWeDoItems
    .map((item) => pick(item.textEn, item.textAr))
    .filter(Boolean);

  const teamTitle = pick(settings.aboutPage.teamTitleEn, settings.aboutPage.teamTitleAr) || (isArabic ? "فريق نون" : "The Noon Team");
  const teamMembers = settings.aboutPage.teamMembers
    .map((item) => ({
      name: pick(item.nameEn, item.nameAr),
      role: pick(item.roleEn, item.roleAr),
      imageSrc: item.imageSrc,
    }))
    .filter((item) => item.name || item.role || item.imageSrc);

  const trainersTitle = pick(settings.aboutPage.trainersTitleEn, settings.aboutPage.trainersTitleAr) || (isArabic ? "مدربو نون" : "Noon Trainers");
  const trainersCta = pick(settings.aboutPage.trainersCtaEn, settings.aboutPage.trainersCtaAr) || (isArabic ? "عرض جميع المدربين" : "View all trainers");
  const trainerHighlights = settings.aboutPage.trainerHighlights
    .map((item) => ({
      name: pick(item.nameEn, item.nameAr),
      imageSrc: item.imageSrc,
    }))
    .filter((item) => item.name || item.imageSrc);

  const familyTitle = pick(settings.aboutPage.familyTitleEn, settings.aboutPage.familyTitleAr) || (isArabic ? "عائلة نون الكبيرة" : "The Bigger Noon Family");
  const familyBodyHtml = markdownToSafeHtml(pick(settings.aboutPage.familyBodyEn, settings.aboutPage.familyBodyAr));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12" dir={isArabic ? "rtl" : "ltr"}>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <h1 className="noon-text text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>
          {intro ? <p className="noon-text-muted mt-4 max-w-3xl text-sm leading-7">{intro}</p> : null}
        </div>
        <div className="relative aspect-square w-full max-w-sm justify-self-center overflow-hidden rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] shadow-sm dark:border-zinc-800/60 dark:bg-zinc-900">
          <MediaBlock src={settings.aboutPage.heroImageSrc} fallbackLabel={isArabic ? "صورة الغلاف" : "Hero image"} className="h-full w-full" />
        </div>
      </div>

      <section className="mt-14 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="noon-text text-2xl font-semibold tracking-tight">{aboutTitle}</h2>
          <div className="prose prose-sm noon-text-muted mt-3 max-w-none leading-7 dark:prose-invert" dangerouslySetInnerHTML={{ __html: aboutBodyHtml }} />
        </div>
        <div className="rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] dark:border-zinc-800/60 dark:bg-zinc-900">
              <MediaBlock src={settings.aboutPage.founderImageSrc} fallbackLabel={isArabic ? "المؤسس" : "Founder"} className="h-full w-full" />
            </div>
            <div>
              <p className="noon-text text-base font-semibold">{founderTitle}</p>
              <div className="prose prose-sm noon-text-muted mt-1 max-w-none leading-6 dark:prose-invert" dangerouslySetInnerHTML={{ __html: founderBodyHtml }} />
            </div>
          </div>
          {founderQuote ? <blockquote className="noon-text mt-5 text-sm italic leading-7">“{founderQuote}”</blockquote> : null}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="noon-text text-2xl font-semibold tracking-tight">{whatWeDoTitle}</h2>
        <ul className="mt-4 grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
          {whatWeDoItems.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-4 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950"
            >
              <span className="mt-1 size-2 rounded-full bg-zinc-900 dark:bg-[color:var(--surface)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="noon-text text-2xl font-semibold tracking-tight">{teamTitle}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {teamMembers.map((member, index) => (
            <div
              key={`${member.name}-${index}`}
              className="rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-4 text-sm shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950"
            >
              <div className="relative mb-3 aspect-square w-20 overflow-hidden rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] dark:border-zinc-800/60 dark:bg-zinc-900">
                <MediaBlock src={member.imageSrc} fallbackLabel={isArabic ? "فريق" : "Team"} className="h-full w-full" />
              </div>
              <p className="noon-text font-semibold">{member.name}</p>
              <p className="noon-text-muted mt-1 text-xs">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-center justify-between gap-3">
          <h2 className="noon-text text-2xl font-semibold tracking-tight">{trainersTitle}</h2>
          <Link
            href={`/${locale}/trainers`}
            className="text-sm font-medium text-[color:var(--text)] underline-offset-4 transition hover:underline dark:text-zinc-100"
          >
            {trainersCta}
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trainerHighlights.map((trainer, index) => (
            <div
              key={`${trainer.name}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-4 text-sm shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950"
            >
              <div className="relative aspect-square w-12 overflow-hidden rounded-xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] dark:border-zinc-800/60 dark:bg-zinc-900">
                <MediaBlock src={trainer.imageSrc} fallbackLabel={isArabic ? "مدرب" : "Trainer"} className="h-full w-full" />
              </div>
              <span className="noon-text font-medium">{trainer.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="grid gap-6 rounded-3xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] p-6 shadow-sm dark:border-zinc-800/60 dark:bg-zinc-950 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--border)]/70 bg-[color:var(--muted)] dark:border-zinc-800/60 dark:bg-zinc-900">
            <MediaBlock src={settings.aboutPage.familyImageSrc} fallbackLabel={isArabic ? "عائلة نون" : "Noon family"} className="h-full w-full" />
          </div>
          <div>
            <h2 className="noon-text text-2xl font-semibold tracking-tight">{familyTitle}</h2>
            <div className="prose prose-sm noon-text-muted mt-3 max-w-none leading-7 dark:prose-invert" dangerouslySetInnerHTML={{ __html: familyBodyHtml }} />
          </div>
        </div>
      </section>
    </div>
  );
}
