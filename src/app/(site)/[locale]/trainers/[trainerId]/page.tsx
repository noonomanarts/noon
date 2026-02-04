import { isLocale, type Locale } from "@/lib/locale";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MdEmail, MdPhone } from "react-icons/md";
import { GiChefToque } from "react-icons/gi";
import { HiSparkles } from "react-icons/hi2";
import { findTrainerById, findTrainerClasses } from "@/lib/db/trainers";
import { findClassSessions } from "@/lib/db/classes";

export default async function TrainerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; trainerId: string }>;
}) {
  const { locale: rawLocale, trainerId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Fetch trainer data
  const trainer = await findTrainerById(trainerId);

  if (!trainer || trainer.status !== "ACTIVE") {
    notFound();
  }

  // Fetch trainer's classes
  const classes = await findTrainerClasses(trainerId, { publishedOnly: true });

  // Get sessions for each class
  const classesWithSessions = await Promise.all(
    classes.map(async (cls) => {
      const sessions = await findClassSessions(cls.id as string, {
        upcomingOnly: true,
        limit: 3,
      });
      return { ...cls, sessions };
    })
  );

  // Separate upcoming and previous classes
  const upcomingClasses = classesWithSessions.filter((c) => c.sessions.length > 0);
  const previousClasses = classesWithSessions.filter((c) => c.sessions.length === 0);

  const t = {
    trainer: locale === "ar" ? "المدرب" : "Trainer",
    aboutTrainer: locale === "ar" ? "نبذة عن المدرب" : "About the Trainer",
    upcomingClasses: locale === "ar" ? "الدورات القادمة" : "Upcoming Classes",
    previousClasses: locale === "ar" ? "الدورات السابقة" : "Previous Classes",
    bookNow: locale === "ar" ? "احجز الآن" : "Book Now",
    moreDetails: locale === "ar" ? "المزيد من التفاصيل" : "More Details",
    noUpcomingClasses: locale === "ar" ? "لا توجد دورات قادمة حالياً" : "No upcoming classes at the moment",
    noPreviousClasses: locale === "ar" ? "لا توجد دورات سابقة" : "No previous classes",
    perClass: locale === "ar" ? "للدورة" : "per class",
    reviews: locale === "ar" ? "تقييم" : "reviews",
    duration: locale === "ar" ? "المدة" : "Duration",
    minutes: locale === "ar" ? "دقيقة" : "minutes",
    category: locale === "ar" ? "الفئة" : "Category",
    cooking: locale === "ar" ? "الطبخ" : "Cooking",
    artsCrafts: locale === "ar" ? "الفنون والحرف" : "Arts & Crafts",
    contactInfo: locale === "ar" ? "معلومات التواصل" : "Contact Information",
  };

  // Mock trainer bio - in production this would come from database
  const trainerBio = locale === "ar" 
    ? `${trainer.fullName} هو/هي مدرب محترف مع سنوات من الخبرة في تقديم دورات تدريبية عالية الجودة. متخصص في تعليم تقنيات الطهي الحديثة والتقليدية، ويسعى دائماً لإلهام الطلاب وتطوير مهاراتهم.`
    : `${trainer.fullName} is a professional trainer with years of experience in delivering high-quality training sessions. Specialized in teaching modern and traditional culinary techniques, always striving to inspire students and develop their skills.`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        {/* Trainer Header Card */}
        <div className="mb-12 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* Profile Image */}
            <div className="lg:col-span-2">
              <div className="relative aspect-square w-full overflow-hidden lg:aspect-[4/5]">
                {trainer.profileImage ? (
                  <Image
                    src={trainer.profileImage as string}
                    alt={trainer.fullName as string}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral to-coral-light">
                    <GiChefToque className="h-48 w-48 text-white opacity-50" />
                  </div>
                )}
              </div>
            </div>

            {/* Trainer Info */}
            <div className="space-y-6 p-8 lg:col-span-3">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-coral/10 px-4 py-2 text-sm font-semibold text-coral">
                  <GiChefToque className="h-5 w-5" />
                  {t.trainer}
                </div>
                <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {trainer.fullName}
                </h1>
              </div>

              {/* Bio */}
              <div className="rounded-xl border-2 border-coral/20 bg-coral/5 p-6 dark:border-coral/30 dark:bg-coral/10">
                <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
                  <HiSparkles className="h-6 w-6 text-coral" />
                  {t.aboutTrainer}
                </h2>
                <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {trainerBio}
                </p>
              </div>

              {/* Contact Info */}
              {(trainer.email || trainer.phoneNumber) && (
                <div className="space-y-3">
                  <h3 className="font-bold text-zinc-900 dark:text-white">{t.contactInfo}</h3>
                  {trainer.email && (
                    <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                      <MdEmail className="h-5 w-5 text-purple" />
                      <span>{trainer.email}</span>
                    </div>
                  )}
                  {trainer.phoneNumber && (
                    <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                      <MdPhone className="h-5 w-5 text-teal" />
                      <span>{trainer.phoneNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 p-4 text-center dark:from-teal-900/30 dark:to-teal-800/30">
                  <div className="mb-1 text-3xl font-bold text-teal">
                    {classes.length}
                  </div>
                  <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {locale === "ar" ? "دورة" : "Classes"}
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 text-center dark:from-yellow-900/30 dark:to-yellow-800/30">
                  <div className="mb-1 text-3xl font-bold text-yellow">
                    {upcomingClasses.length}
                  </div>
                  <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {locale === "ar" ? "قادمة" : "Upcoming"}
                  </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-coral-50 to-coral-100 p-4 text-center dark:from-coral-900/30 dark:to-coral-800/30">
                  <div className="mb-1 text-3xl font-bold text-coral">
                    {previousClasses.length}
                  </div>
                  <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {locale === "ar" ? "سابقة" : "Previous"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Classes Section */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">
            {t.upcomingClasses}
          </h2>
          {upcomingClasses.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">{t.noUpcomingClasses}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingClasses.map((cls) => (
                <Link
                  key={cls.id as string}
                  href={`/${locale}/classes/${cls.slug}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {cls.image && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={cls.image as string}
                        alt={cls.title as string}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {locale === "ar" && cls.titleAr ? cls.titleAr : cls.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-2xl font-bold text-coral">
                        {cls.price} {cls.currency}
                      </span>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {t.bookNow}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Previous Classes Section */}
        <section>
          <h2 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">
            {t.previousClasses}
          </h2>
          {previousClasses.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-600 dark:text-zinc-400">{t.noPreviousClasses}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {previousClasses.map((cls) => (
                <Link
                  key={cls.id as string}
                  href={`/${locale}/classes/${cls.slug}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {cls.image && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={cls.image as string}
                        alt={cls.title as string}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {locale === "ar" && cls.titleAr ? cls.titleAr : cls.title}
                    </h3>
                    <div className="mt-2 text-sm font-semibold text-coral">
                      {t.moreDetails} →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
