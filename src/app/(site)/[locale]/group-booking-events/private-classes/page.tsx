import Link from "next/link";
import { FiArrowRight, FiCalendar, FiClock, FiUsers } from "react-icons/fi";
import { GiChefToque, GiPalette } from "react-icons/gi";

import { isLocale, type Locale } from "@/lib/locale";

export default async function PrivateClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const t = {
    eyebrow: isArabic ? "فعاليات المجموعات" : "Group Events",
    title: isArabic ? "الدروس الخاصة" : "Private Classes",
    subtitle: isArabic
      ? "جلسات مخصصة للمجموعات مع مسارات طبخ أو فنون، بإشراف فريق نون."
      : "Tailored sessions for groups with either cooking or arts tracks, guided by the Noon team.",
    optionsTitle: isArabic ? "اختر نوع التجربة" : "Choose Your Experience",
    commonTitle: isArabic ? "مواصفات مشتركة" : "Shared Experience Specs",
    cta: isArabic ? "ابدأ الحجز" : "Start Booking",
  };

  const commonItems = [
    isArabic ? "8-32 مشارك" : "8-32 participants",
    isArabic ? "1-2 مشارك لكل محطة" : "1-2 participants per station",
    isArabic ? "المدة 2-3 ساعات" : "Duration 2-3 hours",
    isArabic ? "المكونات والمعدات مشمولة" : "Ingredients and equipment included",
    isArabic ? "ضيافة قهوة عربية وحلويات" : "Arabic coffee and sweets welcome",
  ];

  return (
    <div className="relative overflow-x-clip pb-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem]">
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-coral/16 blur-3xl dark:bg-coral/10" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 pt-10">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            <FiUsers className="h-4 w-4 text-teal" />
            {t.eyebrow}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
            {t.subtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.optionsTitle}</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--muted)]">
              <GiChefToque className="h-6 w-6 text-coral" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[color:var(--text)]">
              {isArabic ? "درس طبخ خاص" : "Private Cooking Class"}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              {isArabic
                ? "جلسة عملية تركّز على وصفات مختارة وفق مستوى المجموعة."
                : "A practical session focused on selected recipes based on your group level."}
            </p>
            <div className="mt-4 space-y-2">
              <p className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                <FiUsers className="size-4 text-teal" />
                {isArabic ? "مناسب للشركات والأصدقاء" : "Ideal for teams and friends"}
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                <FiClock className="size-4 text-coral" />
                {isArabic ? "اختيار الطبق مسبقاً" : "Dish selection in advance"}
              </p>
            </div>
            <Link
              href={`/${locale}/group-booking-events/private-classes/book?type=cooking`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
            >
              <FiCalendar className="size-4" />
              {isArabic ? "احجز درس الطبخ" : "Book Cooking Session"}
            </Link>
          </article>

          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--muted)]">
              <GiPalette className="h-6 w-6 text-teal" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[color:var(--text)]">
              {isArabic ? "درس فنون وأشغال خاص" : "Private Arts & Crafts Class"}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              {isArabic
                ? "تجربة إبداعية بخيارات متنوعة تناسب أهداف المجموعة."
                : "A creative session with project options tailored to group goals."}
            </p>
            <div className="mt-4 space-y-2">
              <p className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                <FiUsers className="size-4 text-teal" />
                {isArabic ? "مثالي للفعاليات التعليمية" : "Perfect for educational team events"}
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                <FiClock className="size-4 text-coral" />
                {isArabic ? "مرونة في نوع المشروع" : "Flexible project selection"}
              </p>
            </div>
            <Link
              href={`/${locale}/group-booking-events/private-classes/book?type=arts-crafts`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-2.5 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
            >
              <FiCalendar className="size-4" />
              {isArabic ? "احجز درس الفنون" : "Book Arts Session"}
            </Link>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm">
          <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.commonTitle}</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {commonItems.map((item) => (
              <p key={item} className="inline-flex items-start gap-2 rounded-xl bg-[color:var(--muted)] px-3 py-2 text-sm text-[color:var(--text-muted)]">
                <FiArrowRight className="mt-0.5 size-4 shrink-0 text-[color:var(--primary)]" />
                {item}
              </p>
            ))}
          </div>
          <Link
            href={`/${locale}/group-booking-events/private-classes/book`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
          >
            {t.cta}
            <FiArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
