import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAllUsers, getSessionUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';
import AdminWhatsAppPageClient from '@/components/admin/AdminWhatsAppPageClient';

export default async function AdminWhatsAppPage({
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

  const users = await getAllUsers({ status: 'ACTIVE', take: 1000 });

  return (
    <AdminWhatsAppPageClient
      locale={locale}
      users={users.map((item) => ({
        id: item.id,
        fullName: item.fullName,
        email: item.email,
        phoneNumber: item.phoneNumber,
        role: item.role,
      }))}
    />
  );
}
