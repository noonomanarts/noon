import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';
import ShopCategoriesPageClient from '@/components/admin/ShopCategoriesPageClient';

export default async function AdminShopCategoriesPage({
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

  return <ShopCategoriesPageClient locale={locale} />;
}
