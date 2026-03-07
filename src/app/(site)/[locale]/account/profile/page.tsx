import { redirect } from 'next/navigation';
import Image from 'next/image';
import { isLocale, type Locale } from '@/lib/locale';
import { getCurrentUser } from '@/lib/session';

export default async function AccountProfilePage({
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
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[color:var(--text)]">
        {locale === 'ar' ? 'معلومات الملف الشخصي' : 'Profile Information'}
      </h2>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        {locale === 'ar'
          ? 'إطّلع على بيانات حسابك الأساسية كما تظهر في نظام نون.'
          : 'Review your primary account details as used across Noon.'}
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
        <span className="relative size-16 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]">
          {user.profileImage ? (
            <Image src={user.profileImage} alt={user.fullName} fill sizes="64px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-[color:var(--text-muted)]">
              {user.fullName.trim().charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </span>
        <div>
          <p className="text-sm font-semibold text-[color:var(--text)]">{user.fullName}</p>
          <p className="text-xs text-[color:var(--text-muted)]">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
          <p className="text-xs text-[color:var(--text-subtle)]">{locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}</p>
          <p className="mt-1 text-sm font-medium text-[color:var(--text)]">{user.fullName}</p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
          <p className="text-xs text-[color:var(--text-subtle)]">{locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
          <p className="mt-1 text-sm font-medium text-[color:var(--text)]">{user.email}</p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
          <p className="text-xs text-[color:var(--text-subtle)]">{locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</p>
          <p className="mt-1 text-sm font-medium text-[color:var(--text)]">{user.phoneNumber || '-'}</p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] p-4">
          <p className="text-xs text-[color:var(--text-subtle)]">{locale === 'ar' ? 'اللغة المفضلة' : 'Preferred Language'}</p>
          <p className="mt-1 text-sm font-medium text-[color:var(--text)]">
            {user.preferredLanguage === 'ARABIC' ? (locale === 'ar' ? 'العربية' : 'Arabic') : 'English'}
          </p>
        </div>
      </div>
    </div>
  );
}
