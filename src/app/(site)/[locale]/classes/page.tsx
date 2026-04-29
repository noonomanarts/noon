import Link from "next/link";
import { GiCookingPot } from "react-icons/gi";
import { GiPalette } from "react-icons/gi";
import { isLocale, type Locale } from "@/lib/locale";
import { getReadableTextColor, resolveHeaderColor } from "@/lib/headerBranding";

export default async function ClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isRTL = locale === "ar";
  const headerColor = await resolveHeaderColor();
  const headerButtonTextColor = getReadableTextColor(headerColor);

  const t = {
    title: isRTL ? "الورش" : "Classes",
    subtitle: isRTL
      ? "اختر الفئة التي تهمك"
      : "Choose the category that fits you",
    cooking: isRTL ? "ورش الطبخ" : "Cooking Classes",
    artsCrafts: isRTL ? "فنون وحرف" : "Arts & Crafts",
    cookingDesc: isRTL
      ? "تعلم مهارات الطهي مع مدربين محترفين"
      : "Learn culinary skills with expert trainers",
    artsDesc: isRTL
      ? "استكشف الإبداع في الفن والحِرف"
      : "Explore creativity in arts and crafts",
    explore: isRTL ? "استكشف" : "Explore",
    tracks: isRTL ? "المسارات" : "Tracks",
    activeCategories: isRTL ? "فئات نشطة" : "Active categories",
  };

  return (
    <div className="route-sharp bg-[color:var(--muted)] dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-10">
        <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
          <h1 className="text-3xl font-bold text-[color:var(--text)] dark:text-white sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
            {t.subtitle}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="border border-[color:var(--border)] bg-[color:var(--muted)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.tracks}</p>
              <p className="mt-1 text-2xl font-extrabold text-[color:var(--text)]">2</p>
            </div>
            <div className="border border-[color:var(--border)] bg-[color:var(--muted)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">{t.activeCategories}</p>
              <p className="mt-1 text-2xl font-extrabold text-[color:var(--text)]">2</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Link
            href={`/${locale}/classes/cooking`}
            className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative flex h-60 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-100 dark:from-teal-900/30 dark:via-cyan-900/20 dark:to-teal-800/30">
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-teal-300/20 blur-2xl dark:bg-teal-300/10" />
              <div className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl dark:bg-cyan-300/10" />
              <GiCookingPot className="relative h-28 w-28 text-teal-600 transition duration-300 group-hover:scale-110 group-hover:text-teal-500 dark:text-teal-300 dark:group-hover:text-teal-200" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-[color:var(--text)] dark:text-white">
                {t.cooking}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
                {t.cookingDesc}
              </p>
              <div
                className="mt-5 inline-flex w-full items-center justify-center border border-black/20 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition hover:brightness-95"
                style={{ backgroundColor: headerColor, color: headerButtonTextColor }}
              >
                {t.explore}
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/classes/arts-crafts`}
            className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative flex h-60 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-purple-50 via-fuchsia-50 to-purple-100 dark:from-purple-900/30 dark:via-fuchsia-900/20 dark:to-purple-800/30">
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/20 blur-2xl dark:bg-purple-300/10" />
              <div className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-fuchsia-300/20 blur-2xl dark:bg-fuchsia-300/10" />
              <GiPalette className="relative h-28 w-28 text-purple-600 transition duration-300 group-hover:scale-110 group-hover:text-purple-500 dark:text-purple-300 dark:group-hover:text-purple-200" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-[color:var(--text)] dark:text-white">
                {t.artsCrafts}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
                {t.artsDesc}
              </p>
              <div
                className="mt-5 inline-flex w-full items-center justify-center border border-black/20 px-4 py-3 text-sm font-extrabold uppercase tracking-wide transition hover:brightness-95"
                style={{ backgroundColor: headerColor, color: headerButtonTextColor }}
              >
                {t.explore}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
