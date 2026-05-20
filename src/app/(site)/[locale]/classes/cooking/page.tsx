import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { FiArrowRight, FiBookOpen, FiCalendar, FiUser } from "react-icons/fi";
import { GiChefToque } from "react-icons/gi";
import { HiOutlineBanknotes } from "react-icons/hi2";

import { findManyClasses } from "@/lib/db/classes";
import { getClassRepeatRequestSummaries } from "@/lib/db/classRepeatRequests";
import { ClassCategory } from "@/lib/db/types";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { isLocale, type Locale } from "@/lib/locale";
import { getPublicSitePageSettings } from "@/lib/sitePageSettings";
import ClassListingHeader from "@/components/site/ClassListingHeader";
import RequestRepeatButton from "@/components/site/RequestRepeatButton";
import { getUserById } from "@/lib/db/users";

const DISPLAY_TIMEZONE = "Asia/Muscat";

function getCurrentTimestamp(): number {
  return new Date().getTime();
}

function hasWorkshopEnded(cls: { status: string; endDateTime: Date | string | null }): boolean {
  return cls.status === "COMPLETED"
    || (cls.endDateTime ? new Date(cls.endDateTime).getTime() < getCurrentTimestamp() : false);
}

type ClassWithSessions = {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  subCategory: string | null;
  image: string | null;
  price: number;
  currency: string;
  durationMinutes: number | null;
  trainer: { id: string; fullName: string; profileImage: string | null } | null;
  startDateTime: Date | null;
  endDateTime: Date | null;
  status: string;
};

