import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { getFullWorkerPermissions, getWorkerPermissions, getInShopSaleById } from "@/lib/db/worker";
import PrintSaleReceiptClient from "./PrintSaleReceiptClient";

export default async function PrintSaleReceiptPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) redirect(`/${locale}/login`);

  const user = await getUserById(sessionId);
  if (!user || (user.role !== "WORKER" && user.role !== "ADMIN")) redirect(`/${locale}`);

  const permissions = user.role === "ADMIN" ? getFullWorkerPermissions(user.id) : await getWorkerPermissions(user.id);
  if (!permissions?.can_record_sales) redirect(`/${locale}/worker`);

  const sale = await getInShopSaleById(id);
  if (!sale) notFound();

  return <PrintSaleReceiptClient locale={locale} sale={sale} />;
}
