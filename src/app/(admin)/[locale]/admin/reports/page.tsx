import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locale';
import { getSessionUserById } from '@/lib/db/users';
import { getWorkshopReportsData } from '@/lib/db/reports';
import AdminReportsPageClient from '@/components/admin/AdminReportsPageClient';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const cookieStore = await cookies();
  const sessionId = readSessionUserId(cookieStore);

  if (!sessionId) {
    redirect(`/${locale}/login`);
  }

  const user = await getSessionUserById(sessionId);
  if (!user || user.role !== 'ADMIN') {
    redirect(`/${locale}/account`);
  }

  const data = await getWorkshopReportsData();

  return <AdminReportsPageClient locale={locale} data={data} />;
}
