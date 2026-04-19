/**
 * WAHA (WhatsApp HTTP API) thin, canonical client.
 *
 * Unlike the legacy `apiService` helpers which try every known URL/payload
 * shape to stay compatible with old gateway variants, these helpers call
 * WAHA directly using the official contract documented at
 * https://waha.devlike.pro/swagger/openapi.json — a single HTTP request
 * per operation, so latency is predictable and low.
 *
 * All functions accept the session name explicitly (resolved by the caller
 * from admin settings). None of them performs preflight probing — failures
 * bubble up to the caller which can decide to restart the session and
 * retry.
 */

import 'server-only';

import {
  defaultWhatsAppAdminSettings,
  getAdminSettingsByKey,
  type WhatsAppAdminSettings,
} from '@/lib/db/adminSettings';

export type WahaRequestResult = {
  ok: boolean;
  status: number;
  data: unknown;
  text: string;
};

function sanitizeSession(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80);
}

export function normalizeBase(url: string): string {
  // Strip any accidentally-appended path (legacy configs stored full send URL).
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/(api\/)?(send[A-Za-z]+|messages\/[A-Za-z]+)$/i, '');
}

export async function readWahaSettings(): Promise<WhatsAppAdminSettings> {
  const saved = await getAdminSettingsByKey<WhatsAppAdminSettings>('whatsapp');
  return {
    sendApiUrl: (saved?.sendApiUrl ?? defaultWhatsAppAdminSettings.sendApiUrl).trim(),
    activeSession: sanitizeSession(saved?.activeSession ?? defaultWhatsAppAdminSettings.activeSession),
    apiCode: (saved?.apiCode ?? defaultWhatsAppAdminSettings.apiCode).trim(),
  };
}

export function buildWahaHeaders(apiCode: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (apiCode) {
    headers.Authorization = `Bearer ${apiCode}`;
    headers['X-Api-Key'] = apiCode;
  }
  return headers;
}

export async function wahaRequest(
  settings: WhatsAppAdminSettings,
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<WahaRequestResult> {
  const base = normalizeBase(settings.sendApiUrl);
  const timeoutMs = init.timeoutMs ?? 12_000;
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      ...buildWahaHeaders(settings.apiCode),
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = null;
    }
  }

  return { ok: response.ok, status: response.status, data, text };
}

export function phoneToChatId(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `968${digits}`;
  if (digits.length < 8) return null;
  return `${digits}@c.us`;
}

// -----------------------------------------------------------------------------
// Session state probe (lazy — only called on failure paths)
// -----------------------------------------------------------------------------

type SessionDetails = {
  sessionId: string;
  status: string;
};

export async function getSessionDetails(
  settings: WhatsAppAdminSettings,
  session: string
): Promise<SessionDetails | null> {
  const result = await wahaRequest(
    settings,
    `/api/sessions/${encodeURIComponent(session)}`,
    { method: 'GET', timeoutMs: 6_000 }
  ).catch(() => null);
  if (!result || !result.ok) return null;
  const row = (result.data && typeof result.data === 'object' ? result.data : {}) as Record<string, unknown>;
  const raw = String(row.status ?? row.state ?? '').toUpperCase();
  return { sessionId: session, status: raw };
}

// -----------------------------------------------------------------------------
// Core message senders (WAHA canonical endpoints)
// -----------------------------------------------------------------------------

type SendBody = Record<string, unknown>;

async function postCanonical(
  settings: WhatsAppAdminSettings,
  endpoint: string,
  body: SendBody,
  timeoutMs = 15_000
): Promise<WahaRequestResult> {
  return wahaRequest(settings, endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs,
  });
}

export type MediaInput = {
  /** Public URL to fetch the media from. */
  url?: string;
  /** Base64 payload (without the `data:` prefix) if the media is inline. */
  base64?: string;
  mimetype?: string;
  filename?: string;
};

function buildFilePayload(media: MediaInput): SendBody | null {
  if (media.url) {
    return {
      file: {
        url: media.url,
        ...(media.mimetype ? { mimetype: media.mimetype } : {}),
        ...(media.filename ? { filename: media.filename } : {}),
      },
    };
  }
  if (media.base64) {
    return {
      file: {
        data: media.base64,
        mimetype: media.mimetype ?? 'application/octet-stream',
        ...(media.filename ? { filename: media.filename } : {}),
      },
    };
  }
  return null;
}

export function sendText(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  text: string,
  extras: { replyTo?: string; linkPreview?: boolean } = {}
): Promise<WahaRequestResult> {
  return postCanonical(settings, '/api/sendText', {
    session,
    chatId,
    text,
    ...(extras.replyTo ? { reply_to: extras.replyTo } : {}),
    ...(typeof extras.linkPreview === 'boolean' ? { linkPreview: extras.linkPreview } : {}),
  });
}

export function sendImage(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  media: MediaInput,
  caption?: string
): Promise<WahaRequestResult> {
  const filePayload = buildFilePayload(media);
  if (!filePayload) {
    return Promise.resolve({ ok: false, status: 400, data: null, text: 'image requires url or base64' });
  }
  return postCanonical(settings, '/api/sendImage', {
    session,
    chatId,
    ...filePayload,
    ...(caption ? { caption } : {}),
  });
}

