import Link from "next/link";
import { FiArrowRight, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import { GiCookingPot, GiChefToque } from "react-icons/gi";
import { IoTrophyOutline } from "react-icons/io5";

import CookingCompetitionPriceCalculator from "@/components/site/CookingCompetitionPriceCalculator";
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
  const processCardBackgroundColor = pageSettings?.eventCompetition.processCardBackgroundColor || "#7e22ce";
  const processCardBorderColor = pageSettings?.eventCompetition.processCardBorderColor || "#c4b5fd";

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

  const packageCards = [
    {
      key: "standard" as const,
      title: isArabic ? "الباقة القياسية" : "Standard Competition",
      participants: isArabic ? "8-40 مشارك" : "8-40 participants",
      priceSummary: isArabic ? "ابتداءً من 16 ر.ع / شخص" : "From 16 OMR / person",
      details: [
        {
          label: isArabic ? "مثالية لـ" : "Ideal for",
          value: isArabic ? "بناء الفريق، الأصدقاء، والتجارب الجماعية" : "Team building, friends, and casual group experiences",
        },
        { label: isArabic ? "عدد المجموعات" : "Number of Groups", value: isArabic ? "2-8 فرق" : "2-8 groups" },
        {
          label: isArabic ? "الأطباق لكل مجموعة" : "Dishes per Group",
          value: isArabic ? "1-2 طبق (حسب حجم المجموعة)" : "1-2 dishes (depending on group size)",
        },
        { label: isArabic ? "المدة" : "Duration", value: isArabic ? "3 ساعات" : "3 hours" },
        {
          label: isArabic ? "الهدايا" : "Gifts",
          value: isArabic ? "غير مشمولة (متاحة كإضافة)" : "Not included (available as an add-on)",
        },
      ],
      includes: [
        isArabic ? "قهوة عربية وحلويات ترحيبية" : "Welcome Arabic coffee & sweets",
        isArabic ? "تحدي صندوق المفاجآت (دجاج، لحم بقري وروبيان)" : "Mystery box challenge (chicken, beef & prawns)",
        isArabic ? "استخدام جميع المعدات والمكونات" : "Use of all kitchen equipment and ingredients",
        isArabic ? "تجربة موجهة بإشراف فريق نون" : "Guided experience by the Noon team",
        isArabic ? "تقديم الحلوى والمشروبات بعد المسابقة" : "Dessert & drinks served after the competition",
      ],
      priceTiers: [
        {
          range: isArabic ? "6-10 مشاركين" : "6-10 participants",
          price: isArabic ? "25 ر.ع / شخص" : "25 OMR / person",
        },
        {
          range: isArabic ? "11-20 مشارك" : "11-20 participants",
          price: isArabic ? "21 ر.ع / شخص" : "21 OMR / person",
        },
        {
          range: isArabic ? "21-30 مشارك" : "21-30 participants",
          price: isArabic ? "19 ر.ع / شخص" : "19 OMR / person",
        },
        {
          range: isArabic ? "31-40 مشارك" : "31-40 participants",
          price: isArabic ? "16 ر.ع / شخص" : "16 OMR / person",
        },
      ],
      bookingHref: `/${locale}/group-booking-events/cooking-competition/book?package=standard`,
    },
    {
      key: "premium" as const,
      title: isArabic ? "الباقة المميزة" : "Premium Competition",
      participants: isArabic ? "8-40 مشارك" : "8-40 participants",
      priceSummary: isArabic ? "السعر حسب الطلب" : "Price on request",
      details: [
        {
          label: isArabic ? "مثالية لـ" : "Ideal for",
          value: isArabic ? "فعاليات الشركات، الاحتفالات، والتجارب الراقية" : "Corporate events, celebrations, and premium experiences",
        },
        { label: isArabic ? "عدد المجموعات" : "Number of Groups", value: isArabic ? "2-8 فرق" : "2-8 groups" },
        {
          label: isArabic ? "الأطباق لكل مجموعة" : "Dishes per Group",
          value: isArabic ? "2-3 أطباق (حسب حجم المجموعة)" : "2-3 dishes (depending on group size)",
        },
        { label: isArabic ? "المدة" : "Duration", value: isArabic ? "3 ساعات" : "3 hours" },
        {
          label: isArabic ? "الهدايا" : "Gifts",
          value: isArabic ? "مرايل قماش لجميع المشاركين" : "Fabric aprons for all participants",
        },
      ],
      includes: [
        isArabic ? "قهوة عربية وحلويات ترحيبية" : "Welcome Arabic coffee & sweets",
        isArabic ? "تحدي صندوق المفاجآت (دجاج، لحم بقري وروبيان)" : "Mystery box challenge (chicken, beef & prawns)",
        isArabic ? "استخدام جميع المعدات والمكونات" : "Use of all kitchen equipment and ingredients",
        isArabic ? "تجربة موجهة بإشراف فريق نون" : "Guided experience by the Noon team",
        isArabic ? "تقديم الحلوى والمشروبات بعد المسابقة" : "Dessert & drinks served after the competition",
        isArabic ? "اختياري: هدايا إضافية للفريق الفائز" : "Optional: additional gifts for the winning team",
      ],
      priceTiers: [],
      bookingHref: `/${locale}/group-booking-events/cooking-competition/book?package=premium`,
    },
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
              className="rounded-2xl border p-5 shadow-sm"
              style={{
                backgroundColor: processCardBackgroundColor,
                borderColor: processCardBorderColor,
              }}
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
          {packageCards.map((pkg) => {
            const isStandardPackage = pkg.key === "standard";

            return (
              <article
                key={pkg.key}
                className={`overflow-hidden rounded-2xl border bg-[color:var(--surface)] shadow-sm ${
                  isStandardPackage ? "border-teal/40" : "border-coral/40"
                }`}
              >
                <div
                  className={`border-b px-6 py-6 ${
                    isStandardPackage
                      ? "border-teal/30 bg-gradient-to-br from-teal/15 to-teal-light/5"
                      : "border-coral/30 bg-gradient-to-br from-coral/15 to-yellow/5"
                  }`}
                >
                  <h3 className="text-center text-xl font-semibold text-[color:var(--text)]">{pkg.title}</h3>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[color:var(--surface)]/85 px-3 py-3 text-center shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
                        {isArabic ? "المشاركون" : "Participants"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{pkg.participants}</p>
                    </div>
                    <div className="rounded-xl bg-[color:var(--surface)]/85 px-3 py-3 text-center shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-subtle)]">
                        {isArabic ? "السعر" : "Price"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[color:var(--text)]">{pkg.priceSummary}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-center">
                    <Link
                      href={pkg.bookingHref}
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
                        isStandardPackage ? "bg-teal hover:bg-teal/90" : "bg-coral hover:bg-coral/90"
                      }`}
                    >
                      {isArabic ? "اختر الباقة" : "Choose Package"}
                      <FiArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div className="space-y-2.5">
                    {pkg.details.map((detail) => (
                      <div
                        key={`${pkg.key}-${detail.label}`}
                        className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] pb-2 text-sm"
                      >
                        <span className="font-semibold text-[color:var(--text)]">{detail.label}</span>
                        <span className="text-right text-[color:var(--text-muted)]">{detail.value}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[color:var(--text)]">{isArabic ? "يشمل" : "Includes"}</h4>
                    <ul className="mt-2 space-y-2.5">
                      {pkg.includes.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
                          <FiCheckCircle className={`mt-0.5 size-4 shrink-0 ${isStandardPackage ? "text-teal" : "text-coral"}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {pkg.priceTiers.length > 0 && (
                    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/65 p-4">
                      <h4 className="text-sm font-semibold text-[color:var(--text)]">
                        {isArabic ? "قائمة الأسعار (للباقة القياسية)" : "Price List (Standard Package)"}
                      </h4>
                      <div className="mt-3 space-y-2">
                        {pkg.priceTiers.map((tier) => (
                          <div key={tier.range} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-[color:var(--text-muted)]">{tier.range}</span>
                            <span className="font-semibold text-[color:var(--text)]">{tier.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <CookingCompetitionPriceCalculator locale={locale} />
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
