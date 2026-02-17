import CheckoutPageClient from '@/components/site/CheckoutPageClient';
import { isLocale, type Locale } from '@/lib/locale';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  return <CheckoutPageClient locale={locale} />;
}
