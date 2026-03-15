import { isLocale, type Locale } from "@/lib/locale";
import { markdownToSafeHtml } from "@/lib/markdown";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const settings = await getPublicSitePageSettings("terms");
  const heading =
    (isArabic ? settings?.headingAr : settings?.headingEn)?.trim() ||
    (isArabic ? "الشروط والأحكام" : "Terms & Conditions");
  const subheading = (isArabic ? settings?.subheadingAr : settings?.subheadingEn)?.trim() || "";
  const sections = (settings?.termsSections ?? []).map((section) => ({
    title: (isArabic ? section.titleAr : section.titleEn).trim(),
    bodyHtml: markdownToSafeHtml((isArabic ? section.bodyAr : section.bodyEn).trim()),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12" dir={isArabic ? "rtl" : "ltr"}>
      <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">{heading}</h1>
        {subheading ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">{subheading}</p> : null}
      </section>

      <section className="mt-8 space-y-5">
        {sections.map((section, index) => (
          <article key={`${section.title}-${index}`} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">{section.title}</h2>
            <div
              className="prose prose-sm mt-4 max-w-none text-[color:var(--text-muted)] dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: section.bodyHtml }}
            />
          </article>
        ))}

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-sm text-[color:var(--text-muted)]">
            {isArabic ? "لا توجد بنود متاحة حالياً." : "No terms sections are available yet."}
          </div>
        ) : null}
      </section>
    </div>
  );
}
