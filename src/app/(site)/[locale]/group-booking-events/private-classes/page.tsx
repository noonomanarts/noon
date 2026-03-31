import Link from "next/link";
import { FiArrowRight, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import { GiChefToque, GiPalette } from "react-icons/gi";

import PrivateArtsCraftsQuickPriceCalculator from "@/components/site/PrivateArtsCraftsQuickPriceCalculator";
import PrivateCookingQuickPriceCalculator from "@/components/site/PrivateCookingQuickPriceCalculator";
import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";

function isVideoSource(source: string): boolean {
  const normalized = source.trim().toLowerCase();
  if (!normalized) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/.test(normalized);
}

export default async function PrivateClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";
  const pageSettings = await getPublicSitePageSettings("events_private_classes");

  const t = {
    title: isArabic ? "الدروس الخاصة" : "Private Classes",
    processTitle: isArabic ? "كيف تسير التجربة" : "How the Experience Works",
    packageTitle: isArabic ? "أنواع الجلسات" : "Session Types",
    readyTitle: isArabic ? "جاهزون لجلسة خاصة؟" : "Ready for a Private Session?",
    readySubtitle: isArabic
      ? "احجز الموعد الأنسب وسيقوم فريق نون بتأكيد جميع التفاصيل معك."
      : "Book your preferred date and the Noon team will confirm all details with you.",
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
    headerMedia = "/images/art.png";
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
      title: isArabic ? "الاستماع لشرح المدربة" : "Choose Track",
      desc: isArabic
        ? "اختيار جلسة طبخ أو فنون وأشغال حسب هدف المجموعة."
        : "Select either cooking or arts & crafts based on group goals.",
      icon: GiChefToque,
    },
    {
      title: isArabic ? "التطبيق العملي" : "Hands-On Session",
      desc: isArabic
        ? "تنفيذ الخطوات عملياً."
        : "Run a practical, guided session with the Noon team.",
      icon: GiPalette,
    },
    {
      title: isArabic ? "تذوق الطبخة وتبادل الآراء" : "Wrap-up",
      desc: isArabic ? "تذوق الطبخة وتبادل الآراء." : "Review outcomes and enjoy closing refreshments.",
      icon: FiCheckCircle,
    },
  ];

  const packageCards = [
    {
      key: "cooking" as const,
      title: isArabic ? "جلسة طبخ خاصة" : "Private Cooking Class",
      participants: isArabic ? "6-32 مشارك" : "6-32 participants",
      priceSummary: isArabic ? "ابتداءً من 17 ر.ع / شخص" : "From 17 OMR / person",
      details: [
        {
          label: isArabic ? "مثالية لـ" : "Ideal for",
          value: isArabic ? "الشركات، الأصدقاء، وبناء الفريق" : "Corporate groups, friends, and team building",
        },
        {
          label: isArabic ? "عدد المشاركين" : "Group Size",
          value: isArabic ? "6-32 مشارك" : "6-32 participants",
        },
        { label: isArabic ? "المدة" : "Duration", value: isArabic ? "2-3 ساعات" : "2-3 hours" },
        {
          label: isArabic ? "نمط الجلسة" : "Session Format",
          value: isArabic ? "1-2 مشارك لكل محطة" : "1-2 participants per station",
        },
      ],
      includes: [
        isArabic ? "قهوة عربية وحلويات ترحيبية" : "Welcome Arabic coffee & sweets",
        isArabic ? "جميع المكونات والمعدات مشمولة" : "All ingredients and kitchen equipment included",
        isArabic ? "إشراف مباشر من فريق نون" : "Guided by the Noon team",
        isArabic ? "اختيار الطبق مسبقاً حسب مستوى المجموعة" : "Dish planning based on group level",
      ],
      bookingHref: `/${locale}/group-booking-events/private-classes/book?type=cooking`,
    },
    {
      key: "arts-crafts" as const,
      title: isArabic ? "جلسة فنون وأشغال خاصة" : "Private Arts & Crafts Class",
      participants: isArabic ? "6+ مشارك" : "6+ participants",
      priceSummary: isArabic ? "ابتداءً من 15 ر.ع / شخص" : "From 15 OMR / person",
      details: [
        {
          label: isArabic ? "مثالية لـ" : "Ideal for",
          value: isArabic ? "مجموعات الشركات، الأصدقاء، وبناء الفريق" : "Corporate groups, friends, and team building",
        },
        {
          label: isArabic ? "عدد المشاركين" : "Group Size",
          value: isArabic
            ? "6-12 في مركز نون، وأكثر من 12 في موقع بديل مناسب"
            : "6-12 at Noon Center; above 12 at an alternative suitable venue",
        },
        { label: isArabic ? "المدة" : "Duration", value: isArabic ? "2-3 ساعات" : "2-3 hours" },
        {
          label: isArabic ? "نمط الجلسة" : "Session Format",
          value: isArabic ? "فردي" : "Individual",
        },
      ],
      includes: [
        isArabic ? "قهوة عربية وحلويات ترحيبية" : "Welcome Arabic coffee & sweets",
        isArabic ? "جميع أدوات وخامات الفنون مشمولة" : "All arts tools and materials included",
        isArabic ? "تجربة إبداعية موجهة بإشراف فريق نون" : "Creative guided experience by the Noon team",
        isArabic ? "اختيار المشروع وفق هدف المجموعة" : "Project selection tailored to your goals",
        isArabic
          ? "للمجموعات الأكبر من 12 قد يتطلب الأمر موقعاً خارجياً، وتضاف تكلفة الإيجار على السعر النهائي"
          : "For groups above 12, an external venue may be required and rental cost is added to final workshop price",
      ],
      bookingHref: `/${locale}/group-booking-events/private-classes/book?type=arts-crafts`,
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
            const isCookingClass = pkg.key === "cooking";

            return (
              <article
                key={pkg.key}
                className={`overflow-hidden rounded-2xl border bg-[color:var(--surface)] shadow-sm ${
                  isCookingClass ? "border-teal/40" : "border-coral/40"
                }`}
              >
                <div
                  className={`border-b px-6 py-6 ${
                    isCookingClass
                      ? "border-teal/30 bg-gradient-to-br from-teal/15 to-teal-light/5"
                      : "border-coral/30 bg-gradient-to-br from-coral/15 to-yellow/5"
                  }`}
                >
                  <h3 className="text-center text-xl font-semibold text-[color:var(--text)]">{pkg.title}</h3>

                  {isCookingClass ? (
                    <PrivateCookingQuickPriceCalculator locale={locale} />
                  ) : (
                    <>
                      <PrivateArtsCraftsQuickPriceCalculator locale={locale} />
                    </>
                  )}
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
                          <FiCheckCircle className={`mt-0.5 size-4 shrink-0 ${isCookingClass ? "text-teal" : "text-coral"}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4">
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-sm">
          <h3 className="text-2xl font-semibold text-[color:var(--text)]">{t.readyTitle}</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[color:var(--text-muted)]">{t.readySubtitle}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[color:var(--text-subtle)]">
            <span className="inline-flex items-center gap-1">
              <FiUsers className="size-3.5" />
              {isArabic ? "6+ مشارك" : "6+ participants"}
            </span>
            <span className="inline-flex items-center gap-1">
              <FiClock className="size-3.5" />
              {isArabic ? "2-3 ساعات" : "2-3 hours"}
            </span>
          </div>
          <div className="mt-6">
            <Link
              href={`/${locale}/group-booking-events/private-classes/book`}
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
