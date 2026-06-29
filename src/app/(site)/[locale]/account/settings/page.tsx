import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';
import AccountSettingsPageClient from '@/components/site/AccountSettingsPageClient';

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <AccountSettingsPageClient
      locale={locale}
      initialUser={{
        ...user,
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : null,
      }}
    />
  );
}
