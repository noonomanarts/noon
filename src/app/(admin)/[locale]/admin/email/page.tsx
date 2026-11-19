import { readSessionUserId } from '@/lib/sessionToken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import { getSessionUserById } from '@/lib/db/users';
import { isLocale, type Locale } from '@/lib/locale';
import {
  defaultEmailSettings,
  defaultEmailTransactionTemplatesSettings,
  defaultInvoiceTemplateSettings,
  sanitizeEmailSettings,
  sanitizeEmailTransactionTemplatesSettings,
  sanitizeInvoiceTemplateSettings,
  type EmailSettings,
  type EmailTransactionTemplatesSettings,
  type InvoiceTemplateSettings,
} from '@/lib/adminSettings';
import AdminEmailPageClient from '@/components/admin/AdminEmailPageClient';

export default async function AdminEmailPage({
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

  const [savedSettings, savedTemplates, savedInvoice] = await Promise.all([
    getAdminSettingsByKey<EmailSettings>('email-settings'),
    getAdminSettingsByKey<EmailTransactionTemplatesSettings>('email-transaction-templates'),
    getAdminSettingsByKey<InvoiceTemplateSettings>('invoice-template'),
  ]);

  const initialSettings = sanitizeEmailSettings(savedSettings ?? defaultEmailSettings);
  const initialTemplates = sanitizeEmailTransactionTemplatesSettings(
    savedTemplates ?? defaultEmailTransactionTemplatesSettings
  );
  const initialInvoice = sanitizeInvoiceTemplateSettings(savedInvoice ?? defaultInvoiceTemplateSettings);

  return (
    <AdminEmailPageClient
      locale={locale}
      initialSettings={initialSettings}
      initialTemplates={initialTemplates}
      initialInvoice={initialInvoice}
    />
  );
}
