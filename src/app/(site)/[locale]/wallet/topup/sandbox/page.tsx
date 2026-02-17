import WalletTopupSandboxClient from '@/components/site/WalletTopupSandboxClient';
import { isLocale, type Locale } from '@/lib/locale';

export default async function WalletTopupSandboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reference?: string; returnUrl?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const resolvedSearchParams = await searchParams;

  return (
    <WalletTopupSandboxClient
      locale={locale}
      reference={resolvedSearchParams.reference ?? ''}
      returnUrl={resolvedSearchParams.returnUrl ?? `/${locale}/checkout`}
    />
  );
}
