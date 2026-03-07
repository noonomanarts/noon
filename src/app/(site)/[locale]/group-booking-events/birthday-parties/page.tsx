import Link from "next/link";
import { FiArrowRight, FiCalendar, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import { GiPartyPopper } from "react-icons/gi";
import { MdCake } from "react-icons/md";

import { isLocale, type Locale } from "@/lib/locale";

export default async function BirthdayPartiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const t = {
    eyebrow: isArabic ? "فعاليات خاصة" : "Special Events",
    title: isArabic ? "حفلات أعياد الميلاد" : "Birthday Parties",
    subtitle: isArabic
      ? "تجربة طبخ احتفالية للبنات بعمر 10 سنوات فأكثر في أجواء ممتعة وآمنة."
      : "A celebratory cooking experience for girls aged 10+ in a joyful and safe setting.",
    includesTitle: isArabic ? "تشمل الباقة" : "Package Includes",
    excludesTitle: isArabic ? "غير مشمول" : "Not Included",
    readyTitle: isArabic ? "احجز حفلتك الآن" : "Book Your Party Now",
    readySubtitle: isArabic
      ? "اختر موعدك المناسب وسننسق التفاصيل معك مباشرة."
      : "Choose your preferred date and our team will coordinate the details with you.",
    cta: isArabic ? "ابدأ الحجز" : "Start Booking",
  };

  const includes = [
    isArabic ? "حتى 16 مشاركة" : "Up to 16 participants",
    isArabic ? "المدة: ساعتان" : "Duration: 2 hours",
    isArabic ? "قهوة عربية وحلويات" : "Arabic coffee and sweets",
    isArabic ? "المعدات والمكونات مشمولة" : "Equipment and ingredients included",
    isArabic ? "إشراف فريق نون" : "Guided by the Noon team",
  ];

  const excludes = [
    isArabic ? "زينة عيد الميلاد" : "Birthday decorations",
    isArabic ? "الهدايا" : "Gifts",
    isArabic ? "كيكة عيد الميلاد" : "Birthday cake",
  ];

  return (
    <div className="relative overflow-x-clip pb-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem]">
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-coral/16 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-teal/16 blur-3xl dark:bg-teal/10" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 pt-10">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            <GiPartyPopper className="h-4 w-4 text-coral" />
            {t.eyebrow}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
            {t.subtitle}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-subtle)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-3 py-1.5">
              <FiUsers className="size-3.5" />
              {isArabic ? "حتى 16 مشاركة" : "Up to 16 participants"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] px-3 py-1.5">
              <FiClock className="size-3.5" />
              {isArabic ? "2 ساعات" : "2 hours"}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.includesTitle}</h2>
            <div className="mt-4 space-y-2.5">
              {includes.map((item) => (
                <p key={item} className="inline-flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                  <FiCheckCircle className="mt-0.5 size-4 shrink-0 text-teal" />
                  {item}
                </p>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-coral/40 bg-[color:var(--surface)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.excludesTitle}</h2>
            <div className="mt-4 space-y-2.5">
              {excludes.map((item) => (
                <p key={item} className="inline-flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                  <MdCake className="mt-0.5 size-4 shrink-0 text-coral" />
                  {item}
                </p>
              ))}
            </div>
            <p className="mt-5 rounded-xl bg-[color:var(--muted)] px-3 py-2 text-xs text-[color:var(--text-subtle)]">
              {isArabic
                ? "يمكن إحضار الزينة والهدايا والكعكة بشكل مستقل."
                : "You can bring your own decorations, gifts, and birthday cake."}
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <h3 className="text-2xl font-semibold text-[color:var(--text)]">{t.readyTitle}</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[color:var(--text-muted)]">{t.readySubtitle}</p>
          <Link
            href={`/${locale}/group-booking-events/birthday-parties/book`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
          >
            <FiCalendar className="size-4" />
            {t.cta}
            <FiArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
