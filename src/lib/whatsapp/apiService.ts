import 'server-only';

import {
  defaultWhatsAppAdminSettings,
  getAdminSettingsByKey,
  type WhatsAppAdminSettings,
  upsertAdminSettings,
} from '@/lib/db/adminSettings';

export type WhatsAppSessionStatus =
  | 'not_initialized'
  | 'initializing'
  | 'qr'
  | 'authenticated'
  | 'ready'
  | 'disconnected'
  | 'auth_failure'
  | 'error';

export type WhatsAppSessionSnapshot = {
  sessionId: string;
  isPrimary: boolean;
  status: WhatsAppSessionStatus;
  qrCodeDataUrl: string | null;
  previewType: 'qr' | 'screenshot' | null;
  lastError: string | null;
  updatedAt: string;
};

type WhatsAppSendDiagnostics = {
  sessionId: string;
  status: WhatsAppSessionStatus;
  hasClient: boolean;
  hasWid: boolean;
  updatedAt: string;
  attempts?: number;
};

type WhatsAppSendResult = {
  ok: boolean;
  status: number;
  body: string;
  diagnostics?: WhatsAppSendDiagnostics;
};

type ExternalSession = {
  sessionId: string;
  status: WhatsAppSessionStatus;
  qrCodeDataUrl: string | null;
  previewType: 'qr' | 'screenshot' | null;
  lastError: string | null;
  updatedAt: string;
};

function sanitizeSessionId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80);
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function toStatus(input: unknown): WhatsAppSessionStatus {
  const value = typeof input === 'string' ? input.trim().toLowerCase() : '';

  if (!value) return 'not_initialized';
  if (value.includes('qr') || value.includes('scan')) return 'qr';
  if (value.includes('ready') || value.includes('connected') || value.includes('working')) return 'ready';
  if (value.includes('auth') && value.includes('fail')) return 'auth_failure';
  if (value.includes('auth')) return 'authenticated';
  if (value.includes('init') || value.includes('start') || value.includes('boot')) return 'initializing';
  if (value.includes('disconnect') || value.includes('stop')) return 'disconnected';
  if (value.includes('error') || value.includes('fail')) return 'error';
  return 'not_initialized';
}

function toQrDataUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith('data:image/')) return raw;
  return /^[-A-Za-z0-9+/=]+$/.test(raw) ? `data:image/png;base64,${raw}` : null;
}

function toIsoDate(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

async function readWhatsAppSettings(): Promise<WhatsAppAdminSettings> {
  const saved = await getAdminSettingsByKey<WhatsAppAdminSettings>('whatsapp');
  return {
    sendApiUrl: (saved?.sendApiUrl ?? defaultWhatsAppAdminSettings.sendApiUrl).trim(),
    activeSession: sanitizeSessionId(saved?.activeSession ?? defaultWhatsAppAdminSettings.activeSession),
    apiCode: (saved?.apiCode ?? defaultWhatsAppAdminSettings.apiCode).trim(),
  };
}

function buildHeaders(apiCode: string): HeadersInit {
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

async function requestJson(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: unknown; text: string }> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
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

  return {
    ok: response.ok,
    status: response.status,
    data,
    text,
  };
}

function parseExternalSessions(data: unknown): ExternalSession[] {
  const nowIso = new Date().toISOString();
  const rawList = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { sessions?: unknown[] }).sessions)
      ? (data as { sessions: unknown[] }).sessions
      : data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)
        ? (data as { data: unknown[] }).data
        : [];

  const mapped = rawList
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const row = raw as Record<string, unknown>;

      const sessionId = sanitizeSessionId(
        String(row.name ?? row.session ?? row.sessionName ?? row.id ?? row.key ?? '')
      );
      if (!sessionId) return null;

      return {
        sessionId,
        status: toStatus(row.status ?? row.state),
        qrCodeDataUrl: toQrDataUrl(
          row.qr ?? row.qrcode ?? row.qrCode ?? row.qr_code ?? row.qrCodeDataUrl
        ),
        previewType: (toQrDataUrl(
          row.qr ?? row.qrcode ?? row.qrCode ?? row.qr_code ?? row.qrCodeDataUrl
        )
          ? 'qr'
          : null) as ExternalSession['previewType'],
        lastError:
          typeof row.lastError === 'string'
            ? row.lastError
            : typeof row.error === 'string'
              ? row.error
              : typeof row.reason === 'string'
                ? row.reason
                : null,
        updatedAt: toIsoDate(row.updatedAt ?? row.updated_at ?? row.lastSeen ?? nowIso),
      } satisfies ExternalSession;
    })
    .filter((item): item is ExternalSession => Boolean(item));

  return mapped;
}

