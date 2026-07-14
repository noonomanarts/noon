import type { Metadata } from "next";
import { FiEdit3, FiSearch, FiThumbsUp } from "react-icons/fi";
import WorkshopSuggestionsSection from "@/components/site/WorkshopSuggestionsSection";
import { isLocale, type Locale } from "@/lib/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "اقترح ورشة | نون" : "Suggest a Workshop | Noon",
    description: isArabic
      ? "شاركنا فكرتك لورشة جديدة أو صوّت على الأفكار المقترحة. أكثر الأفكار طلباً تتحول إلى ورش حقيقية."
      : "Share your idea for a new workshop or vote on suggested ideas. The most requested ideas become real workshops.",
  };
}

export default async function SuggestWorkshopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  const t = {
    kicker: isArabic ? "أفكاركم تصنع ورشنا" : "Your ideas shape our workshops",
    title: isArabic ? "اقترح ورشة جديدة" : "Suggest a New Workshop",
    subtitle: isArabic
      ? "هل هناك ورشة تتمنى أن تجدها في نون؟ أخبرنا عنها! نراجع كل الاقتراحات، وننشر أفضلها ليصوّت عليها الجميع — وأكثرها طلباً نحوّلها إلى ورش حقيقية على جدولنا."
      : "Is there a workshop you wish Noon offered? Tell us about it! We review every suggestion, publish the best ones for everyone to vote on — and turn the most requested ideas into real workshops on our schedule.",
    how: isArabic ? "كيف تعمل؟" : "How it works",
    steps: [
      {
        icon: <FiEdit3 className="h-6 w-6" />,
        title: isArabic ? "١. شارك فكرتك" : "1. Share your idea",
        text: isArabic
          ? "اكتب فكرة الورشة وأي تفاصيل تساعدنا على فهمها — لا يتطلب الأمر تسجيل دخول."
          : "Write your workshop idea with any details that help us understand it — no login required.",
      },
      {
        icon: <FiSearch className="h-6 w-6" />,
        title: isArabic ? "٢. نراجع الاقتراح" : "2. We review it",
        text: isArabic
          ? "يراجع فريق نون كل اقتراح وينشر الأفكار المناسبة هنا على هذه الصفحة."
          : "The Noon team reviews every suggestion and publishes suitable ideas right here on this page.",
      },
      {
        icon: <FiThumbsUp className="h-6 w-6" />,
        title: isArabic ? "٣. صوّتوا عليها" : "3. Everyone votes",
        text: isArabic
          ? "صوّت على الأفكار التي تريدها. الأفكار الأكثر طلباً تتحول إلى ورش حقيقية!"
          : "Vote for the ideas you want. The most requested ideas become real workshops!",
      },
    ],
  };

  return (
    <div className="route-sharp relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem]">
        <div className="absolute -left-16 top-8 h-64 w-64 rounded-full bg-coral/18 blur-3xl dark:bg-coral/10" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-teal/18 blur-3xl dark:bg-teal/10" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        {/* Hero */}
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">{t.kicker}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--text)] sm:text-4xl">
            {t.title}
          </h1>
          <p className="mt-4 text-base leading-8 text-[color:var(--text-muted)]">{t.subtitle}</p>
        </div>

        {/* How it works */}
        <section className="mt-10" aria-label={t.how}>
          <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.how}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {t.steps.map((step) => (
              <article
                key={step.title}
                className="border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                  {step.icon}
                </span>
                <h3 className="mt-3 font-semibold text-[color:var(--text)]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-7 text-[color:var(--text-muted)]">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Submission form + published suggestions with voting */}
        <WorkshopSuggestionsSection locale={locale} />
      </div>
    </div>
  );
}
