import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  redirect(`/${locale}/account/profile`);
}
