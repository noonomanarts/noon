import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import Link from "next/link";
import { FiArrowRight, FiCheckCircle, FiClock, FiUsers, FiXCircle } from "react-icons/fi";

import BirthdayQuickPriceCalculator from "@/components/site/BirthdayQuickPriceCalculator";
import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

function isVideoSource(source: string): boolean {
  const normalized = source.trim().toLowerCase();
  if (!normalized) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/.test(normalized);
}

export default async function BirthdayPartiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";
  const pageSettings = await getPublicSitePageSettings("events_birthday");

  const t = {
    title: isArabic ? "حفلات أعياد الميلاد" : "Birthday Parties",
    includesTitle: isArabic ? "تشمل الباقة" : "Package Includes",
    excludesTitle: isArabic ? "غير مشمول" : "Not Included",
    readyTitle: isArabic ? "احجز حفلتك الآن" : "Book Your Party Now",
    readySubtitle: isArabic
      ? "اختر موعدك المناسب وسننسق التفاصيل معك مباشرة."
      : "Choose your preferred date and our team will coordinate the details with you.",
    cta: isArabic ? "ابدأ الحجز" : "Start Booking",
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
    headerMedia = "/images/slides/5.jpg";
    headerMediaIsVideo = false;
  }

  const includes = [
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

      <BirthdayQuickPriceCalculator locale={locale} />

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.includesTitle}</h2>
            <ul className="mt-4 space-y-2.5">
              {includes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                  <FiCheckCircle className="mt-0.5 size-4 shrink-0 text-teal" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[color:var(--text)]">{t.excludesTitle}</h2>
            <ul className="mt-4 space-y-2.5">
              {excludes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                  <FiXCircle className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl bg-[color:var(--muted)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
              {isArabic
                ? "يمكن إحضار الزينة والهدايا والكعكة بشكل مستقل."
                : "You can bring your own decorations, gifts, and birthday cake."}
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-[color:var(--text)] sm:text-3xl">{t.readyTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[color:var(--text-muted)]">{t.readySubtitle}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-[color:var(--text)] sm:gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-4 py-2">
              <FiUsers className="size-4 shrink-0 text-[color:var(--text-muted)]" aria-hidden="true" />
              {isArabic ? "حتى 16 مشاركة (+10 ر.ع لكل مشاركة إضافية)" : "Up to 16 participants (+10 OMR per additional person)"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-4 py-2">
              <FiClock className="size-4 shrink-0 text-[color:var(--text-muted)]" aria-hidden="true" />
              {isArabic ? "ساعتان" : "2 hours"}
            </span>
          </div>
          <Link
            href={`/${locale}/group-booking-events/birthday-parties/book`}
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[color:var(--primary)] px-8 text-base font-semibold text-[color:var(--primary-foreground)] transition hover:bg-[color:var(--primary-hover)]"
          >
            {t.cta}
            <FiArrowRight className="rtl:rotate-180 size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, {
    path: "/group-booking-events/birthday-parties",
    title: { ar: "حفلات أعياد الميلاد", en: "Birthday Parties" },
    description: {
      ar: "حفلة عيد ميلاد بطابع الطبخ للأطفال في نون بمسقط. باقات لمجموعات مختلفة مع تجربة ممتعة لا تُنسى.",
      en: "A cooking-themed birthday party for kids at Noon in Muscat. Packages for different group sizes and a fun, memorable experience.",
    },
  });
}
