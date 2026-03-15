import { isLocale, type Locale } from "@/lib/locale";
import { markdownToSafeHtml } from "@/lib/markdown";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

export default async function FaqsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const settings = await getPublicSitePageSettings("faqs");

  const heading = (isArabic ? settings?.headingAr : settings?.headingEn)?.trim() || (isArabic ? "الأسئلة الشائعة" : "FAQs");
  const subheading = (isArabic ? settings?.subheadingAr : settings?.subheadingEn)?.trim() || "";

  const faqItems = (settings?.faqItems ?? [])
    .map((item) => ({
      category: (isArabic ? item.categoryAr : item.categoryEn).trim(),
      question: (isArabic ? item.questionAr : item.questionEn).trim(),
      answerHtml: markdownToSafeHtml((isArabic ? item.answerAr : item.answerEn).trim()),
    }))
    .filter((item) => item.question || item.answerHtml);

  const grouped = faqItems.reduce<Record<string, typeof faqItems>>((acc, item) => {
    const key = item.category || (isArabic ? "عام" : "General");
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12" dir={isArabic ? "rtl" : "ltr"}>
      <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">{heading}</h1>
        {subheading ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">{subheading}</p> : null}
      </section>

      <section className="mt-8 space-y-5">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[color:var(--text)]">{category}</h2>
            <div className="space-y-3">
              {items.map((item, index) => (
                <details key={`${category}-${index}`} className="group rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[color:var(--text)]">
                    <span>{item.question}</span>
                  </summary>
                  <div
                    className="prose prose-sm mt-3 max-w-none text-[color:var(--text-muted)] dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                  />
                </details>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-sm text-[color:var(--text-muted)]">
            {isArabic ? "لا توجد أسئلة متاحة حالياً." : "No FAQs are available yet."}
          </div>
        ) : null}
      </section>
    </div>
  );
}
