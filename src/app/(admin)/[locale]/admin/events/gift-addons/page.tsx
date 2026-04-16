import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import AdminEventGiftAddOnsPageClient from '@/components/admin/AdminEventGiftAddOnsPageClient';
import { getUserById } from '@/lib/db/users';
import { isLocale } from '@/lib/locale';

export default async function AdminEventGiftAddOnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    redirect('/en/admin/events');
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get('noon_session')?.value;

  if (!userId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(userId);
  if (!user || user.role !== 'ADMIN') {
    redirect(`/${locale}/account`);
  }

  return <AdminEventGiftAddOnsPageClient locale={locale} />;
}