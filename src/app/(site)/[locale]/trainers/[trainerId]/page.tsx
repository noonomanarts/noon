import { isLocale, type Locale } from "@/lib/locale";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FaInstagram } from "react-icons/fa6";
import { FiBookOpen, FiCalendar, FiClock, FiExternalLink } from "react-icons/fi";
import { GiChefToque } from "react-icons/gi";
import { HiSparkles } from "react-icons/hi2";
import { findTrainerById, findTrainerClasses, getTrainerProfile } from "@/lib/db/trainers";
import { formatAmountWithCurrency } from "@/lib/formatNumber";
import { formatDurationClock } from "@/lib/formatDuration";

type UpcomingItem =
  | {
      kind: "manual";
      id: string;
      title: string;
      titleAr: string | null;
      mediaType: "IMAGE" | "VIDEO" | "YOUTUBE";
      mediaUrl: string | null;
      description: string | null;
      bookingUrl: string | null;
      price: number | null;
      currency: string;
      scheduledAt: string | null;
    }
  | {
      kind: "class";
      id: string;
      slug: string;
      title: string;
      titleAr: string | null;
      imageUrl: string | null;
      price: number;
      currency: string;
      scheduledAt: string | null;
    };

function toExternalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function toYoutubeEmbedUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").split("/")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null;
    }

    if (hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube-nocookie.com/embed/${v}?rel=0&modestbranding=1`;

      const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://www.youtube-nocookie.com/embed/${shorts[1]}?rel=0&modestbranding=1`;

      const embed = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embed?.[1]) return `https://www.youtube-nocookie.com/embed/${embed[1]}?rel=0&modestbranding=1`;
        }

    return null;
  } catch {
    return null;
  }
}

function formatSessionDateTime(value: Date | string | null, locale: Locale): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: 'Asia/Muscat',
  });
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null || !Number.isFinite(value)) return `- ${currency}`;
  return formatAmountWithCurrency(value, currency);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownToHtml(source: string): string {
  const escaped = escapeHtml(source);
  const lines = escaped.split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  const parseInline = (line: string): string =>
    line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      .replace(/`([^`]+)`/g, '<code class="rounded bg-zinc-200/80 px-1.5 py-0.5 text-xs dark:bg-zinc-800">$1</code>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-coral underline underline-offset-2">$1</a>'
      );

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^\s*$/.test(line)) {
      closeLists();
      html.push("");
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul class="my-2 list-disc space-y-1 ps-6">');
        inUl = true;
      }
      html.push(`<li>${parseInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol class="my-2 list-decimal space-y-1 ps-6">');
        inOl = true;
      }
      html.push(`<li>${parseInline(olMatch[1])}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p class="my-2 leading-7 text-zinc-700 dark:text-zinc-300">${parseInline(line)}</p>`);
  }

  closeLists();
  return html.join("\n");
}

function getSortTime(value: string | null): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function containsArabicCharacters(value: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);
}

function getLocalizedTrainerName(
  locale: Locale,
  trainer: { fullName: string | null | undefined; displayNameEn?: string | null; displayNameAr?: string | null },
  fallbackName: string,
) {
  const displayNameEn = trainer.displayNameEn?.trim();
  const displayNameAr = trainer.displayNameAr?.trim();
  const fullName = String(trainer.fullName ?? "").trim();

  if (locale === "ar") {
    return displayNameAr || displayNameEn || fullName || fallbackName;
  }

  return displayNameEn || displayNameAr || fullName || fallbackName;
}

