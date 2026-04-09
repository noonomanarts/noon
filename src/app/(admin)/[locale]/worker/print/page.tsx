import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { getWorkerPermissions, getProductsForWorker } from "@/lib/db/worker";
import PrintLabelsClient from "./PrintLabelsClient";

export default async function PrintLabelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) redirect(`/${locale}/login`);

  const user = await getUserById(sessionId);
  if (!user || user.role !== "WORKER") redirect(`/${locale}`);

  const permissions = await getWorkerPermissions(user.id);
  if (!permissions?.can_print_labels) redirect(`/${locale}/worker`);

  const products = await getProductsForWorker();

  return <PrintLabelsClient locale={locale} products={products} />;
}
