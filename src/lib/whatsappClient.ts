import {
  defaultWhatsAppAdminSettings,
  getAdminSettingsByKey,
  type WhatsAppAdminSettings,
} from '@/lib/db/adminSettings';

function normalizeApiKey(apiCode: string): string {
  const normalized = apiCode.trim();
  if (!normalized) return '';
  if (/^bearer\s+/i.test(normalized)) {
    return normalized.replace(/^bearer\s+/i, '').trim();
  }
  return normalized;
}

export function normalizePhoneToChatId(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length === 8) {
    digits = `968${digits}`;
  }

  if (digits.length < 8) return null;
  return `${digits}@c.us`;
}

function resolveSendTextEndpoint(sendApiUrl: string): string {
  const trimmed = sendApiUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  if (/\/api\/send(Text|Image)$/i.test(trimmed)) {
    return trimmed.replace(/\/api\/send(Text|Image)$/i, '/api/sendText');
  }

  return `${trimmed}/api/sendText`;
}

export async function sendWhatsAppText(input: {
  phoneNumber: string;
  text: string;
  session?: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const saved = await getAdminSettingsByKey<WhatsAppAdminSettings>('whatsapp');
  const settings = {
    ...defaultWhatsAppAdminSettings,
    ...(saved ?? {}),
  };

  const endpoint = resolveSendTextEndpoint(settings.sendApiUrl);
  if (!endpoint) {
    return { ok: false, status: 400, body: 'WhatsApp API URL is not configured.' };
  }

  const apiKey = normalizeApiKey(settings.apiCode);
  if (!apiKey) {
    return { ok: false, status: 400, body: 'WhatsApp API Code is not configured.' };
  }

  const chatId = normalizePhoneToChatId(input.phoneNumber);
  if (!chatId) {
    return { ok: false, status: 400, body: 'Invalid phone number.' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      chatId,
      reply_to: null,
      text: input.text,
      linkPreview: true,
      linkPreviewHighQuality: false,
      session: input.session || settings.activeSession || 'default',
    }),
  });

  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}
