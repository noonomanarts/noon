import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { isLocale, type Locale } from "@/lib/locale";
import { listPhotographerTasks } from "@/lib/db/photographer";
import PhotographerTasksClient from "./PhotographerTasksClient";

export default async function PhotographerTasksPage({
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
  if (!user || user.role !== "PHOTOGRAPHER") redirect(`/${locale}/account`);

  const result = await listPhotographerTasks(user.id, { limit: 100 });

  return <PhotographerTasksClient locale={locale} initialTasks={result.tasks} initialTotal={result.total} />;
}
