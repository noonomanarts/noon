import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserById } from "@/lib/db/users";
import { getProductsForPrintLabels } from "@/lib/db/print-labels";
import { getFullWorkerPermissions, getWorkerPermissions } from "@/lib/db/worker";
import PrintLabelsClient from "./PrintLabelsClient";

export default async function PrintLabelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) redirect(`/${locale}/login`);

  const user = await getSessionUserById(sessionId);
  if (!user || (user.role !== "WORKER" && user.role !== "ADMIN")) redirect(`/${locale}`);

  const permissions = user.role === "ADMIN" ? getFullWorkerPermissions(user.id) : await getWorkerPermissions(user.id);
  if (!permissions?.can_print_labels) redirect(`/${locale}/worker`);

  const products = await getProductsForPrintLabels();

  return <PrintLabelsClient locale={locale} products={products} />;
}
