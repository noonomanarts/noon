import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserById } from "@/lib/db/users";
import { getFullWorkerPermissions, getWorkerPermissions, getProductsForWorker, getStockRestocks } from "@/lib/db/worker";
import { isLocale, type Locale } from "@/lib/locale";
import WorkerRestockClient from "./WorkerRestockClient";

export default async function WorkerRestockPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getSessionUserById(sessionId);
  if (!user || (user.role !== "WORKER" && user.role !== "ADMIN")) {
    redirect(`/${locale}/account`);
  }

  const permissions = user.role === "ADMIN" ? getFullWorkerPermissions(user.id) : await getWorkerPermissions(user.id);
  if (!permissions?.can_restock) {
    redirect(`/${locale}/worker`);
  }

  const [products, { restocks }] = await Promise.all([
    getProductsForWorker(),
    getStockRestocks(user.role === "ADMIN" ? { limit: 20 } : { workerUserId: user.id, limit: 20 }),
  ]);

  return (
    <WorkerRestockClient
      locale={locale}
      products={products}
      recentRestocks={restocks}
    />
  );
}
