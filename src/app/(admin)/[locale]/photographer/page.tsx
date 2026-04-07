import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import { getPhotographerStats, getPhotographerSchedule, listPhotographerTasks } from "@/lib/db/photographer";
import PhotographerDashboardClient from "./PhotographerDashboardClient";

export default async function PhotographerDashboardPage({
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
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [stats, schedule, tasksResult] = await Promise.all([
    getPhotographerStats(user.id),
    getPhotographerSchedule({ from: now.toISOString(), to: weekEnd.toISOString() }),
    listPhotographerTasks(user.id, { status: undefined, limit: 5 }),
  ]);

  return (
    <PhotographerDashboardClient
      locale={locale}
      stats={stats}
      upcomingSchedule={schedule}
      recentTasks={tasksResult.tasks}
      userName={user.fullName}
    />
  );
}
