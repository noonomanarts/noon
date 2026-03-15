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
    <div className="route-sharp relative mx-auto w-full max-w-6xl px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64">
        <div className="absolute -left-16 top-4 h-40 w-40 rounded-none bg-teal/15 blur-3xl dark:bg-teal/10" />
        <div className="absolute right-0 top-10 h-52 w-52 rounded-none bg-coral/15 blur-3xl dark:bg-coral/10" />
      </div>

      <div className="mb-6 rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="keep-profile-round relative size-14 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--muted)]">
              {user.profileImage ? (
                <Image src={user.profileImage} alt={user.fullName} fill sizes="56px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-base font-semibold text-[color:var(--text-muted)]">
                  {user.fullName.trim().charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </span>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
                {locale === 'ar' ? 'حسابي' : 'My Account'}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                {locale === 'ar' ? `مرحباً، ${user.fullName}` : `Welcome, ${user.fullName}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-none bg-[color:var(--primary)]/15 px-3 py-1 font-semibold text-[color:var(--primary)]">
              {user.role}
            </span>
            <span className="rounded-none bg-[color:var(--muted)] px-3 py-1 font-medium text-[color:var(--text-muted)]">
              {user.email}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">
        <AccountSidebar locale={locale} role={user.role} />
        <section>{children}</section>
      </div>
    </div>
  );
}
