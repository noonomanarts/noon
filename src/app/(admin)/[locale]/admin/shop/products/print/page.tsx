import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/db/users";
import { getProductsForWorker } from "@/lib/db/worker";
import { isLocale, type Locale } from "@/lib/locale";
import PrintLabelsClient from "../../../../worker/print/PrintLabelsClient";

export default async function AdminPrintLabelsPage({
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
  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const products = await getProductsForWorker();

  return <PrintLabelsClient locale={locale} products={products} />;
}
