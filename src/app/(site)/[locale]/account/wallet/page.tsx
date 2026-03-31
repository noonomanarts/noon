import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';
import { getWalletByUserId, getWalletTransactions } from '@/lib/db/wallet';
import { WalletSection } from '@/components/site/WalletSection';

export default async function AccountWalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const { returnUrl } = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  let wallet = await getWalletByUserId(user.id);
  if (!wallet) {
    wallet = {
      id: '',
      user_id: user.id,
      balance: 0,
      available_balance: 0,
      blocked_balance: 0,
      currency: 'OMR',
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  const transactions = wallet.id ? await getWalletTransactions(wallet.id) : [];

  return <WalletSection wallet={wallet} transactions={transactions} locale={locale} returnUrl={returnUrl} />;
}
