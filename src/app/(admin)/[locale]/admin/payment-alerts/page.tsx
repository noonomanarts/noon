import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAllUsers, getUserById } from '@/lib/db/users';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import { isLocale, type Locale } from '@/lib/locale';
import AdminPaymentAlertsPageClient from '@/components/admin/AdminPaymentAlertsPageClient';
import {
  defaultPaymentAlertSettings,
  sanitizePaymentAlertSettings,
  type PaymentAlertSettings,
} from '@/lib/paymentAlertSettings';

const SETTINGS_KEY = 'payment-alerts';

export default async function AdminPaymentAlertsPage({
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

  const [savedSettings, users] = await Promise.all([
    getAdminSettingsByKey<PaymentAlertSettings>(SETTINGS_KEY),
    getAllUsers({ status: 'ACTIVE' }),
  ]);

  return (
    <AdminPaymentAlertsPageClient
      initialSettings={sanitizePaymentAlertSettings(savedSettings ?? defaultPaymentAlertSettings)}
      users={users.map((item) => ({
        id: item.id,
        full_name: item.fullName,
        email: item.email,
        phone_number: item.phoneNumber,
        role: item.role,
        profile_image: item.profileImage,
      }))}
    />
  );
}