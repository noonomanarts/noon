import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { getFullWorkerPermissions, getWorkerPermissions, getProductsForWorker } from "@/lib/db/worker";
import { isLocale, type Locale } from "@/lib/locale";
import NewSaleClient from "./NewSaleClient";

export default async function NewSalePage({
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
  if (!permissions?.can_record_sales) {
    redirect(`/${locale}/worker`);
  }

  const products = await getProductsForWorker();

  return (
    <NewSaleClient
      locale={locale}
      products={products}
      canPrintBills={permissions.can_print_bills}
    />
  );
}
