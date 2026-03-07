import Link from "next/link";
import { GiCookingPot } from "react-icons/gi";
import { GiPalette } from "react-icons/gi";
import { isLocale, type Locale } from "@/lib/locale";

export default async function ClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isRTL = locale === "ar";

  const t = {
    title: isRTL ? "الدورات" : "Classes",
    subtitle: isRTL
      ? "اختر الفئة التي تهمك"
      : "Choose the category that fits you",
    cooking: isRTL ? "دورات الطبخ" : "Cooking Classes",
    artsCrafts: isRTL ? "فنون وحرف" : "Arts & Crafts",
    cookingDesc: isRTL
      ? "تعلم مهارات الطهي مع مدربين محترفين"
      : "Learn culinary skills with expert trainers",
    artsDesc: isRTL
      ? "استكشف الإبداع في الفن والحِرف"
      : "Explore creativity in arts and crafts",
    explore: isRTL ? "استكشف" : "Explore",
  };

  return (
    <div className="min-h-screen bg-[color:var(--muted)] dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[color:var(--text)] dark:text-white">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
            {t.subtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href={`/${locale}/classes/cooking`}
            className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30">
              <GiCookingPot className="h-20 w-20 text-teal-600 dark:text-teal-300" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-[color:var(--text)] dark:text-white">
                {t.cooking}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
                {t.cookingDesc}
              </p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-teal-700 dark:text-teal-300">
                {t.explore}
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/classes/arts-crafts`}
            className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30">
              <GiPalette className="h-20 w-20 text-purple-600 dark:text-purple-300" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-[color:var(--text)] dark:text-white">
                {t.artsCrafts}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
                {t.artsDesc}
              </p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-purple-700 dark:text-purple-300">
                {t.explore}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
