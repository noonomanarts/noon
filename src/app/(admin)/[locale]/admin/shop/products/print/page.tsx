import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserById } from "@/lib/db/users";
import { getProductsForPrintLabels } from "@/lib/db/print-labels";
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
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getSessionUserById(sessionId);
  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const products = await getProductsForPrintLabels();

  return <PrintLabelsClient locale={locale} products={products} />;
}
