import Link from "next/link";
import { FiArrowRight, FiCalendar, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import { GiCookingPot, GiChefToque } from "react-icons/gi";
import { IoTrophyOutline } from "react-icons/io5";

import { isLocale, type Locale } from "@/lib/locale";

export default async function CookingCompetitionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const t = {
    eyebrow: isArabic ? "فعاليات المجموعات" : "Group Events",
    title: isArabic ? "مسابقة الطبخ" : "Cooking Competition",
    subtitle: isArabic
      ? "تجربة جماعية تجمع الطهي والتنافس والتعاون ضمن أجواء احترافية ممتعة."
      : "A team-based culinary challenge that combines cooking, competition, and collaboration.",
    cta: isArabic ? "احجز المسابقة" : "Book Competition",
    processTitle: isArabic ? "كيف تسير التجربة" : "How the Experience Works",
    packageTitle: isArabic ? "الباقات المتاحة" : "Available Packages",
    readyTitle: isArabic ? "جاهزون للتحدي؟" : "Ready for the Challenge?",
    readySubtitle: isArabic
      ? "احجز موعدك وسيتواصل فريق نون لتأكيد التفاصيل."
      : "Book your date and the Noon team will confirm all details with you.",
  };

  const steps = [
    {
      title: isArabic ? "الترحيب" : "Welcome",
      desc: isArabic ? "استقبال الضيوف مع قهوة عربية وحلويات." : "Guests are welcomed with Arabic coffee and sweets.",
      icon: FiUsers,
    },
    {
      title: isArabic ? "تقسيم الفرق" : "Team Draw",
      desc: isArabic ? "توزيع المشاركين على فرق وسحب صندوق المكونات." : "Participants are split into teams and receive mystery ingredients.",
      icon: GiChefToque,
    },
    {
      title: isArabic ? "التحدي" : "Cooking Challenge",
      desc: isArabic ? "تجهيز الأطباق ضمن وقت محدد بإشراف فريق نون." : "Teams cook under time pressure with Noon guidance.",
      icon: GiCookingPot,
    },
    {
      title: isArabic ? "النتائج" : "Final Vote",
      desc: isArabic ? "تذوق، تصويت، وإعلان الفريق الفائز." : "Tasting, voting, and winner announcement.",
      icon: IoTrophyOutline,
    },
  ];

  const standardItems = [
    isArabic ? "8-40 مشارك" : "8-40 participants",
    isArabic ? "2-8 فرق" : "2-8 teams",
    isArabic ? "1-2 طبق لكل فريق" : "1-2 dishes per team",
    isArabic ? "مدة التجربة: 3 ساعات" : "3-hour experience",
    isArabic ? "المكونات والمعدات مشمولة" : "Ingredients and equipment included",
  ];

  const premiumItems = [
    isArabic ? "كل مميزات الباقة القياسية" : "All standard package features",
    isArabic ? "2-3 أطباق لكل فريق" : "2-3 dishes per team",
    isArabic ? "مريلة قماش لكل مشارك" : "Fabric apron for each participant",
    isArabic ? "خيارات هدايا إضافية للفائزين" : "Optional winner gift add-ons",
    isArabic ? "مناسبة للشركات والفعاليات الخاصة" : "Ideal for corporate and premium events",
  ];

  return (
    <div className="relative overflow-x-clip pb-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem]">
        <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 pt-10">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-7 shadow-sm sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            <IoTrophyOutline className="h-4 w-4 text-coral" />
            {t.eyebrow}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[color:var(--text)] sm:text-5xl">
            {t.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base">
            {t.subtitle}
          </p>
          <Link
            href={`/${locale}/group-booking-events/cooking-competition/book`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
          >
            <FiCalendar className="size-4" />
            {t.cta}
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.processTitle}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((item, index) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <item.icon className="h-6 w-6 text-[color:var(--primary)]" />
                <span className="text-xs font-semibold text-[color:var(--text-subtle)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[color:var(--text)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.packageTitle}</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[color:var(--text)]">
              {isArabic ? "الباقة القياسية" : "Standard Competition"}
            </h3>
            <div className="mt-4 space-y-2.5">
              {standardItems.map((item) => (
                <p key={item} className="inline-flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                  <FiCheckCircle className="mt-0.5 size-4 shrink-0 text-teal" />
                  {item}
                </p>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-coral/40 bg-[color:var(--surface)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[color:var(--text)]">
              {isArabic ? "الباقة المميزة" : "Premium Competition"}
            </h3>
            <div className="mt-4 space-y-2.5">
              {premiumItems.map((item) => (
                <p key={item} className="inline-flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                  <FiCheckCircle className="mt-0.5 size-4 shrink-0 text-coral" />
                  {item}
                </p>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <h3 className="text-2xl font-semibold text-[color:var(--text)]">{t.readyTitle}</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[color:var(--text-muted)]">{t.readySubtitle}</p>
          <div className="mt-5 inline-flex items-center gap-4 text-xs text-[color:var(--text-subtle)]">
            <span className="inline-flex items-center gap-1">
              <FiUsers className="size-3.5" />
              {isArabic ? "8-40 مشارك" : "8-40 participants"}
            </span>
            <span className="inline-flex items-center gap-1">
              <FiClock className="size-3.5" />
              {isArabic ? "3 ساعات" : "3 hours"}
            </span>
          </div>
          <Link
            href={`/${locale}/group-booking-events/cooking-competition/book`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
          >
            {isArabic ? "ابدأ الحجز" : "Start Booking"}
            <FiArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
