import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { getFullWorkerPermissions, getWorkerPermissions } from "@/lib/db/worker";
import { listShopOrdersForAdmin } from "@/lib/db/shop";
import { isLocale, type Locale } from "@/lib/locale";
import WorkerOrdersClient from "./WorkerOrdersClient";

export default async function WorkerOrdersPage({
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
  if (!user || (user.role !== "WORKER" && user.role !== "ADMIN")) {
    redirect(`/${locale}/account`);
  }

  const permissions = user.role === "ADMIN" ? getFullWorkerPermissions(user.id) : await getWorkerPermissions(user.id);
  if (!permissions?.can_manage_orders) {
    redirect(`/${locale}/worker`);
  }

  // Get recent orders (pending and processing)
  const { orders } = await listShopOrdersForAdmin({
    page: 1,
    limit: 50,
  });

  return (
    <WorkerOrdersClient
      locale={locale}
      orders={orders}
    />
  );
}
