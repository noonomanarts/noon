import { isLocale, type Locale } from "@/lib/locale";
import { getAllWallets } from "@/lib/db/wallet";
import { getUserById } from "@/lib/db/users";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WalletsTable } from "@/components/admin/WalletsTable";
import { WithdrawalRequestsTable } from "@/components/admin/WithdrawalRequestsTable";

export default async function WalletsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  // Auth check
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const wallets = await getAllWallets();

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {locale === "ar" ? "محافظ المستخدمين" : "User Wallets"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {locale === "ar" ? "إدارة محافظ المستخدمين ومعاملاتهم" : "Manage user wallets and transactions"}
        </p>
      </div>

      <WalletsTable wallets={wallets} locale={locale} />

      <WithdrawalRequestsTable locale={locale} />
    </div>
  );
}