import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  defaultWhatsAppTransactionTemplatesSettings,
  getAdminSettingsByKey,
  sanitizeWhatsAppTransactionTemplatesSettings,
  type WhatsAppTransactionTemplatesSettings,
} from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';
import AdminWhatsAppTemplatesPageClient from '@/components/admin/AdminWhatsAppTemplatesPageClient';

export default async function AdminWhatsAppTemplatesPage({
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

  const saved = await getAdminSettingsByKey<WhatsAppTransactionTemplatesSettings>('whatsapp-transaction-templates');
  const initialTemplates = sanitizeWhatsAppTransactionTemplatesSettings(
    saved ?? defaultWhatsAppTransactionTemplatesSettings
  );

  return <AdminWhatsAppTemplatesPageClient locale={locale} initialTemplates={initialTemplates} />;
}
