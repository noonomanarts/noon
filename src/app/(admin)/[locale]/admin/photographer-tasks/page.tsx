import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import { listPhotographerTasks } from "@/lib/db/photographer";
import { pool } from "@/lib/db/pool";
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

  // Find photographer user
  const photographerResult = await pool.query(
    `SELECT id, full_name, email, profile_image FROM users WHERE role = 'PHOTOGRAPHER' AND status = 'ACTIVE' LIMIT 1`
  );
  const photographer = photographerResult.rows[0] ?? null;

  let tasks: Awaited<ReturnType<typeof listPhotographerTasks>> = { tasks: [], total: 0 };
  if (photographer) {
    tasks = await listPhotographerTasks(photographer.id, { limit: 200 });
  }

  return (
    <AdminPhotographerTasksClient
      locale={locale}
      photographerExists={!!photographer}
      photographerName={photographer?.full_name ?? ""}
      initialTasks={tasks.tasks}
      initialTotal={tasks.total}
    />
  );
}
