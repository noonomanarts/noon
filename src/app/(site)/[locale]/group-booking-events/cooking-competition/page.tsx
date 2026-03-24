import Link from "next/link";
import { FiArrowRight, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import { GiCookingPot, GiChefToque } from "react-icons/gi";
import { IoTrophyOutline } from "react-icons/io5";

import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

function isVideoSource(source: string): boolean {
  const normalized = source.trim().toLowerCase();
  if (!normalized) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/.test(normalized);
}

export default async function CookingCompetitionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";
  const pageSettings = await getPublicSitePageSettings("events_competition");

  const t = {
    title: isArabic ? "مسابقة الطبخ" : "Cooking Competition",
    processTitle: isArabic ? "كيف تسير التجربة" : "How the Experience Works",
    packageTitle: isArabic ? "الباقات المتاحة" : "Available Packages",
    readyTitle: isArabic ? "جاهزون للتحدي؟" : "Ready for the Challenge?",
    readySubtitle: isArabic
      ? "احجز موعدك وسيتواصل فريق نون لتأكيد التفاصيل."
      : "Book your date and the Noon team will confirm all details with you.",
  };
  const pageTitle = (isArabic ? pageSettings?.headingAr : pageSettings?.headingEn)?.trim() || t.title;
  const mediaTypeFromSettings = pageSettings?.homeHero.backgroundMediaType;
  const mediaImageFromSettings = pageSettings?.homeHero.backgroundImageSrc?.trim() || "";
  const mediaVideoFromSettings = pageSettings?.homeHero.backgroundVideoSrc?.trim() || "";
  const legacyHeaderMedia = pageSettings?.homeHero.slideImages?.find((item) => item.trim())?.trim() || "";
  const legacyHeaderIsVideo = isVideoSource(legacyHeaderMedia);
  const headerMediaType = mediaTypeFromSettings ?? (legacyHeaderIsVideo ? "video" : "image");
  let headerMedia =
    headerMediaType === "video"
      ? mediaVideoFromSettings || (legacyHeaderIsVideo ? legacyHeaderMedia : "")
      : mediaImageFromSettings || (!legacyHeaderIsVideo ? legacyHeaderMedia : "");
  let headerMediaIsVideo = headerMediaType === "video";

  if (!headerMedia) {
    headerMedia = "/images/cooking.png";
    headerMediaIsVideo = false;
  }

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
    <div className="route-sharp pb-14">
      <section className="relative mb-10 h-[17rem] w-full overflow-hidden sm:h-[20rem] md:h-[22rem]">
        {headerMediaIsVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={headerMedia}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${headerMedia}")` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/40 to-black/55" />
        <div className="absolute inset-0 mx-auto flex w-full max-w-6xl items-center justify-center px-4 text-center">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-white sm:text-5xl">{pageTitle}</h1>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <h2 className="text-center text-2xl font-semibold text-[color:var(--text)]">{t.processTitle}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-purple-300/35 bg-purple-700 p-5 shadow-sm"
            >
              <div className="mb-3 flex justify-center">
                <item.icon className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-center text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-center text-sm leading-6 text-white/90">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <h2 className="text-center text-2xl font-semibold text-[color:var(--text)]">{t.packageTitle}</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
            <h3 className="text-center text-lg font-semibold text-[color:var(--text)]">
              {isArabic ? "الباقة القياسية" : "Standard Competition"}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {standardItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                  <FiCheckCircle className="mt-0.5 size-4 shrink-0 text-teal" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-coral/40 bg-[color:var(--surface)] p-6 shadow-sm">
            <h3 className="text-center text-lg font-semibold text-[color:var(--text)]">
              {isArabic ? "الباقة المميزة" : "Premium Competition"}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {premiumItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                  <FiCheckCircle className="mt-0.5 size-4 shrink-0 text-coral" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <h3 className="text-2xl font-semibold text-[color:var(--text)]">{t.readyTitle}</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[color:var(--text-muted)]">{t.readySubtitle}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[color:var(--text-subtle)]">
            <span className="inline-flex items-center gap-1">
              <FiUsers className="size-3.5" />
              {isArabic ? "8-40 مشارك" : "8-40 participants"}
            </span>
            <span className="inline-flex items-center gap-1">
              <FiClock className="size-3.5" />
              {isArabic ? "3 ساعات" : "3 hours"}
            </span>
          </div>
          <div className="mt-6">
            <Link
              href={`/${locale}/group-booking-events/cooking-competition/book`}
              className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
            >
              {isArabic ? "ابدأ الحجز" : "Start Booking"}
              <FiArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
