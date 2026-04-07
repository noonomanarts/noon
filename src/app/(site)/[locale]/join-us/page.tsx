import Link from "next/link";
import { isLocale, type Locale } from "@/lib/locale";
import { getJoinUsFormsConfig } from "@/lib/db/joinUs";

export default async function JoinUsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";

  let config;
  try {
    config = await getJoinUsFormsConfig();
  } catch {
    config = { trainer: { enabled: true }, social_media: { enabled: false } };
  }

  const t = {
    title: isArabic ? "انضم إلينا" : "Join Us",
    trainerTitle: isArabic ? "تقديم طلب مدرب/مدربة" : "Trainer Application",
    trainerDesc: isArabic
      ? "هل لديك شغف بالطبخ أو الفنون والأشغال اليدوية؟ انضم لفريق مدربينا!"
      : "Passionate about cooking or arts & crafts? Join our team of trainers!",
    socialTitle: isArabic ? "وظائف السوشل ميديا" : "Social Media Position",
    socialDesc: isArabic
      ? "هل لديك إبداع في التسويق الرقمي؟ نبحث عنك!"
      : "Creative in digital marketing? We're looking for you!",
    apply: isArabic ? "تقدم الآن" : "Apply Now",
    comingSoon: isArabic ? "قريباً" : "Coming Soon",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-10 text-3xl font-bold text-zinc-900">{t.title}</h1>

      <div className="space-y-6">
        {/* Trainer application - always shown */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-bold text-zinc-900">{t.trainerTitle}</h2>
          <p className="mt-2 text-sm text-zinc-600">{t.trainerDesc}</p>
          {config.trainer?.enabled ? (
            <Link
              href={`/${locale}/join-us/trainer`}
              className="mt-4 inline-flex items-center rounded-xl bg-[color:var(--noon-teal)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
            >
              {t.apply}
            </Link>
          ) : (
            <span className="mt-4 inline-block text-sm font-medium text-zinc-400">{t.comingSoon}</span>
          )}
        </div>

        {/* Social media position - shown only when enabled */}
        {config.social_media?.enabled && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-bold text-zinc-900">{t.socialTitle}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t.socialDesc}</p>
            <Link
              href={`/${locale}/join-us/social-media`}
              className="mt-4 inline-flex items-center rounded-xl bg-[color:var(--noon-teal)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--noon-teal-strong)]"
            >
              {t.apply}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
