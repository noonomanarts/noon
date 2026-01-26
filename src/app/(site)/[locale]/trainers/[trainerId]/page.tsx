import { isLocale, type Locale } from "@/lib/locale";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MdEmail, MdPhone, MdLocationOn } from "react-icons/md";
import { IoLogoInstagram, IoLogoFacebook, IoLogoLinkedin } from "react-icons/io5";
import { GiChefToque, GiCookingPot } from "react-icons/gi";
import { BiSolidStar } from "react-icons/bi";
import { HiSparkles } from "react-icons/hi2";
import { prisma } from "@/lib/db/prisma";

export default async function TrainerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; trainerId: string }>;
}) {
  const { locale: rawLocale, trainerId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Fetch trainer data
  const trainer = await prisma.user.findUnique({
    where: {
      id: trainerId,
      role: "TRAINER",
      status: "ACTIVE",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      profileImage: true,
      dateOfBirth: true,
      gender: true,
    },
  });

  if (!trainer) {
    notFound();
  }

  // Fetch trainer's classes
  const classes = await prisma.class.findMany({
    where: {
      trainerId: trainerId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      titleAr: true,
      description: true,
      descriptionAr: true,
      category: true,
      subCategory: true,
      image: true,
      price: true,
      currency: true,
      durationMinutes: true,
      sessions: {
        where: {
          startDateTime: {
            gte: new Date(),
          },
          isCancelled: false,
        },
        orderBy: {
          startDateTime: "asc",
        },
        take: 3,
      },
      _count: {
        select: {
          reviews: {
            where: {
              isApproved: true,
            },
          },
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  // Separate upcoming and previous classes
  const upcomingClasses = classes.filter((c) => c.sessions.length > 0);
  const previousClasses = classes.filter((c) => c.sessions.length === 0);

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
                    src={trainer.profileImage}
                    alt={trainer.fullName}
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
                    {classes.reduce((sum, c) => sum + c._count.reviews, 0)}
                  </div>
                  <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {t.reviews}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Classes */}
        {upcomingClasses.length > 0 && (
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <GiCookingPot className="h-8 w-8 text-coral" />
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                {t.upcomingClasses}
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingClasses.map((classItem) => (
                <Link
                  key={classItem.id}
                  href={`/${locale}/classes/${classItem.slug}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Image */}
                  <div className="relative aspect-video w-full overflow-hidden">
                    {classItem.image ? (
                      <Image
                        src={classItem.image}
                        alt={locale === "ar" ? classItem.titleAr || classItem.title : classItem.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                        <GiCookingPot className="h-16 w-16 text-zinc-400" />
                      </div>
                    )}
                    {/* Category Badge */}
                    <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold backdrop-blur-sm dark:bg-zinc-900/90">
                      <span className="text-coral">
                        {classItem.category === "COOKING" ? t.cooking : t.artsCrafts}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="mb-3 text-xl font-bold text-zinc-900 dark:text-white">
                      {locale === "ar" ? classItem.titleAr || classItem.title : classItem.title}
                    </h3>
                    <p className="mb-4 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {locale === "ar" ? classItem.descriptionAr || classItem.description : classItem.description}
                    </p>

                    {/* Details */}
                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <BiSolidStar className="h-4 w-4 text-yellow" />
                        <span>
                          {classItem._count.reviews} {t.reviews}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <GiCookingPot className="h-4 w-4 text-teal" />
                        <span>
                          {classItem.durationMinutes} {t.minutes}
                        </span>
                      </div>
                    </div>

                    {/* Price & Button */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-coral">
                          {classItem.price} {classItem.currency}
                        </div>
                        <div className="text-xs text-zinc-500">{t.perClass}</div>
                      </div>
                      <button className="rounded-xl bg-gradient-to-r from-coral to-coral-light px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl">
                        {t.bookNow}
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {upcomingClasses.length === 0 && (
          <div className="mb-12 rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <GiCookingPot className="mx-auto mb-4 h-16 w-16 text-zinc-400" />
            <p className="text-lg text-zinc-600 dark:text-zinc-400">{t.noUpcomingClasses}</p>
          </div>
        )}

        {/* Previous Classes */}
        {previousClasses.length > 0 && (
          <section>
            <div className="mb-6 flex items-center gap-3">
              <HiSparkles className="h-8 w-8 text-purple" />
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                {t.previousClasses}
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {previousClasses.map((classItem) => (
                <Link
                  key={classItem.id}
                  href={`/${locale}/classes/${classItem.slug}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg transition-all hover:scale-105 hover:shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Image */}
                  <div className="relative aspect-video w-full overflow-hidden">
                    {classItem.image ? (
                      <Image
                        src={classItem.image}
                        alt={locale === "ar" ? classItem.titleAr || classItem.title : classItem.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                        <GiCookingPot className="h-16 w-16 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="mb-3 text-xl font-bold text-zinc-900 dark:text-white">
                      {locale === "ar" ? classItem.titleAr || classItem.title : classItem.title}
                    </h3>
                    <p className="mb-4 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {locale === "ar" ? classItem.descriptionAr || classItem.description : classItem.description}
                    </p>

                    <button className="w-full rounded-xl border-2 border-purple px-6 py-3 font-bold text-purple transition-all hover:scale-105 hover:bg-purple hover:text-white">
                      {t.moreDetails}
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