function ClassCard({
  cls,
  locale,
  t,
  subCategoryLabel,
  formatDate,
  formatTime,
  isEnded,
  repeatRequestsCount,
  requestedByCurrentUser,
}: {
  cls: ClassWithSessions;
  locale: Locale;
  t: Record<string, string>;
  subCategoryLabel: string;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  isEnded: boolean;
  repeatRequestsCount: number;
  requestedByCurrentUser: boolean;
}) {
  const title = locale === "ar" && cls.titleAr ? cls.titleAr : cls.title;
  const trainerName = cls.trainer?.fullName ?? null;
  const datetimeText = cls.startDateTime
    ? `${formatDate(cls.startDateTime)} · ${formatTime(cls.startDateTime)}`
    : t.noUpcomingSessions;
  const priceText = formatAmountWithCurrency(cls.price, cls.currency);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/${locale}/classes/${cls.slug}`} className="relative block aspect-[4/5] overflow-hidden sm:aspect-[3/4]" aria-label={title}>
        {cls.image ? (
          <Image
            src={cls.image}
            alt={title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[color:var(--muted)]">
            <GiChefToque className="h-20 w-20 text-[color:var(--text-subtle)]" />
          </div>
        )}
        <span
          className={`absolute top-2 inline-flex max-w-[74%] items-center gap-1 bg-black/65 px-1.5 py-1 text-[9px] font-medium text-white backdrop-blur-sm sm:top-3 sm:gap-1.5 sm:px-3 sm:text-xs ${
            locale === "ar" ? "left-3" : "right-3"
          }`}
        >
          <GiChefToque className="size-3 shrink-0 text-yellow-300 sm:size-3.5" />
          <span className="truncate">{subCategoryLabel}</span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col space-y-2 p-3 sm:space-y-3 sm:p-5">
        <h3 className="line-clamp-2 inline-flex items-start gap-1 text-[12px] font-semibold leading-[1.3] text-[color:var(--text)] sm:gap-2 sm:text-lg sm:leading-6">
          <FiBookOpen className="mt-0.5 size-3 shrink-0 text-purple-500 sm:size-4" />
          <span>{title}</span>
        </h3>
        {!isEnded ? (
          <p className="inline-flex items-center gap-1 text-[10px] font-medium leading-4 text-[color:var(--text)] sm:gap-2 sm:text-base">
            <FiCalendar className="size-3.5 shrink-0 text-teal-500 sm:size-5" />
            {datetimeText}
          </p>
        ) : null}
        {trainerName ? (
          <p className="inline-flex items-center gap-1 text-[9px] leading-4 text-[color:var(--text-muted)] sm:gap-2 sm:text-sm">
            <FiUser className="size-3 shrink-0 text-indigo-500 sm:size-4" />
            {trainerName}
          </p>
        ) : null}
        <div className="mt-auto pt-2">
          <p className="mb-2 inline-flex items-center gap-1 text-[18px] font-black leading-none text-[color:var(--text)] sm:mb-3 sm:gap-2 sm:text-3xl">
            <HiOutlineBanknotes className="size-4.5 shrink-0 text-emerald-600 sm:size-6" />
            {priceText}
          </p>
          {isEnded ? (
            <RequestRepeatButton
              classId={cls.id}
              locale={locale}
              initialCount={repeatRequestsCount}
              initialRequested={requestedByCurrentUser}
              compact
            />
          ) : (
            <Link
              href={`/${locale}/classes/${cls.slug}`}
              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[color:var(--primary)] px-2.5 py-1.5 text-[10px] font-semibold leading-tight tracking-[0.01em] text-[color:var(--primary-foreground)] transition hover:brightness-95 sm:px-4 sm:py-3 sm:text-sm"
            >
              {t.bookNow}
              <FiArrowRight className="size-3 sm:size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function getSubCategoryLabel(subCategory: string | null, t: Record<string, string>): string {
  if (subCategory === "APPETIZERS_SNACKS" || subCategory === "APPETIZERS") return t.appetizers;
  if (subCategory === "MAIN_DISHES") return t.mainDishes;
  if (subCategory === "DESSERTS_BAKING" || subCategory === "DESSERTS") return t.desserts;
  if (subCategory === "MOM_AND_KID") return t.momAndKid;
  return t.other;
}

export default async function CookingClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const isArabic = locale === "ar";
  const pageSettings = await getPublicSitePageSettings("classes_cooking");
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;
  const currentUser = sessionId ? await getUserById(sessionId) : null;

  const classes = await findManyClasses({
    category: ClassCategory.COOKING,
    status: ["PUBLISHED", "COMPLETED"],
  });

  const classesWithSessions: ClassWithSessions[] = classes.map((cls) => ({
    id: cls.id as string,
    slug: cls.slug as string,
    title: cls.title as string,
    titleAr: cls.titleAr as string | null,
    description: cls.description as string | null,
    descriptionAr: cls.descriptionAr as string | null,
    subCategory: cls.subCategory as string | null,
    image: cls.image as string | null,
    price: cls.price as number,
    currency: cls.currency as string,
    durationMinutes: cls.durationMinutes as number | null,
    trainer: cls.trainer ? { id: cls.trainer.id, fullName: cls.trainer.fullName, profileImage: cls.trainer.profileImage } : null,
    startDateTime: cls.startDateTime ?? null,
    endDateTime: cls.endDateTime ?? null,
    status: cls.status,
  }));

  const repeatSummaries = await getClassRepeatRequestSummaries(
    classesWithSessions.map((cls) => cls.id),
    currentUser?.id ?? null
  );

  const t: Record<string, string> = {
    title: isArabic ? "ورش الطبخ" : "Cooking Classes",
    subtitle: isArabic
      ? "برامج عملية بمستويات مختلفة من الأساسيات حتى الإتقان."
      : "Hands-on programs for every level, from fundamentals to mastery.",
    appetizers: isArabic ? "المقبلات والوجبات الخفيفة" : "Appetizers & Snacks",
    mainDishes: isArabic ? "الأطباق الرئيسية" : "Main Dishes",
    desserts: isArabic ? "الحلويات والمخبوزات" : "Desserts & Baking",
    momAndKid: isArabic ? "الأم والطفل" : "Mom & Kid",
    other: isArabic ? "أخرى" : "Other",
    bookNow: isArabic ? "احجز" : "Book",
    noClasses: isArabic
      ? "لا توجد دروس طبخ منشورة حالياً."
      : "No published cooking classes right now.",
    activeClasses: isArabic ? "الورش النشطة" : "Active Workshops",
    endedClasses: isArabic ? "ورش منتهية" : "Ended Workshops",
    endedSubtitle: isArabic ? "اطلب إعادتها." : "Request a repeat.",
    duration: isArabic ? "المدة" : "Duration",
    minutes: isArabic ? "دقيقة" : "min",
    noUpcomingSessions: isArabic ? "لا مواعيد" : "No dates",
    workshopEnded: isArabic ? "انتهت الورشة" : "Workshop ended",
    backToClasses: isArabic ? "رجوع" : "Back",
  };

  const pageTitle = (isArabic ? pageSettings?.headingAr : pageSettings?.headingEn)?.trim() || t.title;
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(isArabic ? "ar-OM-u-nu-latn" : "en-OM", {
      month: "short",
      day: "numeric",
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString(isArabic ? "ar-OM-u-nu-latn" : "en-OM", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: DISPLAY_TIMEZONE,
    });
  };

  const activeClasses = classesWithSessions.filter(
    (cls) => cls.status === "PUBLISHED" && !hasWorkshopEnded(cls)
  );
  const endedClasses = classesWithSessions
    .filter((cls) => hasWorkshopEnded(cls))
    .sort((a, b) => {
      const aTime = a.endDateTime ? new Date(a.endDateTime).getTime() : 0;
      const bTime = b.endDateTime ? new Date(b.endDateTime).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div className="route-sharp pb-14">
      <ClassListingHeader
        locale={locale}
        title={pageTitle}
        backgroundColor={pageSettings?.classListingHero.backgroundColor || "#cb8578"}
        textColor={pageSettings?.classListingHero.textColor || "#ffffff"}
        slideImages={pageSettings?.classListingHero.slideImages || ["/images/cooking.png"]}
        autoplayMs={pageSettings?.classListingHero.autoplayMs}
        backLabel={t.backToClasses}
      />

      <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col gap-12 px-4">
        {classesWithSessions.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-12 text-center shadow-sm">
            <GiChefToque className="mx-auto mb-4 h-16 w-16 text-[color:var(--text-subtle)]" />
            <p className="text-base text-[color:var(--text-muted)]">{t.noClasses}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {activeClasses.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.activeClasses}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-3">
                  {activeClasses.map((cls) => (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      locale={locale}
                      t={t}
                      subCategoryLabel={getSubCategoryLabel(cls.subCategory, t)}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      isEnded={false}
                      repeatRequestsCount={repeatSummaries[cls.id]?.requestsCount ?? 0}
                      requestedByCurrentUser={repeatSummaries[cls.id]?.requestedByCurrentUser ?? false}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {endedClasses.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[color:var(--text)]">{t.endedClasses}</h2>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t.endedSubtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-3">
                  {endedClasses.map((cls) => (
                    <ClassCard
                      key={cls.id}
                      cls={cls}
                      locale={locale}
                      t={t}
                      subCategoryLabel={getSubCategoryLabel(cls.subCategory, t)}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      isEnded
                      repeatRequestsCount={repeatSummaries[cls.id]?.requestsCount ?? 0}
                      requestedByCurrentUser={repeatSummaries[cls.id]?.requestedByCurrentUser ?? false}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
