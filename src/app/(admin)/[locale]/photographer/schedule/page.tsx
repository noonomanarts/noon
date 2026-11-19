import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import { getPhotographerSchedule, isPhotographerDashboardRole } from "@/lib/db/photographer";
import PhotographerScheduleClient from "./PhotographerScheduleClient";

export default async function PhotographerSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);
  if (!sessionId) redirect(`/${locale}/login`);

  const user = await getSessionUserById(sessionId);
  if (!user || !isPhotographerDashboardRole(user.role)) redirect(`/${locale}/account`);

  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const schedule = await getPhotographerSchedule({
    from: now.toISOString(),
    to: threeMonths.toISOString(),
  });

  return <PhotographerScheduleClient locale={locale} schedule={schedule} />;
}
