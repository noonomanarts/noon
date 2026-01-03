import { isLocale, type Locale } from "@/lib/locale";

export default async function PrivateClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="noon-text text-3xl font-semibold tracking-tight">
        {locale === "ar" ? "دروس خاصة" : "Private classes"}
      </h1>
      <p className="noon-text-muted mt-4 max-w-3xl text-sm leading-6">
        {locale === "ar"
          ? "هنا سنضيف تدفق الحجز الخاص خطوة بخطوة."
          : "This will host the step-by-step private class booking flow."}
      </p>
    </div>
  );
}
