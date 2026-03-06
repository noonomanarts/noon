import { isLocale, type Locale } from "@/lib/locale";
import Image from "next/image";
import Link from "next/link";
import { GiChefToque } from "react-icons/gi";
import { MdCalendarMonth, MdAccessTime, MdPerson } from "react-icons/md";
import { HiSparkles } from "react-icons/hi2";
import { findManyClasses, findClassSessions } from "@/lib/db/classes";
import { ClassCategory } from "@/lib/db/types";

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
  sessions: {
    id: string;
    startTime: Date;
    seatsAvailable: number;
  }[];
};

function ClassCard({
  cls,
  locale,
  t,
  formatDate,
  formatTime,
}: {
  cls: ClassWithSessions;
  locale: Locale;
  t: Record<string, string>;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      {/* Image */}
      <div className="relative h-56 w-full overflow-hidden">
        {cls.image ? (
          <Image
            src={cls.image}
            alt={cls.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral to-coral-light">
            <GiChefToque className="h-24 w-24 text-white opacity-50" />
          </div>
        )}
        {/* Price Badge */}
        <div className="absolute bottom-4 right-4 rounded-full bg-white/95 px-4 py-2 font-bold text-coral shadow-lg backdrop-blur-sm dark:bg-zinc-900/95">
          {cls.price} {cls.currency}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="mb-3 text-xl font-bold text-zinc-900 dark:text-white">
          {locale === "ar" && cls.titleAr ? cls.titleAr : cls.title}
        </h3>

        {cls.description && (
          <p className="mb-4 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {locale === "ar" && cls.descriptionAr ? cls.descriptionAr : cls.description}
          </p>
        )}

        {/* Duration */}
        {cls.durationMinutes && (
          <div className="mb-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <MdAccessTime className="h-4 w-4 text-teal" />
            <span>
              {t.duration}: {cls.durationMinutes} {t.minutes}
            </span>
          </div>
        )}

        {/* Upcoming Sessions */}
        {cls.sessions.length > 0 && (
          <div className="mb-4 space-y-2">
            {cls.sessions.slice(0, 2).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
              >
                <div className="flex items-center gap-2 text-sm">
                  <MdCalendarMonth className="h-4 w-4 text-purple" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {formatDate(session.startTime)} - {formatTime(session.startTime)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
                  <MdPerson className="h-4 w-4" />
                  <span>
                    {session.seatsAvailable} {t.available}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Book Now Button */}
        <Link
          href={`/${locale}/classes/${cls.slug}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-coral to-coral-light px-6 py-3 font-bold text-white transition-all hover:opacity-90 hover:shadow-lg"
        >
          <HiSparkles className="h-5 w-5" />
          {t.bookNow}
        </Link>
      </div>
    </div>
  );
}

function SubCategorySection({
  title,
  classes,
  locale,
  t,
  formatDate,
  formatTime,
}: {
  title: string;
  classes: ClassWithSessions[];
  locale: Locale;
  t: Record<string, string>;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
}) {
  if (classes.length === 0) return null;

  return (
    <section className="mb-16">
      <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-zinc-900 dark:text-white">
        <span className="rounded-xl bg-coral/10 p-3">
          <GiChefToque className="h-7 w-7 text-coral" />
        </span>
        {title}
      </h2>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            cls={cls}
            locale={locale}
            t={t}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        ))}
      </div>
    </section>
  );
}

export default async function CookingClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Fetch cooking classes
  const classes = await findManyClasses({
    category: ClassCategory.COOKING,
    status: "PUBLISHED",
  });

  // Get upcoming sessions for each class
  const classesWithSessions: ClassWithSessions[] = await Promise.all(
    classes.map(async (cls) => {
      const sessions = await findClassSessions(cls.id as string, {
        upcomingOnly: true,
        limit: 3,
      });
      return {
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
        sessions,
      };
    })
  );

  // Group classes by sub-category
  const subCategories = {
    APPETIZERS: classesWithSessions.filter(
      (c) => c.subCategory === "APPETIZERS_SNACKS" || c.subCategory === "APPETIZERS"
    ),
    MAIN_DISHES: classesWithSessions.filter((c) => c.subCategory === "MAIN_DISHES"),
    DESSERTS: classesWithSessions.filter(
      (c) => c.subCategory === "DESSERTS_BAKING" || c.subCategory === "DESSERTS"
    ),
    MOM_AND_KID: classesWithSessions.filter((c) => c.subCategory === "MOM_AND_KID"),
    OTHER: classesWithSessions.filter(
      (c) =>
        !["APPETIZERS_SNACKS", "APPETIZERS", "MAIN_DISHES", "DESSERTS_BAKING", "DESSERTS", "MOM_AND_KID"].includes(
          c.subCategory as string
        )
    ),
  };

  const t: Record<string, string> = {
    title: locale === "ar" ? "دروس الطبخ" : "Cooking Classes",
    subtitle:
      locale === "ar"
        ? "اكتشف فن الطهي مع مدربينا المحترفين"
        : "Discover the art of cooking with our professional trainers",
    appetizers: locale === "ar" ? "المقبلات والوجبات الخفيفة" : "Appetizers & Snacks",
    mainDishes: locale === "ar" ? "الأطباق الرئيسية" : "Main Dishes",
    desserts: locale === "ar" ? "الحلويات والمخبوزات" : "Desserts & Baking",
    momAndKid: locale === "ar" ? "الأم والطفل" : "Mom & Kid",
    other: locale === "ar" ? "أخرى" : "Other",
    bookNow: locale === "ar" ? "احجز الآن" : "Book Now",
    perPerson: locale === "ar" ? "للشخص" : "per person",
    seats: locale === "ar" ? "مقاعد" : "seats",
    available: locale === "ar" ? "متاح" : "available",
    noClasses:
      locale === "ar"
        ? "لا توجد دروس متاحة حالياً في هذه الفئة"
        : "No classes available in this category at the moment",
    duration: locale === "ar" ? "المدة" : "Duration",
    minutes: locale === "ar" ? "دقيقة" : "min",
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(locale === "ar" ? "ar-OM" : "en-OM", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString(locale === "ar" ? "ar-OM" : "en-OM", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-coral to-coral-light py-20">
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/20 px-6 py-3 text-lg font-semibold text-white backdrop-blur-sm">
            <GiChefToque className="h-7 w-7" />
            {t.title}
          </div>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            {t.title}
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-white/90">{t.subtitle}</p>
        </div>
      </div>

      {/* Classes */}
      <div className="mx-auto max-w-7xl px-4 py-16">
        <SubCategorySection
          title={t.appetizers}
          classes={subCategories.APPETIZERS}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <SubCategorySection
          title={t.mainDishes}
          classes={subCategories.MAIN_DISHES}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <SubCategorySection
          title={t.desserts}
          classes={subCategories.DESSERTS}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <SubCategorySection
          title={t.momAndKid}
          classes={subCategories.MOM_AND_KID}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />
        <SubCategorySection
          title={t.other}
          classes={subCategories.OTHER}
          locale={locale}
          t={t}
          formatDate={formatDate}
          formatTime={formatTime}
        />

        {classesWithSessions.length === 0 && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <GiChefToque className="mx-auto mb-4 h-16 w-16 text-zinc-400" />
            <p className="text-xl text-zinc-600 dark:text-zinc-400">{t.noClasses}</p>
          </div>
        )}
      </div>
    </div>
  );
}
