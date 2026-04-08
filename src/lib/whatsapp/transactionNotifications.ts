import {
  defaultWhatsAppTransactionTemplatesSettings,
  getAdminSettingsByKey,
  sanitizeWhatsAppTransactionTemplatesSettings,
  type WhatsAppTransactionTemplateKey,
  type WhatsAppTransactionTemplatesSettings,
} from '@/lib/db/adminSettings';
import { getUserById } from '@/lib/db/users';
import { sendWhatsAppText } from '@/lib/whatsappClient';

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

async function getTemplateSettings(): Promise<WhatsAppTransactionTemplatesSettings> {
  const saved = await getAdminSettingsByKey<WhatsAppTransactionTemplatesSettings>('whatsapp-transaction-templates');
  return sanitizeWhatsAppTransactionTemplatesSettings(saved ?? defaultWhatsAppTransactionTemplatesSettings);
}

async function sendConfiguredUserWhatsAppTemplate(input: {
  userId: string;
  key: WhatsAppTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  try {
    const user = await getUserById(input.userId);
    if (!user?.phoneNumber) return;

    const settings = await getTemplateSettings();
    if (!settings.enabled) return;

    const template = settings.templates[input.key];
    if (!template || !template.enabled) return;

    const lang = normalizeLanguage(user.preferredLanguage);
    const baseText = lang === 'ar' ? template.ar : template.en;
    const vars: TemplateVariables = {
      name: user.fullName,
      ...input.vars,
    };

    const text = renderTemplate(baseText, vars).trim();
    if (!text) return;

    await sendWhatsAppText({
      phoneNumber: user.phoneNumber,
      text,
    });
  } catch (error) {
    console.error('Failed to send transactional WhatsApp message:', error);
  }
}

export async function sendUserWhatsAppTemplate(input: {
  userId: string;
  key: WhatsAppTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  await sendConfiguredUserWhatsAppTemplate(input);
}

export async function sendUserTransactionWhatsApp(input: {
  userId: string;
  key: WhatsAppTransactionTemplateKey;
  vars?: TemplateVariables;
}): Promise<void> {
  await sendConfiguredUserWhatsAppTemplate(input);
}
