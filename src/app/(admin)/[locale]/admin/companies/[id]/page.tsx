import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { getUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';
import { getCompanyOrder } from '@/lib/db/companies';
import { listInventoryCatalog } from '@/lib/db/inventory';
import CompanyDetailClient from '@/components/admin/CompanyDetailClient';

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) redirect(`/${locale}/login`);
  const user = await getUserById(sessionId);
  if (!user || user.role !== 'ADMIN') redirect(`/${locale}/account`);

  const order = await getCompanyOrder(id);
  if (!order) notFound();
  const inventory = await listInventoryCatalog();

  return <CompanyDetailClient locale={locale} order={order} inventory={inventory} />;
}
