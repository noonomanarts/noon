/**
 * User-facing transactional email API.
 *
 * Rather than delivering synchronously (which risks losing messages on any
 * transient SMTP failure), we render the template with the user's language
 * preferences and enqueue a row into the notification outbox. The outbox
 * worker then delivers with retry + backoff and records the final outcome.
 */

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
import { enqueueNotification, scheduleOutboxDrain } from '@/lib/notifications/outbox';
// Import for side effect: registers EMAIL/WHATSAPP/PUSH/IN_APP dispatchers with the outbox.
import '@/lib/notifications/dispatchers';
import { renderTemplate, resolveUserLocale } from '@/lib/notifications/locale';

type TemplateVariables = Record<string, string | number | null | undefined>;

async function getTemplateSettings(): Promise<EmailTransactionTemplatesSettings> {
  const saved = await getAdminSettingsByKey<EmailTransactionTemplatesSettings>('email-transaction-templates');
  return sanitizeEmailTransactionTemplatesSettings(saved ?? defaultEmailTransactionTemplatesSettings);
}

async function renderEmailPayload(input: {
  templateKey: EmailTransactionTemplateKey;
  vars: TemplateVariables;
  locale: 'en' | 'ar';
}): Promise<{ subject: string; html: string; text: string } | null> {
  const settings = await getTemplateSettings();
  if (!settings.enabled) return null;
  const template = settings.templates[input.templateKey];
  if (!template || !template.enabled) return null;

  const isArabic = input.locale === 'ar';
  const subject = renderTemplate(isArabic ? template.subjectAr : template.subjectEn, input.vars).trim();
  const bodyContent = renderTemplate(isArabic ? template.bodyAr : template.bodyEn, input.vars).trim();
  if (!subject || !bodyContent) return null;

  const html = await getEmailLayout({ content: bodyContent, isArabic });
  return {
    subject,
    html,
    text: bodyContent.replace(/<[^>]*>/g, ''),
  };
}

async function enqueueUserEmail(input: {
  userId: string;
  key: EmailTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  try {
    const user = await getUserById(input.userId);
    if (!user?.email) return;

    const locale = await resolveUserLocale(user.preferredLanguage);
    const vars: TemplateVariables = {
      name: user.fullName,
      ...input.vars,
    };

    const payload = await renderEmailPayload({ templateKey: input.key, vars, locale });
    if (!payload) return;

    await enqueueNotification({
      channel: 'EMAIL',
      userId: input.userId,
      templateKey: input.key,
      title: payload.subject,
      body: payload.html,
      vars: vars as Record<string, unknown>,
      data: { to: user.email, text: payload.text },
    });
    scheduleOutboxDrain(['EMAIL']);
  } catch (error) {
    console.error('[email] enqueue failed:', error);
  }
}

/**
 * Send a transactional email to a user based on their userId.
 * This now enqueues to the outbox; actual delivery happens asynchronously.
 */
export async function sendUserEmailTemplate(input: {
  userId: string;
  key: EmailTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  await enqueueUserEmail(input);
}

/** Alias for sendUserEmailTemplate for consistency with WhatsApp naming. */
export async function sendUserTransactionEmail(input: {
  userId: string;
  key: EmailTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  await enqueueUserEmail(input);
}

/**
 * Send an email directly to an email address (not tied to a user).
 * Routed through the outbox with the explicit recipient.
 */
export async function sendDirectEmail(input: {
  to: string;
  key: EmailTransactionTemplateKey;
  vars?: TemplateVariables;
  preferredLanguage?: 'en' | 'ar';
}): Promise<void> {
  try {
    const locale = input.preferredLanguage ?? 'en';
    const payload = await renderEmailPayload({
      templateKey: input.key,
      vars: input.vars ?? {},
      locale,
    });
    if (!payload) return;

    await enqueueNotification({
      channel: 'EMAIL',
      userId: null,
      templateKey: input.key,
      title: payload.subject,
      body: payload.html,
      vars: (input.vars ?? {}) as Record<string, unknown>,
      data: { to: input.to, text: payload.text },
    });
    scheduleOutboxDrain(['EMAIL']);
  } catch (error) {
    console.error('[email] enqueue direct failed:', error);
  }
}

/**
 * Send a simple raw email (non-templated) directly through SMTP. This path
 * bypasses the outbox — callers that need audit/retry should use the
 * templated or enqueue variants instead. Reserved for admin test emails
 * and one-off ops messages.
 */
export async function sendRawEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    const result = await sendEmail({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]*>/g, ''),
    });
    if (!result.ok) {
      console.error('[email] raw send failed:', result.error);
    }
    return result.ok;
  } catch (error) {
    console.error('[email] raw send threw:', error);
    return false;
  }
}
