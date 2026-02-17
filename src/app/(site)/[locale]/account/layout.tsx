import { redirect } from 'next/navigation';
import Image from 'next/image';
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
      <div className="mb-6 rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative size-14 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
              {user.profileImage ? (
                <Image src={user.profileImage} alt={user.fullName} fill sizes="56px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-base font-semibold text-zinc-700 dark:text-zinc-200">
                  {user.fullName.trim().charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </span>

            <div>
              <h1 className="noon-text text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                {locale === 'ar' ? 'حسابي' : 'My Account'}
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {locale === 'ar' ? `مرحباً، ${user.fullName}` : `Welcome, ${user.fullName}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-[color:var(--noon-teal-soft)] px-3 py-1 font-semibold text-[color:var(--noon-teal-strong)]">
              {user.role}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {user.email}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">
        <AccountSidebar locale={locale} />
        <section>{children}</section>
      </div>
    </div>
  );
}