export function sendFile(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  media: MediaInput,
  caption?: string
): Promise<WahaRequestResult> {
  const filePayload = buildFilePayload(media);
  if (!filePayload) {
    return Promise.resolve({ ok: false, status: 400, data: null, text: 'file requires url or base64' });
  }
  return postCanonical(settings, '/api/sendFile', {
    session,
    chatId,
    ...filePayload,
    ...(caption ? { caption } : {}),
  });
}

export function sendVideo(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  media: MediaInput,
  caption?: string
): Promise<WahaRequestResult> {
  const filePayload = buildFilePayload(media);
  if (!filePayload) {
    return Promise.resolve({ ok: false, status: 400, data: null, text: 'video requires url or base64' });
  }
  return postCanonical(settings, '/api/sendVideo', {
    session,
    chatId,
    ...filePayload,
    ...(caption ? { caption } : {}),
    convert: true,
  });
}

export function sendVoice(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  media: MediaInput
): Promise<WahaRequestResult> {
  const filePayload = buildFilePayload(media);
  if (!filePayload) {
    return Promise.resolve({ ok: false, status: 400, data: null, text: 'voice requires url or base64' });
  }
  return postCanonical(settings, '/api/sendVoice', {
    session,
    chatId,
    ...filePayload,
    convert: true,
  });
}

export function sendLocation(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  location: { latitude: number; longitude: number; title?: string }
): Promise<WahaRequestResult> {
  return postCanonical(settings, '/api/sendLocation', {
    session,
    chatId,
    latitude: location.latitude,
    longitude: location.longitude,
    ...(location.title ? { title: location.title } : {}),
  });
}

export function sendContactVcard(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  contacts: Array<{ name: string; phone: string }>
): Promise<WahaRequestResult> {
  return postCanonical(settings, '/api/sendContactVcard', {
    session,
    chatId,
    contacts: contacts.map((contact) => ({
      vcard: [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${contact.name}`,
        `TEL;TYPE=CELL:${contact.phone}`,
        'END:VCARD',
      ].join('\n'),
    })),
  });
}

export function sendLinkPreview(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string,
  url: string,
  caption?: string
): Promise<WahaRequestResult> {
  return postCanonical(settings, '/api/sendLinkPreview', {
    session,
    chatId,
    url,
    ...(caption ? { caption } : {}),
  });
}

export function sendReaction(
  settings: WhatsAppAdminSettings,
  session: string,
  messageId: string,
  reaction: string
): Promise<WahaRequestResult> {
  return postCanonical(settings, '/api/reactions', {
    session,
    messageId,
    reaction,
  });
}

// -----------------------------------------------------------------------------
// Human-like behaviours: typing, seen
// -----------------------------------------------------------------------------

export function startTyping(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string
): Promise<WahaRequestResult> {
  return postCanonical(settings, '/api/startTyping', { session, chatId }, 5_000);
}

export function stopTyping(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string
): Promise<WahaRequestResult> {
  return postCanonical(settings, '/api/stopTyping', { session, chatId }, 5_000);
}

export function sendSeen(
  settings: WhatsAppAdminSettings,
  session: string,
  chatId: string
): Promise<WahaRequestResult> {
  return postCanonical(settings, '/api/sendSeen', { session, chatId }, 5_000);
}

// -----------------------------------------------------------------------------
// Contacts / profile lookups
// -----------------------------------------------------------------------------

export type ContactExistsResult = {
  phone: string;
  numberExists: boolean;
  chatId: string | null;
};

/**
 * Checks whether a phone number is registered on WhatsApp.
 * Returns a sparse record when the WAHA API rejects the request so the
 * caller can still display "unknown" instead of blocking the workflow.
 */
export async function checkNumberExists(
  settings: WhatsAppAdminSettings,
  session: string,
  phone: string
): Promise<ContactExistsResult> {
  const chatId = phoneToChatId(phone);
  if (!chatId) {
    return { phone, numberExists: false, chatId: null };
  }
  const digits = chatId.replace(/@c\.us$/, '');
  const result = await wahaRequest(
    settings,
    `/api/contacts/check-exists?phone=${encodeURIComponent(digits)}&session=${encodeURIComponent(session)}`,
    { method: 'GET', timeoutMs: 8_000 }
  ).catch(() => null);

  if (!result || !result.ok || !result.data || typeof result.data !== 'object') {
    return { phone, numberExists: false, chatId };
  }
  const row = result.data as Record<string, unknown>;
  const exists = Boolean(row.numberExists ?? row.exists ?? row.registered);
  return {
    phone,
    numberExists: exists,
    chatId: typeof row.chatId === 'string' && row.chatId ? row.chatId : chatId,
  };
}

export async function getContactProfilePicture(
  settings: WhatsAppAdminSettings,
  session: string,
  contactId: string
): Promise<string | null> {
  const result = await wahaRequest(
    settings,
    `/api/contacts/profile-picture?contactId=${encodeURIComponent(contactId)}&session=${encodeURIComponent(session)}`,
    { method: 'GET', timeoutMs: 8_000 }
  ).catch(() => null);
  if (!result || !result.ok || !result.data || typeof result.data !== 'object') return null;
  const row = result.data as Record<string, unknown>;
  if (typeof row.profilePictureURL === 'string' && row.profilePictureURL) return row.profilePictureURL;
  if (typeof row.url === 'string' && row.url) return row.url;
  return null;
}
