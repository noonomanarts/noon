import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';
import { listCompanyOrders } from '@/lib/db/companies';
import CompaniesListClient from '@/components/admin/CompaniesListClient';

export default async function AdminCompaniesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) redirect(`/${locale}/login`);
  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') redirect(`/${locale}/account`);

  const orders = await listCompanyOrders();
  return <CompaniesListClient locale={locale} initialOrders={orders} />;
}
