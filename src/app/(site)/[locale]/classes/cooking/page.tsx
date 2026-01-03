import { isLocale, type Locale } from "@/lib/locale";

export default async function CookingClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {locale === "ar" ? "دورات الطبخ" : "Cooking classes"}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {locale === "ar"
          ? "هنا سنعرض الأقسام والدورات القادمة (سيتم ربطها لاحقاً بقاعدة البيانات)."
          : "This will list sub-sections and upcoming sessions (to be wired to DB later)."}
      </p>
    </div>
  );
}
