import { isLocale, type Locale } from "@/lib/locale";

export default async function ArtsCraftsClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {locale === "ar" ? "الفنون والأشغال" : "Arts & crafts classes"}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {locale === "ar"
          ? "هنا سنعرض الدورات والجلسات (قريباً)."
          : "This will list classes and sessions (coming soon)."}
      </p>
    </div>
  );
}
