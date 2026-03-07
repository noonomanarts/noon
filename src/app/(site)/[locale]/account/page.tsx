import { permanentRedirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  permanentRedirect(`/${locale}/account/profile`);
}
