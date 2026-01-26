import { isLocale, type Locale } from "@/lib/locale";
import Link from "next/link";
import Image from "next/image";

export default async function CookingCompetitionPage({
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
        <div className="mb-16 overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-orange-50 to-red-50 shadow-2xl dark:border-zinc-800 dark:from-orange-950/30 dark:to-red-950/30">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Text Content */}
            <div className="p-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                {locale === "ar" ? "فعاليات المجموعات" : "Group Events"}
              </div>
              <h1 className="mb-6 text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {locale === "ar" ? "مسابقة الطبخ" : "Cooking Competition"}
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                {locale === "ar"
                  ? "تجربة تنافسية ممتعة للشركات والمجموعات. اطبخ، تنافس، واستمتع مع فريقك في تحدٍ طهي مثير!"
                  : "An exciting team-building experience for companies and groups. Cook, compete, and have fun with your team in a thrilling culinary challenge!"}
              </p>

              {/* Key Features */}
              <div className="mb-8 space-y-3">
                {[
                  { icon: "👥", text: locale === "ar" ? "8-40 مشارك" : "8-40 Participants" },
                  { icon: "⏱️", text: locale === "ar" ? "3 ساعات من المرح" : "3 Hours of Fun" },
                  { icon: "🎁", text: locale === "ar" ? "جوائز للفائزين" : "Prizes for Winners" },
                  { icon: "👨‍🍳", text: locale === "ar" ? "بإشراف فريق نون" : "Guided by Noon Team" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <Link
                href={`/${locale}/group-booking-events/cooking-competition/book`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {locale === "ar" ? "احجز الآن" : "Book Now"}
              </Link>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
                {locale === "ar"
                  ? "سيتواصل معك فريقنا لتأكيد التفاصيل"
                  : "Our team will contact you to confirm details"}
              </p>
            </div>

            {/* Image */}
            <div className="relative h-full min-h-[500px] lg:min-h-0">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20"></div>
              <div className="flex h-full items-center justify-center p-12">
                <div className="relative h-64 w-64 rounded-full bg-gradient-to-br from-orange-400 to-red-500 p-8 shadow-2xl">
                  <div className="flex h-full items-center justify-center text-8xl">
                    🏆
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            {locale === "ar" ? "كيف تعمل المسابقة" : "How It Works"}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                icon: "☕",
                title: locale === "ar" ? "الترحيب" : "Welcome",
                desc: locale === "ar" ? "قهوة عربية وحلويات" : "Arabic coffee & sweets",
              },
              {
                step: "2",
                icon: "🎲",
                title: locale === "ar" ? "التقسيم" : "Team Draw",
                desc: locale === "ar" ? "تقسيم الفرق وصندوق المفاجآت" : "Team division & mystery box",
              },
              {
                step: "3",
                icon: "👨‍🍳",
                title: locale === "ar" ? "الطبخ" : "Cook",
                desc: locale === "ar" ? "طبخوا وتنافسوا!" : "Cook & compete!",
              },
              {
                step: "4",
                icon: "🥇",
                title: locale === "ar" ? "الفائز" : "Winner",
                desc: locale === "ar" ? "تصويت وإعلان الفائز" : "Vote & announce winner",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-5xl">{item.icon}</span>
                  <span className="text-5xl font-bold text-orange-200 dark:text-orange-900/30">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Packages Preview */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl font-bold text-zinc-900 dark:text-white">
            {locale === "ar" ? "الباقات المتاحة" : "Available Packages"}
          </h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Standard */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="bg-gradient-to-r from-orange-100 to-red-100 p-6 dark:from-orange-950/30 dark:to-red-950/30">
                <h3 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
                  {locale === "ar" ? "المسابقة القياسية" : "Standard Competition"}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {locale === "ar" ? "تجربة رائعة للفرق" : "Great team experience"}
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    locale === "ar" ? "8-40 مشارك" : "8-40 participants",
                    locale === "ar" ? "2-8 مجموعات" : "2-8 groups",
                    locale === "ar" ? "صندوق مفاجآت" : "Mystery box",
                    locale === "ar" ? "معدات ومكونات" : "Equipment & ingredients",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-zinc-700 dark:text-zinc-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Premium */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-orange-500 bg-white shadow-2xl dark:bg-zinc-900">
              <div className="absolute right-4 top-4">
                <span className="rounded-full bg-gradient-to-r from-orange-600 to-red-600 px-4 py-1 text-sm font-bold text-white">
                  {locale === "ar" ? "الأفضل" : "POPULAR"}
                </span>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6">
                <h3 className="mb-2 text-2xl font-bold text-white">
                  {locale === "ar" ? "المسابقة المميزة" : "Premium Competition"}
                </h3>
                <p className="text-orange-100">
                  {locale === "ar" ? "تجربة لا تُنسى" : "Unforgettable experience"}
                </p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    locale === "ar" ? "كل مميزات القياسية" : "All Standard features",
                    locale === "ar" ? "مرايل قماش لجميع المشاركين" : "Fabric aprons for all",
                    locale === "ar" ? "هدية إضافية للفريق الفائز" : "Extra gift for winners",
                    locale === "ar" ? "2-3 أطباق لكل مجموعة" : "2-3 dishes per group",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-semibold text-zinc-900 dark:text-white">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="text-center">
          <div className="inline-block rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-12 shadow-xl dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900/50">
            <h3 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
              {locale === "ar" ? "جاهز للبدء؟" : "Ready to Get Started?"}
            </h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              {locale === "ar"
                ? "احجز مسابقة الطبخ لفريقك اليوم"
                : "Book a cooking competition for your team today"}
            </p>
            <Link
              href={`/${locale}/group-booking-events/cooking-competition/book`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 px-10 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
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
