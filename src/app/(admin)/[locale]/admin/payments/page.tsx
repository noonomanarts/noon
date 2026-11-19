import { readSessionUserId } from '@/lib/sessionToken';
import { isLocale, type Locale } from '@/lib/locale';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUserById } from '@/lib/db/users';
import AdminPaymentsPageClient from '@/components/admin/AdminPaymentsPageClient';

export default async function AdminPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; source?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = await searchParams;
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

  return (
    <AdminPaymentsPageClient
      locale={locale}
      initialSearch={typeof query.search === 'string' ? query.search : ''}
      initialSource={typeof query.source === 'string' ? query.source : 'ALL'}
    />
  );
}
