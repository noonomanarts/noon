import {
  defaultEmailTransactionTemplatesSettings,
  type EmailTransactionTemplateKey,
  type EmailTransactionTemplatesSettings,
  sanitizeEmailTransactionTemplatesSettings,
} from '@/lib/adminSettings';
import { getAdminSettingsByKey } from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';
import { sendEmail } from './emailClient';
import { getEmailLayout } from './emailLayout';

type TemplateVariables = Record<string, string | number | null | undefined>;

function normalizeLanguage(preferredLanguage: string | null | undefined): 'en' | 'ar' {
  if (!preferredLanguage) return 'en';
  return preferredLanguage.toUpperCase().startsWith('AR') ? 'ar' : 'en';
}

function toTextValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  return String(value);
}

function renderTemplate(template: string, vars: TemplateVariables): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
    return toTextValue(vars[key]);
  });
}

async function getTemplateSettings(): Promise<EmailTransactionTemplatesSettings> {
  const saved = await getAdminSettingsByKey<EmailTransactionTemplatesSettings>('email-transaction-templates');
  return sanitizeEmailTransactionTemplatesSettings(saved ?? defaultEmailTransactionTemplatesSettings);
}

async function sendConfiguredUserEmailTemplate(input: {
  userId: string;
  key: EmailTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  try {
    const user = await getUserById(input.userId);
    if (!user?.email) return;

    const settings = await getTemplateSettings();
    if (!settings.enabled) return;

    const template = settings.templates[input.key];
    if (!template || !template.enabled) return;

    const lang = normalizeLanguage(user.preferredLanguage);
    const isArabic = lang === 'ar';

    const vars: TemplateVariables = {
      name: user.fullName,
      ...input.vars,
    };

    const subject = renderTemplate(isArabic ? template.subjectAr : template.subjectEn, vars).trim();
    const bodyContent = renderTemplate(isArabic ? template.bodyAr : template.bodyEn, vars).trim();

    if (!subject || !bodyContent) return;

    const html = await getEmailLayout({
      content: bodyContent,
      isArabic,
    });

    await sendEmail({
      to: user.email,
      subject,
      html,
      text: bodyContent.replace(/<[^>]*>/g, ''), // Strip HTML for plain text version
    });
  } catch (error) {
    console.error('Failed to send transactional email:', error);
  }
}

/**
 * Send a transactional email to a user based on their userId
 */
export async function sendUserEmailTemplate(input: {
  userId: string;
  key: EmailTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  await sendConfiguredUserEmailTemplate(input);
}

/**
 * Alias for sendUserEmailTemplate for consistency with WhatsApp naming
 */
export async function sendUserTransactionEmail(input: {
  userId: string;
  key: EmailTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  await sendConfiguredUserEmailTemplate(input);
}

/**
 * Send email directly to an email address (not tied to a user)
 */
export async function sendDirectEmail(input: {
  to: string;
  key: EmailTransactionTemplateKey;
  vars?: TemplateVariables;
  preferredLanguage?: 'en' | 'ar';
}): Promise<void> {
  try {
    const settings = await getTemplateSettings();
    if (!settings.enabled) return;

    const template = settings.templates[input.key];
    if (!template || !template.enabled) return;

    const isArabic = input.preferredLanguage === 'ar';
    const vars = input.vars ?? {};

    const subject = renderTemplate(isArabic ? template.subjectAr : template.subjectEn, vars).trim();
    const bodyContent = renderTemplate(isArabic ? template.bodyAr : template.bodyEn, vars).trim();

    if (!subject || !bodyContent) return;

    const html = await getEmailLayout({
      content: bodyContent,
      isArabic,
    });

    await sendEmail({
      to: input.to,
      subject,
      html,
      text: bodyContent.replace(/<[^>]*>/g, ''),
    });
  } catch (error) {
    console.error('Failed to send direct transactional email:', error);
  }
}
