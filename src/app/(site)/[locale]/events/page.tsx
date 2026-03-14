import Link from "next/link";
import { GiChefToque, GiPartyPopper } from "react-icons/gi";
import { IoTrophy } from "react-icons/io5";

import { isLocale, type Locale } from "@/lib/locale";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const t = {
    title: isArabic ? "الفعاليات" : "Events",
    subtitle: isArabic ? "اختر نوع الفعالية المناسبة لمجموعتك" : "Choose the event format that fits your group",
    competition: isArabic ? "مسابقة الطبخ" : "Cooking Competition",
    competitionDesc: isArabic
      ? "تجربة تفاعلية للمجموعات: طبخ، تنافس، وفوز."
      : "A dynamic group challenge: cook, compete, and celebrate.",
    privateClasses: isArabic ? "الدروس الخاصة" : "Private Classes",
    privateClassesDesc: isArabic
      ? "جلسات مخصصة للطبخ أو الفنون حسب احتياج مجموعتك."
      : "Tailored cooking or arts sessions for your team or community.",
    birthday: isArabic ? "حفلات أعياد الميلاد" : "Birthday Parties",
    birthdayDesc: isArabic
      ? "حفلات بطابع طهي ممتع وتجربة لا تُنسى."
      : "Cooking-themed birthday experiences with memorable moments.",
    explore: isArabic ? "استكشف" : "Explore",
  };

  return (
    <div className="route-sharp min-h-screen bg-[color:var(--muted)] dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[color:var(--text)] dark:text-white">{t.title}</h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/${locale}/group-booking-events/cooking-competition`}
            className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
              <IoTrophy className="h-20 w-20 text-amber-600 dark:text-amber-300" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-[color:var(--text)] dark:text-white">{t.competition}</h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{t.competitionDesc}</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-amber-700 dark:text-amber-300">
                {t.explore}
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/group-booking-events/private-classes`}
            className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-800/30">
              <GiChefToque className="h-20 w-20 text-teal-600 dark:text-teal-300" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-[color:var(--text)] dark:text-white">{t.privateClasses}</h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{t.privateClassesDesc}</p>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-teal-700 dark:text-teal-300">
                {t.explore}
              </div>
            </div>
          </Link>

          <Link
            href={`/${locale}/group-booking-events/birthday-parties`}
            className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
              <GiPartyPopper className="h-20 w-20 text-purple-600 dark:text-purple-300" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-[color:var(--text)] dark:text-white">{t.birthday}</h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">{t.birthdayDesc}</p>
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
