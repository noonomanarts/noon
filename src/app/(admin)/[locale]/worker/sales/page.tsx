import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { getWorkerPermissions, getInShopSales } from "@/lib/db/worker";
import { isLocale, type Locale } from "@/lib/locale";
import WorkerSalesClient from "./WorkerSalesClient";

export default async function WorkerSalesPage({
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

  const permissions = await getWorkerPermissions(user.id);
  if (!permissions?.can_record_sales) {
    redirect(`/${locale}/worker`);
  }

  const { sales } = await getInShopSales({
    workerUserId: user.id,
    limit: 50,
  });

  return (
    <WorkerSalesClient
      locale={locale}
      sales={sales}
      canPrintBills={permissions.can_print_bills}
    />
  );
}
