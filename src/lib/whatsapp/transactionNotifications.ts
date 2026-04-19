/**
 * User-facing transactional WhatsApp API.
 *
 * Every send is rendered with the user's preferred language (falling back
 * to the site default) and enqueued into the notification outbox. Delivery,
 * retries and failure tracking are handled by the outbox worker.
 *
 * The functions retain their previous signatures so existing callers
 * continue to work; they now report `true` when a row was queued
 * successfully (template enabled, user has a phone number, etc.).
 */

import {
  defaultWhatsAppTransactionTemplatesSettings,
  getAdminSettingsByKey,
  sanitizeWhatsAppTransactionTemplatesSettings,
  type WhatsAppTransactionTemplateKey,
  type WhatsAppTransactionTemplatesSettings,
} from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';
import { enqueueNotification, scheduleOutboxDrain } from '@/lib/notifications/outbox';
import { renderTemplate, resolveUserLocale } from '@/lib/notifications/locale';
// Import for side effect: registers EMAIL/WHATSAPP/PUSH/IN_APP dispatchers with the outbox.
import '@/lib/notifications/dispatchers';

type TemplateVariables = Record<string, string | number | null | undefined>;

async function getTemplateSettings(): Promise<WhatsAppTransactionTemplatesSettings> {
  const saved = await getAdminSettingsByKey<WhatsAppTransactionTemplatesSettings>('whatsapp-transaction-templates');
  return sanitizeWhatsAppTransactionTemplatesSettings(saved ?? defaultWhatsAppTransactionTemplatesSettings);
}

async function enqueueUserWhatsApp(input: {
  userId: string;
  key: WhatsAppTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<boolean> {
  try {
    const user = await getUserById(input.userId);
    if (!user?.phoneNumber) return false;

    const settings = await getTemplateSettings();
    if (!settings.enabled) return false;

    const template = settings.templates[input.key];
    if (!template || !template.enabled) return false;

    const locale = await resolveUserLocale(user.preferredLanguage);
    const baseText = locale === 'ar' ? template.ar : template.en;
    const vars: TemplateVariables = {
      name: user.fullName,
      ...input.vars,
    };

    const text = renderTemplate(baseText, vars).trim();
    if (!text) return false;

    const row = await enqueueNotification({
      channel: 'WHATSAPP',
      userId: input.userId,
      templateKey: input.key,
      title: null,
      body: text,
      vars: vars as Record<string, unknown>,
      data: { phoneNumber: user.phoneNumber },
    });

    if (row) {
      scheduleOutboxDrain(['WHATSAPP']);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[whatsapp] enqueue failed:', error);
    return false;
  }
}

export async function sendUserWhatsAppTemplate(input: {
  userId: string;
  key: WhatsAppTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<boolean> {
  return enqueueUserWhatsApp(input);
}

export async function sendUserTransactionWhatsApp(input: {
  userId: string;
  key: WhatsAppTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<boolean> {
  return enqueueUserWhatsApp(input);
}
