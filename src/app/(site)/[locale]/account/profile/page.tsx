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
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
        {locale === 'ar' ? 'معلومات الملف الشخصي' : 'Profile Information'}
      </h2>

      <div className="mt-6 flex items-center gap-4 rounded-xl border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        <span className="relative size-16 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
          {user.profileImage ? (
            <Image src={user.profileImage} alt={user.fullName} fill sizes="64px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-600 dark:text-zinc-200">
              {user.fullName.trim().charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.fullName}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}</p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">{user.fullName}</p>
        </div>

        <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">{user.email}</p>
        </div>

        <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">{user.phoneNumber || '-'}</p>
        </div>

        <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{locale === 'ar' ? 'اللغة المفضلة' : 'Preferred Language'}</p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
            {user.preferredLanguage === 'ARABIC' ? (locale === 'ar' ? 'العربية' : 'Arabic') : 'English'}
          </p>
        </div>
      </div>
    </div>
  );
}
