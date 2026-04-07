import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import { getPhotographerSchedule } from "@/lib/db/photographer";
import PhotographerScheduleClient from "./PhotographerScheduleClient";

export default async function PhotographerSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;
  if (!sessionId) redirect(`/${locale}/login`);

  const user = await getUserById(sessionId);
  if (!user || user.role !== "SOCIAL_MEDIA_ADMIN") redirect(`/${locale}/account`);

  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const schedule = await getPhotographerSchedule({
    from: now.toISOString(),
    to: threeMonths.toISOString(),
  });

  return <PhotographerScheduleClient locale={locale} schedule={schedule} />;
}
