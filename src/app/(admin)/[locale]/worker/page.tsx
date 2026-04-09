import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { getWorkerStats, getWorkerPermissions } from "@/lib/db/worker";
import { isLocale, type Locale } from "@/lib/locale";
import WorkerDashboardClient from "./WorkerDashboardClient";

export default async function WorkerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== "WORKER") {
    redirect(`/${locale}/account`);
  }

  const [stats, permissions] = await Promise.all([
    getWorkerStats(user.id),
    getWorkerPermissions(user.id),
  ]);

  return (
    <WorkerDashboardClient
      locale={locale}
      stats={stats}
      permissions={permissions}
      userName={user.fullName}
    />
  );
}
