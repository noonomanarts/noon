import { isLocale, type Locale } from "@/lib/locale";
import { prisma } from "@/lib/db/prisma";
import Image from "next/image";
import Link from "next/link";
import { GiChefToque } from "react-icons/gi";

export default async function TrainersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const trainers = await prisma.user.findMany({
    where: {
      role: "TRAINER",
      status: "ACTIVE",
    },
    select: {
      id: true,
      fullName: true,
      profileImage: true,
      email: true,
      phoneNumber: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });

  const profiles = await prisma.trainerProfile.findMany({
    where: {
      userId: { in: trainers.map((t) => t.id) },
      isActive: true,
    },
    select: {
      userId: true,
      bio: true,
      expertise: true,
      experience: true,
      socialLinks: true,
    },
  });

  const profileByUserId = new Map(
    profiles.map((profile) => [profile.userId, profile])
  );

  const t = {
    title: locale === "ar" ? "مدربونا" : "Our Trainers",
    subtitle:
      locale === "ar"
        ? "تعرف على فريق المدربين المحترفين في نون"
        : "Meet the professional trainers at Noon",
    viewProfile: locale === "ar" ? "عرض الملف" : "View Profile",
    expertise: locale === "ar" ? "التخصصات" : "Expertise",
    experience: locale === "ar" ? "سنوات الخبرة" : "Years of Experience",
    noTrainers:
      locale === "ar" ? "لا يوجد مدربون حالياً" : "No trainers available",
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {t.subtitle}
          </p>
        </div>

        {trainers.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <GiChefToque className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {t.noTrainers}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => {
              const profile = profileByUserId.get(trainer.id);
              return (
                <Link
                  key={trainer.id}
                  href={`/${locale}/trainers/${trainer.id}`}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                      {trainer.profileImage ? (
                        <Image
                          src={trainer.profileImage}
                          alt={trainer.fullName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <GiChefToque className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {trainer.fullName}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t.viewProfile}
                      </p>
                    </div>
                  </div>

                  {profile?.bio && (
                    <p className="mt-4 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {profile.bio}
                    </p>
                  )}

                  {profile?.expertise?.length ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {t.expertise}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profile.expertise.slice(0, 4).map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {profile?.experience ? (
                    <div className="mt-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {t.experience}: {profile.experience}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
