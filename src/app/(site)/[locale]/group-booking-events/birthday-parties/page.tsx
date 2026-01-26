import { isLocale, type Locale } from "@/lib/locale";
import Link from "next/link";
import { MdGroup, MdSchedule, MdCake } from "react-icons/md";
import { IoCafe, IoCheckmarkCircle, IoAlertCircle, IoCalendar } from "react-icons/io5";
import { GiCookingPot, GiChefToque, GiPartyPopper } from "react-icons/gi";
import { BiSolidGift } from "react-icons/bi";
import { HiSparkles } from "react-icons/hi2";

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
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: '#8E44AD20', color: '#8E44AD' }}>
                <HiSparkles className="h-5 w-5" />
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
                className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #8E44AD 0%, #6C3483 100%)' }}
              >
                <MdCake className="h-6 w-6" />
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
                <div className="relative h-64 w-64 rounded-full p-8 shadow-2xl" style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FFC93C 100%)' }}>
                  <div className="flex h-full items-center justify-center">
                    <MdCake className="h-40 w-40" style={{ color: '#8E44AD' }} />
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
            <div className="overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900" style={{ borderColor: '#17A2B8' }}>
              <div className="p-6" style={{ background: 'linear-gradient(135deg, #17A2B820 0%, #17A2B810 100%)' }}>
                <div className="mb-2 flex items-center gap-2">
                  <IoCheckmarkCircle className="h-6 w-6" style={{ color: '#17A2B8' }} />
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {locale === "ar" ? "تشمل الباقة" : "Package Includes"}
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    { Icon: MdGroup, color: "#17A2B8", text: locale === "ar" ? "حتى 16 مشاركة" : "Up to 16 participants" },
                    { Icon: MdSchedule, color: "#FFD93D", text: locale === "ar" ? "ساعتان من المرح" : "2 hours of fun" },
                    { Icon: HiSparkles, color: "#8E44AD", text: locale === "ar" ? "للبنات فقط، 10 سنوات فأكثر" : "Girls only, age 10+" },
                    { Icon: IoCafe, color: "#FF6B6B", text: locale === "ar" ? "قهوة عربية وحلويات" : "Arabic coffee & sweets" },
                    { Icon: GiCookingPot, color: "#17A2B8", text: locale === "ar" ? "معدات ومكونات" : "Equipment & ingredients" },
                    { Icon: GiChefToque, color: "#FFD93D", text: locale === "ar" ? "إشراف فريق نون" : "Guided by Noon team" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <item.Icon className="h-8 w-8" style={{ color: item.color }} />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Not Included */}
            <div className="overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900" style={{ borderColor: '#FFD93D' }}>
              <div className="p-6" style={{ background: 'linear-gradient(135deg, #FFD93D20 0%, #FFC93C10 100%)' }}>
                <div className="mb-2 flex items-center gap-2">
                  <IoAlertCircle className="h-6 w-6" style={{ color: '#FFD93D' }} />
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {locale === "ar" ? "غير مشمول" : "Not Included"}
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {[
                    { Icon: GiPartyPopper, text: locale === "ar" ? "زينة عيد الميلاد" : "Birthday decorations" },
                    { Icon: BiSolidGift, text: locale === "ar" ? "هدايا عيد الميلاد" : "Birthday gifts" },
                    { Icon: MdCake, text: locale === "ar" ? "كعكة عيد الميلاد" : "Birthday cake" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 opacity-75">
                      <item.Icon className="h-8 w-8" style={{ color: '#FFD93D' }} />
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">{item.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-xl p-4" style={{ backgroundColor: '#FFD93D20' }}>
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
              className="inline-flex items-center gap-2 rounded-xl px-10 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #8E44AD 0%, #6C3483 100%)' }}
            >
              {locale === "ar" ? "ابدأ الحجز" : "Start Booking"}
              <IoCalendar className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
