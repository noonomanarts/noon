import Link from "next/link";
import { isLocale, type Locale } from "@/lib/locale";
import { IoTrophy, IoCalendar } from "react-icons/io5";
import { GiChefToque, GiPartyPopper } from "react-icons/gi";

export default async function GroupBookingEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const cards = [
    {
      href: `/${locale}/group-booking-events/cooking-competition`,
      title: isArabic ? "مسابقة الطبخ" : "Cooking Competition",
      description: isArabic
        ? "تجربة تفاعلية للمجموعات: طبخ، تنافس، وفوز."
        : "A fun group challenge: cook, compete, and celebrate.",
      Icon: IoTrophy,
      gradient: "from-orange-500 to-red-500",
    },
    {
      href: `/${locale}/group-booking-events/private-classes`,
      title: isArabic ? "الدروس الخاصة" : "Private Classes",
      description: isArabic
        ? "جلسات مخصصة للطبخ أو الفنون حسب احتياج مجموعتك."
        : "Tailored cooking or arts sessions for your group.",
      Icon: GiChefToque,
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      href: `/${locale}/group-booking-events/birthday-parties`,
      title: isArabic ? "حفلات أعياد الميلاد" : "Birthday Parties",
      description: isArabic
        ? "حفلات بطابع طهي ممتع للأطفال وتجربة لا تُنسى."
        : "Cooking-themed birthday celebrations for unforgettable memories.",
      Icon: GiPartyPopper,
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-[color:var(--muted)] dark:text-[color:var(--text)]">
            <IoCalendar className="h-5 w-5" />
            {isArabic ? "حجوزات وفعاليات المجموعات" : "Group Bookings & Events"}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[color:var(--text)] dark:text-white sm:text-5xl">
            {isArabic ? "الفعاليات الجماعية" : "Group Events"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[color:var(--text-muted)] dark:text-zinc-400">
            {isArabic
              ? "اختر نوع الفعالية المناسبة لمجموعتك وابدأ طلب الحجز بخطوات واضحة."
              : "Choose the event experience that fits your group and submit your booking request in a few steps."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className={`bg-gradient-to-r ${card.gradient} p-6`}>
                <card.Icon className="h-12 w-12 text-white" />
              </div>
              <div className="space-y-3 p-6">
                <h2 className="text-xl font-bold text-[color:var(--text)] dark:text-white">{card.title}</h2>
                <p className="text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{card.description}</p>
                <p className="text-sm font-semibold text-[color:var(--text)] dark:text-zinc-100">
                  {isArabic ? "عرض التفاصيل" : "View details"} →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
