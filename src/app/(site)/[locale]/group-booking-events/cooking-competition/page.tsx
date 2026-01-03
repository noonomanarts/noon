import { isLocale, type Locale } from "@/lib/locale";

export default async function CookingCompetitionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="noon-text text-3xl font-semibold tracking-tight">
        {locale === "ar" ? "مسابقة الطبخ" : "Cooking competition"}
      </h1>
      <p className="noon-text-muted mt-4 max-w-3xl text-sm leading-6">
        {locale === "ar"
          ? "هذا التدفق سيكون خطوة بخطوة حسب A.md (سيتم بناؤه لاحقاً)."
          : "This will become a step-by-step flow per A.md (to be built next)."}
      </p>
    </div>
  );
}
