import { isLocale, type Locale } from "@/lib/locale";
import { getAllWallets } from "@/lib/db/wallet";
import { getUserById } from "@/lib/db/users";
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
  const sessionId = cookieStore.get("noon_session")?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
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
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {locale === "ar" ? "محافظ المستخدمين" : "User Wallets"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-zinc-400">
          {locale === "ar"
            ? "رصيد المحفظة هو الرصيد الذي يمكن للمستخدم إنفاقه داخل الموقع. أما المقدار القابل للسحب فهو جزء منفصل مخصص للسحب النقدي فقط ولا يؤثر على قدرة المستخدم على الشراء داخل الموقع."
            : "Wallet balance is the amount a user can spend inside the website. Withdrawable amount is a separate cash-out value only and does not control whether the user can pay for orders on the website."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        <aside className="rounded-xl border border-gray-200/70 bg-white p-3 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900">
          <nav className="space-y-1" aria-label={locale === "ar" ? "قائمة إدارة المحافظ" : "Wallet admin menu"}>
            {navItems.map((item) => {
              const isActive = view === item.key;
              return (
                <Link
                  key={item.key}
                  href={`/${locale}/admin/wallets?view=${item.key}`}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[color:var(--noon-teal-soft)] text-[color:var(--noon-teal)]"
                      : "text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          {view === "wallets" ? (
            <WalletsTable wallets={wallets} locale={locale} />
          ) : (
            <WithdrawalRequestsTable locale={locale} />
          )}
        </section>
      </div>
    </div>
  );
}
