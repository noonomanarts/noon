import { readSessionUserId } from '@/lib/sessionToken';
import { isLocale, type Locale } from "@/lib/locale";
import { getAllWallets } from "@/lib/db/wallet";
import { getSessionUserById } from "@/lib/db/users";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WalletsTable } from "@/components/admin/WalletsTable";
import { WithdrawalRequestsTable } from "@/components/admin/WithdrawalRequestsTable";
import Link from "next/link";

type WalletAdminView = "wallets" | "withdrawals";

export default async function WalletsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const { view: rawView } = await searchParams;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const view: WalletAdminView = rawView === "withdrawals" ? "withdrawals" : "wallets";

  // Auth check
  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getSessionUserById(sessionId);
  if (!user || user.role !== "ADMIN") {
    redirect(`/${locale}/account`);
  }

  const wallets = await getAllWallets();

  const navItems: Array<{ key: WalletAdminView; label: string }> = [
    {
      key: "wallets",
      label: locale === "ar" ? "إدارة المحافظ" : "Wallet Management",
    },
    {
      key: "withdrawals",
      label: locale === "ar" ? "طلبات السحب" : "Withdrawal Requests",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {locale === "ar" ? "المحافظ" : "Wallets"}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
          {locale === "ar"
            ? "رصيد المحفظة للإنفاق داخل الموقع. المقدار القابل للسحب للسحب النقدي فقط."
            : "Wallet balance for spending on the site. Withdrawable amount is for cash-out only."}
        </p>
      </div>

      {/* The two views sit above the table so it can use the full page width. */}
      <nav
        className="flex gap-1 border-b border-gray-200 dark:border-zinc-700"
        aria-label={locale === "ar" ? "قائمة إدارة المحافظ" : "Wallet admin menu"}
      >
        {navItems.map((item) => {
          const isActive = view === item.key;
          return (
            <Link
              key={item.key}
              href={`/${locale}/admin/wallets?view=${item.key}`}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px inline-flex min-h-10 items-center border-b-2 px-4 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-[color:var(--noon-teal)] text-[color:var(--noon-teal-strong)]"
                  : "border-transparent text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <section className="min-w-0">
        {view === "wallets" ? (
          <WalletsTable wallets={wallets} locale={locale} />
        ) : (
          <WithdrawalRequestsTable locale={locale} />
        )}
      </section>
    </div>
  );
}
