import { isLocale, type Locale } from "@/lib/locale";
import Link from "next/link";

export default async function BirthdayPartiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        {/* Hero Section */}
        <div className="mb-16 overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-pink-50 to-purple-50 shadow-2xl dark:border-zinc-800 dark:from-pink-950/30 dark:to-purple-950/30">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Text Content */}
            <div className="p-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-sm font-semibold text-pink-800 dark:bg-pink-900/30 dark:text-pink-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {locale === "ar" ? "فعاليات خاصة" : "Special Events"}
              </div>
              <h1 className="mb-6 text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {locale === "ar" ? "حفلات أعياد الميلاد" : "Birthday Parties"}
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                {locale === "ar"
                  ? "احتفل بعيد ميلاد مميز مع تجربة طبخ ممتعة للأطفال! تجربة لا تُنسى مليئة بالمرح والإبداع."
                  : "Celebrate a special birthday with a fun cooking experience for kids! An unforgettable experience filled with fun and creativity."}
              </p>

              <Link
                href={`/${locale}/group-booking-events/birthday-parties/book`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                {locale === "ar" ? "احجز حفلة عيد الميلاد" : "Book Birthday Party"}
              </Link>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
                {locale === "ar"
                  ? "سيتواصل معك فريقنا لتأكيد التفاصيل"
                  : "Our team will contact you to confirm details"}
              </p>
            </div>

            {/* Image */}
            <div className="relative h-full min-h-[500px] lg:min-h-0">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20"></div>
              <div className="flex h-full items-center justify-center p-12">
                <div className="relative h-64 w-64 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 p-8 shadow-2xl">
                  <div className="flex h-full items-center justify-center text-8xl">
                    🎂
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            {locale === "ar" ? "تفاصيل الباقة" : "Package Details"}
          </h2>
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
            {/* Includes */}
            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl dark:border-emerald-900/30 dark:bg-zinc-900">
              <div className="bg-gradient-to-r from-emerald-100 to-green-100 p-6 dark:from-emerald-950/30 dark:to-green-950/30">
                <div className="mb-2 flex items-center gap-2">
                  <svg className="h-6 w-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {locale === "ar" ? "تشمل الباقة" : "Package Includes"}
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    { icon: "👥", text: locale === "ar" ? "حتى 16 مشاركة" : "Up to 16 participants" },
                    { icon: "⏱️", text: locale === "ar" ? "ساعتان من المرح" : "2 hours of fun" },
                    { icon: "👧", text: locale === "ar" ? "للبنات فقط، 10 سنوات فأكثر" : "Girls only, age 10+" },
                    { icon: "☕", text: locale === "ar" ? "قهوة عربية وحلويات" : "Arabic coffee & sweets" },
                    { icon: "🍽️", text: locale === "ar" ? "معدات ومكونات" : "Equipment & ingredients" },
                    { icon: "👨‍🍳", text: locale === "ar" ? "إشراف فريق نون" : "Guided by Noon team" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Not Included */}
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xl dark:border-amber-900/30 dark:bg-zinc-900">
              <div className="bg-gradient-to-r from-amber-100 to-yellow-100 p-6 dark:from-amber-950/30 dark:to-yellow-950/30">
                <div className="mb-2 flex items-center gap-2">
                  <svg className="h-6 w-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {locale === "ar" ? "غير مشمول" : "Not Included"}
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    { icon: "🎈", text: locale === "ar" ? "زينة عيد الميلاد" : "Birthday decorations" },
                    { icon: "🎁", text: locale === "ar" ? "هدايا عيد الميلاد" : "Birthday gifts" },
                    { icon: "🎂", text: locale === "ar" ? "كعكة عيد الميلاد" : "Birthday cake" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 opacity-75">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">{item.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {locale === "ar"
                      ? "يمكنك إحضار الزينة والكعكة والهدايا الخاصة بك"
                      : "You can bring your own decorations, cake, and gifts"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="text-center">
          <div className="inline-block rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-12 shadow-xl dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900/50">
            <h3 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
              {locale === "ar" ? "اجعل عيد ميلادهم لا يُنسى!" : "Make Their Birthday Unforgettable!"}
            </h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              {locale === "ar"
                ? "احجز حفلة عيد ميلاد خاصة اليوم"
                : "Book a special birthday party today"}
            </p>
            <Link
              href={`/${locale}/group-booking-events/birthday-parties/book`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-10 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
            >
              {locale === "ar" ? "ابدأ الحجز" : "Start Booking"}
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