export default async function TrainerProfilePage({
  params,
}: {
  params: Promise<{ locale: string; trainerId: string }>;
}) {
  const { locale: rawLocale, trainerId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const trainer = await findTrainerById(trainerId);
  if (!trainer || trainer.status !== "ACTIVE") {
    notFound();
  }

  const trainerProfile = await getTrainerProfile(trainerId);
  const classes = await findTrainerClasses(trainerId, { publishedOnly: true });

  const now = new Date();
  const upcomingClasses = classes.filter((cls) => {
    if (!cls.startDateTime) return false;
    return new Date(cls.startDateTime) > now;
  });

  const featuredPreviousClassIds = trainerProfile?.featuredPreviousClassIds ?? [];
  const previousClasses = featuredPreviousClassIds.length > 0
    ? featuredPreviousClassIds
        .map((id) => classes.find((cls) => cls.id === id))
        .filter((cls): cls is NonNullable<typeof cls> => Boolean(cls))
    : classes.filter((cls) => {
        if (!cls.startDateTime) return true;
        return new Date(cls.startDateTime) <= now;
      });

  const t = {
    trainer: locale === "ar" ? "المدرب" : "Trainer",
    aboutTrainer: locale === "ar" ? "نبذة عن المدرب" : "About the Trainer",
    upcomingClasses: locale === "ar" ? "الورش القادمة" : "Upcoming Classes",
    previousClasses: locale === "ar" ? "الورش السابقة" : "Previous Classes",
    bookNow: locale === "ar" ? "احجز الآن" : "Book Now",
    moreDetails: locale === "ar" ? "المزيد من التفاصيل" : "More Details",
    noUpcomingClasses: locale === "ar" ? "لا توجد ورش قادمة حالياً" : "No upcoming classes at the moment",
    noPreviousClasses: locale === "ar" ? "لا توجد ورش سابقة" : "No previous classes",
    expertise: locale === "ar" ? "التخصصات" : "Expertise",
    experience: locale === "ar" ? "الخبرة" : "Experience",
    years: locale === "ar" ? "سنة" : "years",
    scheduledAt: locale === "ar" ? "الموعد" : "Scheduled",
    manualCourse: locale === "ar" ? "دورة مضافة يدوياً" : "Manual Course",
    classCourse: locale === "ar" ? "دورة مباشرة" : "Live Class",
    noBio:
      locale === "ar" ? "سيتم تحديث نبذة المدرب قريباً." : "Trainer bio will be updated soon.",
    video: locale === "ar" ? "فيديو" : "Video",
    image: locale === "ar" ? "صورة" : "Image",
    instagram: locale === "ar" ? "إنستغرام" : "Instagram",
    unnamedTrainer: locale === "ar" ? "المدرب" : "Trainer",
  };

  const localizedTrainerName = getLocalizedTrainerName(
    locale,
    {
      fullName: trainer.fullName,
      displayNameEn: trainerProfile?.displayNameEn,
      displayNameAr: trainerProfile?.displayNameAr,
    },
    t.unnamedTrainer
  );
  const localizedTrainerBio = locale === "ar"
    ? trainerProfile?.bioAr?.trim() || trainerProfile?.bio?.trim() || t.noBio
    : trainerProfile?.bioEn?.trim() || (trainerProfile?.bio?.trim() && !containsArabicCharacters(trainerProfile.bio) ? trainerProfile.bio.trim() : "") || t.noBio;
  const trainerExpertise = trainerProfile?.expertise?.filter(Boolean) ?? [];
  const trainerSocialLinks = trainerProfile?.socialLinks ?? null;
  const trainerExperience = trainerProfile?.experience ?? null;
  const trainerBioHtml = markdownToHtml(localizedTrainerBio);
  const trainerInstagramUrl =
    trainerSocialLinks && typeof trainerSocialLinks.instagram === "string"
      ? toExternalUrl(trainerSocialLinks.instagram)
      : "";

  const featuredMediaType = trainerProfile?.featuredMediaType ?? "IMAGE";
  const featuredMediaUrl = trainerProfile?.featuredMediaUrl?.trim() || null;
  const featuredVideoEmbed =
    featuredMediaType === "YOUTUBE" && featuredMediaUrl ? toYoutubeEmbedUrl(featuredMediaUrl) : null;
  const featuredUploadedVideoUrl = featuredMediaType === "VIDEO" ? featuredMediaUrl : null;

  const featuredImageUrl =
    featuredMediaType === "IMAGE" ? featuredMediaUrl || trainer.profileImage : trainer.profileImage;

  const manualUpcomingCourses = trainerProfile?.manualUpcomingCourses ?? [];

  const upcomingItems: UpcomingItem[] = [
    ...manualUpcomingCourses.map((course) => ({
      kind: "manual" as const,
      id: course.id,
      title: course.title,
      titleAr: course.titleAr,
      mediaType: (
        course.mediaType === "YOUTUBE"
          ? "YOUTUBE"
          : course.mediaType === "VIDEO"
            ? "VIDEO"
            : "IMAGE"
      ) as "IMAGE" | "VIDEO" | "YOUTUBE",
      mediaUrl: course.mediaUrl || course.imageUrl || null,
      description: course.description,
      bookingUrl: course.bookingUrl,
      price: course.price,
      currency: course.currency,
      scheduledAt: course.dateTime,
    })),
    ...upcomingClasses.map((cls) => {
      const startDt = cls.startDateTime ? new Date(cls.startDateTime).toISOString() : null;
      return {
        kind: "class" as const,
        id: cls.id,
        slug: cls.slug,
        title: cls.title,
        titleAr: cls.titleAr,
        imageUrl: cls.image,
        price: cls.price,
        currency: cls.currency,
        scheduledAt: startDt,
      };
    }),
  ].sort((left, right) => getSortTime(left.scheduledAt) - getSortTime(right.scheduledAt));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(12,180,166,0.14),_transparent_40%),radial-gradient(circle_at_85%_15%,_rgba(245,101,101,0.18),_transparent_35%),linear-gradient(to_bottom,_#fafaf9,_#ffffff)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(12,180,166,0.12),_transparent_42%),radial-gradient(circle_at_85%_15%,_rgba(245,101,101,0.15),_transparent_38%),linear-gradient(to_bottom,_#09090b,_#111827)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72">
        <div className="absolute -left-16 top-8 h-44 w-44 rounded-full bg-teal/20 blur-3xl dark:bg-teal/10" />
        <div className="absolute right-0 top-4 h-56 w-56 rounded-full bg-coral/20 blur-3xl dark:bg-coral/10" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-12">
        <section className="mb-12 overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white/90 shadow-[0_24px_70px_-35px_rgba(2,6,23,0.35)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/80">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative min-h-[340px] border-b border-zinc-200/70 bg-zinc-900 lg:min-h-[540px] lg:border-b-0 lg:border-e lg:border-zinc-200/70 dark:border-zinc-800/70">
              {featuredVideoEmbed ? (
                <iframe
                  src={featuredVideoEmbed}
                  title={`${localizedTrainerName} featured video`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : featuredUploadedVideoUrl ? (
                <video
                  src={featuredUploadedVideoUrl}
                  controls
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : featuredImageUrl ? (
                <Image
                  src={featuredImageUrl}
                  alt={localizedTrainerName}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral via-coral-light to-teal">
                  <GiChefToque className="h-40 w-40 text-white/75" />
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  <GiChefToque className="h-4 w-4" />
                  {t.trainer}
                </span>
                <span className="inline-flex rounded-full border border-white/35 bg-black/20 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur">
                  {featuredVideoEmbed || featuredUploadedVideoUrl ? t.video : t.image}
                </span>
              </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8 lg:p-10">
              <div className="space-y-3">
                <h1 className="text-3xl font-black leading-tight text-zinc-900 dark:text-white sm:text-4xl">
                  {localizedTrainerName}
                </h1>
              </div>

              <div className="rounded-2xl border border-coral/30 bg-[linear-gradient(120deg,rgba(251,113,133,0.1),rgba(20,184,166,0.06))] p-5 dark:border-coral/35">
                <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white">
                  <HiSparkles className="h-5 w-5 text-coral" />
                  {t.aboutTrainer}
                </h2>
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: trainerBioHtml }}
                />
              </div>

              {(trainerExperience || trainerExpertise.length > 0) && (
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/65">
                  {trainerExperience ? (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{t.experience}: </span>
                      {trainerExperience} {t.years}
                    </p>
                  ) : null}

                  {trainerExpertise.length > 0 ? (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.expertise}</p>
                      <div className="flex flex-wrap gap-2">
                        {trainerExpertise.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-xs font-semibold text-teal"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {trainerInstagramUrl ? (
                <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/65">
                  <a
                    href={trainerInstagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-pink-300/70 bg-pink-50 px-4 py-2 text-sm font-semibold text-pink-700 transition hover:bg-pink-100 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-200 dark:hover:bg-pink-500/15"
                  >
                    <FaInstagram className="h-4 w-4" />
                    {t.instagram}
                    <FiExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t.upcomingClasses}</h2>
            </div>
          </div>

          {upcomingItems.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
              {t.noUpcomingClasses}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
              {upcomingItems.map((item) => {
                const title = locale === "ar" && item.titleAr ? item.titleAr : item.title;
                const schedule = formatSessionDateTime(item.scheduledAt, locale);
                const price = formatMoney(item.price, item.currency);

                const cardBody = (
                  <>
                    <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900 sm:aspect-[3/4]">
                      {item.kind === "manual" ? (
                        item.mediaType === "YOUTUBE" && item.mediaUrl ? (
                          toYoutubeEmbedUrl(item.mediaUrl) ? (
                            <iframe
                              src={toYoutubeEmbedUrl(item.mediaUrl) || undefined}
                              title={`${title} preview`}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-900">
                              <GiChefToque className="h-16 w-16 text-zinc-400 dark:text-zinc-600" />
                            </div>
                          )
                        ) : item.mediaType === "VIDEO" && item.mediaUrl ? (
                          <video
                            src={item.mediaUrl}
                            controls
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        ) : item.mediaUrl ? (
                          <Image
                            src={item.mediaUrl}
                            alt={title}
                            fill
                            sizes="(max-width: 1280px) 50vw, 33vw"
                            className="object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-900">
                            <GiChefToque className="h-16 w-16 text-zinc-400 dark:text-zinc-600" />
                          </div>
                        )
                      ) : item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={title}
                          fill
                          sizes="(max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-900">
                          <GiChefToque className="h-16 w-16 text-zinc-400 dark:text-zinc-600" />
                        </div>
                      )}

                      <div className="absolute left-3 top-3 inline-flex rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                        {item.kind === "manual" ? t.manualCourse : t.classCourse}
                      </div>
                    </div>

                    <div className="space-y-2 p-3 sm:space-y-3 sm:p-4">
                      <h3 className="line-clamp-2 text-sm font-bold text-zinc-900 dark:text-white sm:text-lg">{title}</h3>

                      {schedule ? (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 sm:gap-2 sm:text-sm">
                          <FiCalendar className="h-4 w-4 text-teal" />
                          <span>{schedule}</span>
                        </div>
                      ) : null}

                      {item.kind === "manual" && item.description ? (
                        <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">{item.description}</p>
                      ) : null}

                      <div className="flex items-center justify-between border-t border-zinc-200 pt-2.5 dark:border-zinc-800 sm:pt-3">
                        <span className="text-sm font-black text-coral sm:text-base">{price}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-white sm:text-sm">
                          {item.kind === "manual" ? t.bookNow : t.moreDetails}
                          <FiExternalLink className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </>
                );

                if (item.kind === "manual") {
                  if (item.bookingUrl) {
                    return (
                      <a
                        key={`${item.kind}-${item.id}`}
                        href={item.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/85 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/75"
                      >
                        {cardBody}
                      </a>
                    );
                  }

                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/85 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/75"
                    >
                      {cardBody}
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={`/${locale}/classes/${item.slug}`}
                    className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/85 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/75"
                  >
                    {cardBody}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t.previousClasses}</h2>
            </div>
          </div>

          {previousClasses.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
              {t.noPreviousClasses}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
              {previousClasses.map((cls) => (
                <Link
                  key={cls.id as string}
                  href={`/${locale}/classes/${cls.slug}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white/85 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/75"
                >
                  <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[3/4]">
                    {cls.image ? (
                      <Image
                        src={cls.image as string}
                        alt={cls.title as string}
                        fill
                        sizes="(max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-50 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-900">
                        <FiBookOpen className="h-14 w-14 text-zinc-400 dark:text-zinc-600" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-3 sm:space-y-3 sm:p-4">
                    <h3 className="line-clamp-2 text-sm font-bold text-zinc-900 dark:text-white sm:text-lg">
                      {locale === "ar" && cls.titleAr ? cls.titleAr : cls.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 sm:gap-2">
                        <FiClock className="h-4 w-4 text-teal" />
                        <span>
                          {formatDurationClock(cls.durationMinutes as number | null | undefined)}
                        </span>
                      </div>
                      <span className="font-bold text-coral">{formatMoney(cls.price, cls.currency)}</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t.moreDetails} →</p>
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
