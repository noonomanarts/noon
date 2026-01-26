import { isLocale, type Locale } from "@/lib/locale";
import Link from "next/link";

export default async function PrivateClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
            {locale === "ar" ? "فعاليات المجموعات" : "Group Events"}
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {locale === "ar" ? "دروس خاصة" : "Private Classes"}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            {locale === "ar"
              ? "تجربة تعليمية مخصصة لمجموعتك. اختر موضوعك واستمتع بدرس خاص."
              : "A personalized learning experience for your group. Choose your topic and enjoy a private class."}
          </p>
        </div>

        {/* Types */}
        <div className="mb-16 grid gap-8 lg:grid-cols-2">
          {/* Private Cooking */}
          <div className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-orange-100 to-red-100 p-8 dark:from-orange-950/30 dark:to-red-950/30">
              <div className="mb-4 text-6xl">👨‍🍳</div>
              <h3 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
                {locale === "ar" ? "درس طبخ خاص" : "Private Cooking Class"}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {locale === "ar" ? "تجربة طهي مخصصة" : "Personalized cooking experience"}
              </p>
            </div>
            <div className="p-8">
              <div className="mb-6 space-y-3">
                {[
                  { icon: "👥", text: locale === "ar" ? "8-32 مشارك" : "8-32 participants" },
                  { icon: "⏱️", text: locale === "ar" ? "2-3 ساعات" : "2-3 hours" },
                  { icon: "🍽️", text: locale === "ar" ? "اختر طبقك المفضل" : "Choose your dish" },
                  { icon: "👨‍🍳", text: locale === "ar" ? "إشراف فريق نون" : "Guided by Noon team" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.text}</span>
                  </div>
                ))}
              </div>
              <Link
                href={`/${locale}/group-booking-events/private-classes/book?type=cooking`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {locale === "ar" ? "احجز درس طبخ" : "Book Cooking Class"}
              </Link>
            </div>
          </div>

          {/* Private Arts & Crafts */}
          <div className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-8 dark:from-purple-950/30 dark:to-pink-950/30">
              <div className="mb-4 text-6xl">🎨</div>
              <h3 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
                {locale === "ar" ? "درس فنون وأشغال خاص" : "Private Arts & Crafts Class"}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {locale === "ar" ? "تجربة فنية إبداعية" : "Creative artistic experience"}
              </p>
            </div>
            <div className="p-8">
              <div className="mb-6 space-y-3">
                {[
                  { icon: "👥", text: locale === "ar" ? "8-32 مشارك" : "8-32 participants" },
                  { icon: "⏱️", text: locale === "ar" ? "2-3 ساعات" : "2-3 hours" },
                  { icon: "🎨", text: locale === "ar" ? "اختر مشروعك الفني" : "Choose your project" },
                  { icon: "✨", text: locale === "ar" ? "إشراف فريق نون" : "Guided by Noon team" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.text}</span>
                  </div>
                ))}
              </div>
              <Link
                href={`/${locale}/group-booking-events/private-classes/book?type=arts-crafts`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {locale === "ar" ? "احجز درس فنون" : "Book Arts Class"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
