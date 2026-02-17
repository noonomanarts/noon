import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import ShopOrderDetailsPageClient from '@/components/admin/ShopOrderDetailsPageClient';
import { getShopOrderForAdminById } from '@/lib/db/shop';
import { getUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';

export default async function AdminShopOrderDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale: rawLocale, orderId } = await params;
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

  const order = await getShopOrderForAdminById(orderId);
  if (!order) {
    notFound();
  }

  return <ShopOrderDetailsPageClient locale={locale} initialOrder={order} />;
}
