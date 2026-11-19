import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import { isPhotographerDashboardRole, listPhotographerTasks } from "@/lib/db/photographer";
import PhotographerTasksClient from "./PhotographerTasksClient";

export default async function PhotographerTasksPage({
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

  const result = await listPhotographerTasks(user.id, { limit: 100 });

  return <PhotographerTasksClient locale={locale} initialTasks={result.tasks} initialTotal={result.total} />;
}
