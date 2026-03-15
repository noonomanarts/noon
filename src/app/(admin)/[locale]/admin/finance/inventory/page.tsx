import { isLocale, type Locale } from '@/lib/locale';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserById } from '@/lib/db/users';
import AdminInventoryPageClient from '@/components/admin/AdminInventoryPageClient';

export default async function AdminInventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    redirect(`/${locale}/account`);
  }

  return <AdminInventoryPageClient locale={locale} />;
}
