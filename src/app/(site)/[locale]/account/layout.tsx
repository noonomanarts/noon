import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';
import { AccountSidebar } from '@/components/site/AccountSidebar';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="noon-text text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {locale === 'ar' ? 'حسابي' : 'My Account'}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {locale === 'ar' ? `مرحباً، ${user.fullName}` : `Welcome, ${user.fullName}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">
        <AccountSidebar locale={locale} />
        <section>{children}</section>
      </div>
    </div>
  );
}
