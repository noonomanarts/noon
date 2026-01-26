import { isLocale, type Locale } from "@/lib/locale";
import Link from "next/link";
import { MdGroup, MdSchedule, MdRestaurant } from "react-icons/md";
import { GiCookingPot, GiChefToque, GiPalette } from "react-icons/gi";
import { IoColorPalette, IoCalendar } from "react-icons/io5";
import { HiSparkles } from "react-icons/hi2";

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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: '#17A2B820', color: '#17A2B8' }}>
            <MdGroup className="h-5 w-5" />
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
            <div className="p-8" style={{ background: 'linear-gradient(135deg, #FF6B6B20 0%, #FF999920 100%)' }}>
              <GiChefToque className="mb-4 h-16 w-16" style={{ color: '#FF6B6B' }} />
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
                  { Icon: MdGroup, color: "#17A2B8", text: locale === "ar" ? "8-32 مشارك" : "8-32 participants" },
                  { Icon: MdSchedule, color: "#FFD93D", text: locale === "ar" ? "2-3 ساعات" : "2-3 hours" },
                  { Icon: MdRestaurant, color: "#8E44AD", text: locale === "ar" ? "اختر طبقك المفضل" : "Choose your dish" },
                  { Icon: GiChefToque, color: "#FF6B6B", text: locale === "ar" ? "إشراف فريق نون" : "Guided by Noon team" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.Icon className="h-8 w-8" style={{ color: item.color }} />
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.text}</span>
                  </div>
                ))}
              </div>
              <Link
                href={`/${locale}/group-booking-events/private-classes/book?type=cooking`}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF9999 100%)' }}
              >
                <IoCalendar className="h-5 w-5" />
                {locale === "ar" ? "احجز درس طبخ" : "Book Cooking Class"}
              </Link>
            </div>
          </div>

          {/* Private Arts & Crafts */}
          <div className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="p-8" style={{ background: 'linear-gradient(135deg, #8E44AD20 0%, #6C348320 100%)' }}>
              <IoColorPalette className="mb-4 h-16 w-16" style={{ color: '#8E44AD' }} />
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
                  { Icon: MdGroup, color: "#17A2B8", text: locale === "ar" ? "8-32 مشارك" : "8-32 participants" },
                  { Icon: MdSchedule, color: "#FFD93D", text: locale === "ar" ? "2-3 ساعات" : "2-3 hours" },
                  { Icon: GiPalette, color: "#8E44AD", text: locale === "ar" ? "اختر مشروعك الفني" : "Choose your project" },
                  { Icon: HiSparkles, color: "#FF6B6B", text: locale === "ar" ? "إشراف فريق نون" : "Guided by Noon team" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <item.Icon className="h-8 w-8" style={{ color: item.color }} />
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.text}</span>
                  </div>
                ))}
              </div>
              <Link
                href={`/${locale}/group-booking-events/private-classes/book?type=arts-crafts`}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg, #8E44AD 0%, #6C3483 100%)' }}
              >
                <IoCalendar className="h-5 w-5" />
                {locale === "ar" ? "احجز درس فنون" : "Book Arts Class"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