function parseSessionDetails(sessionId: string, data: unknown): ExternalSession {
  const nowIso = new Date().toISOString();
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  return {
    sessionId,
    status: toStatus(row.status ?? row.state),
    qrCodeDataUrl: toQrDataUrl(
      row.qr ?? row.qrcode ?? row.qrCode ?? row.qr_code ?? row.qrCodeDataUrl
    ),
    previewType: toQrDataUrl(
      row.qr ?? row.qrcode ?? row.qrCode ?? row.qr_code ?? row.qrCodeDataUrl
    )
      ? 'qr'
      : null,
    lastError:
      typeof row.lastError === 'string'
        ? row.lastError
        : typeof row.error === 'string'
          ? row.error
          : typeof row.reason === 'string'
            ? row.reason
            : null,
    updatedAt: toIsoDate(row.updatedAt ?? row.updated_at ?? row.lastSeen ?? nowIso),
  };
}

async function fetchWahaSessionScreenshot(
  settings: WhatsAppAdminSettings,
  sessionId: string,
): Promise<string | null> {
  const base = normalizeBaseUrl(settings.sendApiUrl);
  const candidates = [
    wahaUrl(base, `/api/screenshot?session=${encodeURIComponent(sessionId)}`),
    wahaUrl(base, `/api/screenshot?name=${encodeURIComponent(sessionId)}`),
    wahaUrl(base, `/api/screenshot?sessionName=${encodeURIComponent(sessionId)}`),
    wahaUrl(base, '/api/screenshot'),
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: 'GET',
        headers: {
          ...buildHeaders(settings.apiCode),
          Accept: 'image/png,application/json;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) continue;

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.startsWith('image/')) {
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > 0) {
          return `data:${contentType || 'image/png'};base64,${bytes.toString('base64')}`;
        }
        continue;
      }

      const text = await response.text();
      if (!text) continue;

      const asDataUrl = toQrDataUrl(text);
      if (asDataUrl) return asDataUrl;

      try {
        const payload = JSON.parse(text) as Record<string, unknown>;
        const parsed = toQrDataUrl(
          payload.screenshot ?? payload.image ?? payload.data ?? payload.base64
        );
        if (parsed) return parsed;
      } catch {
        // no-op: not JSON
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

function wahaUrl(base: string, path: string): string {
  const normalizedBase = normalizeBaseUrl(base);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function fetchWahaSessionDetails(
  settings: WhatsAppAdminSettings,
  sessionId: string,
): Promise<ExternalSession> {
  const base = normalizeBaseUrl(settings.sendApiUrl);
  const result = await requestJson(
    wahaUrl(base, `/api/sessions/${encodeURIComponent(sessionId)}`),
    {
      method: 'GET',
      headers: buildHeaders(settings.apiCode),
    }
  );

  if (!result.ok) {
    throw new Error(`Failed to load WAHA session details (${result.status})`);
  }

  return parseSessionDetails(sessionId, result.data);
}

async function fetchWahaSessionQrCode(
  settings: WhatsAppAdminSettings,
  sessionId: string,
): Promise<string | null> {
  const base = normalizeBaseUrl(settings.sendApiUrl);
  const response = await fetch(
    wahaUrl(base, `/api/${encodeURIComponent(sessionId)}/auth/qr?format=image`),
    {
      method: 'GET',
      headers: {
        ...buildHeaders(settings.apiCode),
        Accept: 'image/png',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    }
  );

  if (!response.ok) return null;

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.startsWith('image/')) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) return null;
    return `data:${contentType || 'image/png'};base64,${bytes.toString('base64')}`;
  }

  const text = await response.text();
  if (!text) return null;

  return toQrDataUrl(text);
}

async function fetchExternalSessions(settings: WhatsAppAdminSettings): Promise<ExternalSession[]> {
  const base = normalizeBaseUrl(settings.sendApiUrl);
  if (!base) return [];

  const listResult = await requestJson(
    wahaUrl(base, '/api/sessions/'),
    {
      method: 'GET',
      headers: buildHeaders(settings.apiCode),
    }
  );

  if (!listResult.ok) {
    throw new Error(`Session list API failed with status ${listResult.status}`);
  }

  const baseSessions = parseExternalSessions(listResult.data);

  const detailedSessions = await Promise.all(
    baseSessions.map(async (session) => {
      let detailed = session;

      try {
        detailed = await fetchWahaSessionDetails(settings, session.sessionId);
      } catch {
        detailed = session;
      }

      if (detailed.status === 'ready' || detailed.status === 'authenticated') {
        const screenshot = await fetchWahaSessionScreenshot(settings, session.sessionId).catch(() => null);
        if (screenshot) {
          detailed = {
            ...detailed,
            qrCodeDataUrl: screenshot,
            previewType: 'screenshot',
          };
          return detailed;
        }
      }

      if (!detailed.qrCodeDataUrl) {
        const qr = await fetchWahaSessionQrCode(settings, session.sessionId).catch(() => null);
        if (qr) {
          detailed = {
            ...detailed,
            qrCodeDataUrl: qr,
            previewType: 'qr',
            status: detailed.status === 'not_initialized' ? 'qr' : detailed.status,
          };
        }
      }

      return detailed;
    })
  );

  return detailedSessions;
}

function phoneToChatId(phone: string): string | null {
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

export async function listWhatsAppSessions(): Promise<{
  sessions: WhatsAppSessionSnapshot[];
  primarySessionId: string;
}> {
  const settings = await readWhatsAppSettings();
  const sessions = await fetchExternalSessions(settings);

  return {
    sessions: sessions.map((session) => ({
      sessionId: session.sessionId,
      isPrimary: session.sessionId === settings.activeSession,
      status: session.status,
      qrCodeDataUrl: session.qrCodeDataUrl,
      previewType: session.previewType,
      lastError: session.lastError,
      updatedAt: session.updatedAt,
    })),
    primarySessionId: settings.activeSession,
  };
}

export async function addWhatsAppSession(rawId: string): Promise<void> {
  const sessionId = sanitizeSessionId(rawId);
  if (!sessionId) throw new Error('Invalid session ID.');

  const settings = await readWhatsAppSettings();
  const base = normalizeBaseUrl(settings.sendApiUrl);
  if (!base) throw new Error('WhatsApp API URL is not configured.');

  const result = await requestJson(
    wahaUrl(base, '/api/sessions/'),
    {
      method: 'POST',
      headers: buildHeaders(settings.apiCode),
      body: JSON.stringify({
        name: sessionId,
        start: true,
      }),
    }
  );

  if (!result.ok) {
    throw new Error((result.text || `Failed to create WAHA session (${result.status})`).slice(0, 300));
  }
}

export async function setPrimaryWhatsAppSession(rawId: string): Promise<void> {
  const sessionId = sanitizeSessionId(rawId);
  if (!sessionId) throw new Error('Invalid session ID.');

  const settings = await readWhatsAppSettings();
  await upsertAdminSettings({
    key: 'whatsapp',
    value: {
      ...settings,
      activeSession: sessionId,
    },
  });
}

export async function restartWhatsAppSession(rawId: string): Promise<void> {
  const sessionId = sanitizeSessionId(rawId);
  if (!sessionId) throw new Error('Invalid session ID.');

  const settings = await readWhatsAppSettings();
  const base = normalizeBaseUrl(settings.sendApiUrl);
  if (!base) throw new Error('WhatsApp API URL is not configured.');

  const result = await requestJson(
    wahaUrl(base, `/api/sessions/${encodeURIComponent(sessionId)}/restart`),
    {
      method: 'POST',
      headers: buildHeaders(settings.apiCode),
      body: JSON.stringify({}),
    }
  );

  if (!result.ok) {
    throw new Error((result.text || `Failed to restart WAHA session (${result.status})`).slice(0, 300));
  }
}

function buildSendUrlCandidates(sendApiUrl: string): string[] {
  const normalized = normalizeBaseUrl(sendApiUrl);
  if (!normalized) return [];

  if (/send(text|message)?$/i.test(normalized)) {
    return [normalized, `${normalized}/`];
  }

  return Array.from(new Set([
    normalized,
    `${normalized}/api/sendText`,
    `${normalized}/sendText`,
    `${normalized}/api/messages/sendText`,
    `${normalized}/api/messages/text`,
    `${normalized}/api/chats/sendText`,
  ]));
}

/**
 * Sends a WhatsApp text via the managed WAHA session.
 *
 * Fast-path: a single POST to `/api/sendText` with the canonical payload
 * WAHA documents. No preflight is performed — the session status is only
 * probed when the send fails with an ambiguous 4xx/5xx, at which point we
 * attempt one auto-restart + retry.
 */
export async function sendWhatsAppTextViaManagedSession(input: {
  phoneNumber: string;
  text: string;
  sessionId?: string;
}): Promise<WhatsAppSendResult> {
  const text = input.text.trim();
  if (!text) {
    return { ok: false, status: 400, body: 'Message text is required.' };
  }

  const chatId = phoneToChatId(input.phoneNumber);
  if (!chatId) {
    return { ok: false, status: 400, body: 'Invalid phone number.' };
  }

  const settings = await readWhatsAppSettings();
  const activeSession = sanitizeSessionId(input.sessionId ?? settings.activeSession);
  if (!activeSession) {
    return { ok: false, status: 400, body: 'No active WhatsApp session configured.' };
  }

  const base = normalizeBaseUrl(settings.sendApiUrl).replace(
    /\/(api\/)?(send[A-Za-z]+|messages\/[A-Za-z]+)$/i,
    ''
  );
  if (!base) {
    return { ok: false, status: 400, body: 'WhatsApp send API URL is not configured.' };
  }

  const url = `${base}/api/sendText`;
  const payload = JSON.stringify({ session: activeSession, chatId, text });

  const attempt = async (): Promise<{
    ok: boolean;
    status: number;
    text: string;
  }> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(settings.apiCode),
      body: payload,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const responseText = await response.text();
    return { ok: response.ok, status: response.status, text: responseText };
  };

  // First attempt.
  let result = await attempt().catch((error) => ({
    ok: false,
    status: 0,
    text: error instanceof Error ? error.message : 'Network error',
  }));

  if (result.ok) {
    return {
      ok: true,
      status: 200,
      body: 'Message sent.',
      diagnostics: {
        sessionId: activeSession,
        status: 'ready',
        hasClient: false,
        hasWid: false,
        updatedAt: new Date().toISOString(),
        attempts: 1,
      },
    };
  }

  // 422 from WAHA means "session is not WORKING" or validation. 5xx/0 are
  // transient. For 4xx other than 422 the request is most likely bad input
  // (e.g. invalid chatId) — do not restart.
  const recoverable =
    result.status === 0 ||
    result.status === 408 ||
    result.status === 409 ||
    result.status === 422 ||
    result.status === 429 ||
    result.status >= 500;

  if (!recoverable) {
    return {
      ok: false,
      status: result.status || 502,
      body: (result.text || 'Failed to send WhatsApp message.').slice(0, 500),
      diagnostics: {
        sessionId: activeSession,
        status: 'error',
        hasClient: false,
        hasWid: false,
        updatedAt: new Date().toISOString(),
        attempts: 1,
      },
    };
  }

  // Lazy preflight: check session status and, if recoverable, restart + poll
  // briefly before retrying the send once.
  const preflight = await fetchWahaSessionDetails(settings, activeSession).catch(() => null);
  const upperStatus = String(preflight?.status || '').toUpperCase();
  const needsRestart =
    !preflight ||
    ['STOPPED', 'FAILED', 'STARTING', 'ERROR', 'DISCONNECTED'].some((state) => upperStatus.includes(state));

  if (needsRestart) {
    try {
      await restartWhatsAppSession(activeSession);
      for (let i = 0; i < 6; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const recheck = await fetchWahaSessionDetails(settings, activeSession).catch(() => null);
        if (recheck && (recheck.status === 'ready' || recheck.status === 'authenticated')) {
          break;
        }
      }
    } catch (restartError) {
      console.warn('[whatsapp] auto-restart failed:', restartError);
    }
  }

  result = await attempt().catch((error) => ({
    ok: false,
    status: 0,
    text: error instanceof Error ? error.message : 'Network error',
  }));

  if (result.ok) {
    return {
      ok: true,
      status: 200,
      body: 'Message sent.',
      diagnostics: {
        sessionId: activeSession,
        status: 'ready',
        hasClient: false,
        hasWid: false,
        updatedAt: new Date().toISOString(),
        attempts: 2,
      },
    };
  }

  return {
    ok: false,
    status: result.status || 502,
    body: (result.text || 'Failed to send WhatsApp message.').slice(0, 500),
    diagnostics: {
      sessionId: activeSession,
      status: 'error',
      hasClient: false,
      hasWid: false,
      updatedAt: new Date().toISOString(),
      attempts: 2,
    },
  };
}

/**
 * Sends a document/file to a WhatsApp chat via the managed WAHA session.
 */
export async function sendWhatsAppFileViaManagedSession(input: {
  phoneNumber: string;
  data: string; // base64-encoded file content
  filename: string;
  mimetype: string;
  caption?: string;
  sessionId?: string;
}): Promise<WhatsAppSendResult> {
  const chatId = phoneToChatId(input.phoneNumber);
  if (!chatId) {
    return { ok: false, status: 400, body: 'Invalid phone number.' };
  }

  if (!input.data) {
    return { ok: false, status: 400, body: 'File content is required.' };
  }

  const settings = await readWhatsAppSettings();
  const activeSession = sanitizeSessionId(input.sessionId ?? settings.activeSession);
  if (!activeSession) {
    return { ok: false, status: 400, body: 'No active WhatsApp session configured.' };
  }

  const base = normalizeBaseUrl(settings.sendApiUrl).replace(
    /\/(api\/)?(send[A-Za-z]+|messages\/[A-Za-z]+)$/i,
    ''
  );
  if (!base) {
    return { ok: false, status: 400, body: 'WhatsApp send API URL is not configured.' };
  }

  const url = `${base}/api/sendFile`;
  const payload = JSON.stringify({
    session: activeSession,
    chatId,
    file: { mimetype: input.mimetype, filename: input.filename, data: input.data },
    caption: input.caption ?? '',
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(settings.apiCode),
      body: payload,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    const responseText = await response.text();
    if (response.ok) {
      return {
        ok: true,
        status: 200,
        body: 'File sent.',
        diagnostics: { sessionId: activeSession, status: 'ready', hasClient: false, hasWid: false, updatedAt: new Date().toISOString(), attempts: 1 },
      };
    }
    return { ok: false, status: response.status || 502, body: (responseText || 'Failed to send WhatsApp file.').slice(0, 500) };
  } catch (error) {
    return { ok: false, status: 0, body: (error instanceof Error ? error.message : 'Network error').slice(0, 500) };
  }
}
