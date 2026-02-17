import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';

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
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
        {locale === 'ar' ? 'الإعدادات' : 'Settings'}
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {locale === 'ar'
          ? 'يمكنك إدارة إعدادات حسابك وتفضيلاتك من هنا.'
          : 'Manage your account preferences from this page.'}
      </p>
    </div>
  );
}
