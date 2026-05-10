import { isLocale, type Locale } from "@/lib/locale";
import { findTrainers, findTrainerProfiles } from "@/lib/db/trainers";
import Image from "next/image";
import Link from "next/link";
import { GiChefToque } from "react-icons/gi";

function getLocalizedTrainerName(
  locale: Locale,
  trainer: { fullName: string | null | undefined; displayNameEn?: string | null; displayNameAr?: string | null },
) {
  const displayNameEn = trainer.displayNameEn?.trim();
  const displayNameAr = trainer.displayNameAr?.trim();
  const fullName = String(trainer.fullName ?? "").trim();

  if (locale === "ar") {
    return displayNameAr || displayNameEn || fullName;
  }

  return displayNameEn || displayNameAr || fullName;
}

export default async function TrainersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const trainers = await findTrainers({ activeOnly: true });

  const profiles = await findTrainerProfiles(trainers.map((t) => t.id as string));

  const profileByUserId = new Map(
    profiles.map((profile) => [profile.userId, profile])
  );
  const visibleTrainers = trainers
    .map((trainer) => ({ trainer, profile: profileByUserId.get(trainer.id as string) ?? null }))
    .filter((entry) => entry.profile?.isActive)
    .sort((left, right) => {
      const leftOrder = left.profile?.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.profile?.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left.trainer.fullName).localeCompare(String(right.trainer.fullName));
    });

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
    <div className="min-h-screen bg-[color:var(--muted)] dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[color:var(--text)] dark:text-white">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
            {t.subtitle}
          </p>
        </div>

        {visibleTrainers.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <GiChefToque className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-4 text-[color:var(--text-muted)] dark:text-zinc-400">
              {t.noTrainers}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleTrainers.map(({ trainer, profile }) => {
              const localizedTrainerName = getLocalizedTrainerName(locale, {
                fullName: trainer.fullName,
                displayNameEn: profile?.displayNameEn ?? trainer.displayNameEn,
                displayNameAr: profile?.displayNameAr ?? trainer.displayNameAr,
              });

              return (
                <Link
                  key={trainer.id as string}
                  href={`/${locale}/trainers/${trainer.id}`}
                  className="group overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-coral to-coral-light">
                    {trainer.profileImage ? (
                      <Image
                        src={trainer.profileImage as string}
                        alt={localizedTrainerName}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <GiChefToque className="h-24 w-24 text-white opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-[color:var(--text)] dark:text-white">
                      {localizedTrainerName}
                    </h3>
                    {profile?.expertise && (profile.expertise as string[]).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(profile.expertise as string[]).slice(0, 2).map((exp) => (
                          <span
                            key={exp}
                            className="rounded-full bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral"
                          >
                            {exp}
                          </span>
                        ))}
                      </div>
                    )}
                    {profile?.experience && (
                      <p className="mt-2 text-sm text-[color:var(--text-muted)] dark:text-zinc-400">
                        {profile.experience} {t.experience}
                      </p>
                    )}
                    <div className="mt-4 text-sm font-semibold text-coral">
                      {t.viewProfile} →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
