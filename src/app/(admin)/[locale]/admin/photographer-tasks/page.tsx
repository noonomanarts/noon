import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import { listPhotographerDashboardUsers, listPhotographerTasksForUsers } from "@/lib/db/photographer";
import AdminPhotographerTasksClient from "./AdminPhotographerTasksClient";

export default async function AdminPhotographerTasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;
  if (!sessionId) redirect(`/${locale}/login`);

  const currentUser = await getUserById(sessionId);
  if (!currentUser || currentUser.role !== "ADMIN") redirect(`/${locale}/account`);

  const dashboardUsers = await listPhotographerDashboardUsers();

  let tasks: Awaited<ReturnType<typeof listPhotographerTasksForUsers>> = { tasks: [], total: 0 };
  if (dashboardUsers.length > 0) {
    tasks = await listPhotographerTasksForUsers(dashboardUsers.map((user) => user.id), { limit: 200 });
  }

  return (
    <AdminPhotographerTasksClient
      locale={locale}
      dashboardUsers={dashboardUsers}
      initialTasks={tasks.tasks}
      initialTotal={tasks.total}
    />
  );
}
