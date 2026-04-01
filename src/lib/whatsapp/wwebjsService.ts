import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';

const WHATSAPP_WWEBJS_SETTINGS_KEY = 'whatsapp_wwebjs';

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
  lastError: string | null;
  updatedAt: string;
};

type WhatsAppWwebjsSettings = {
  sessions: string[];
  primarySessionId: string;
};

type ManagedSession = {
  sessionId: string;
  client: Client | null;
  status: WhatsAppSessionStatus;
  qrCodeDataUrl: string | null;
  lastError: string | null;
  updatedAt: Date;
  initializingPromise: Promise<void> | null;
};

const defaultSettings: WhatsAppWwebjsSettings = {
  sessions: ['default'],
  primarySessionId: 'default',
};

type WhatsAppWwebjsGlobalState = {
  __NOON_WWEBJS_MANAGED_SESSIONS__?: Map<string, ManagedSession>;
  __NOON_WWEBJS_BOOTSTRAP_PROMISE__?: Promise<void> | null;
};

const globalState = globalThis as typeof globalThis & WhatsAppWwebjsGlobalState;
const managedSessions =
  globalState.__NOON_WWEBJS_MANAGED_SESSIONS__ ??
  (globalState.__NOON_WWEBJS_MANAGED_SESSIONS__ = new Map<string, ManagedSession>());

function getBootstrapPromise(): Promise<void> | null {
  return globalState.__NOON_WWEBJS_BOOTSTRAP_PROMISE__ ?? null;
}

function setBootstrapPromise(value: Promise<void> | null): void {
  globalState.__NOON_WWEBJS_BOOTSTRAP_PROMISE__ = value;
}

function now() {
  return new Date();
}

function resolveChromeExecutablePath(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/opt/google/chrome/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ].filter((value): value is string => Boolean(value && value.trim()));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function sanitizeSessionId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 64);
}

function resolveAuthDataPath(): string {
  return path.join(process.cwd(), '.wwebjs_auth');
}

function isChromiumProfileLockError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /profile appears to be in use|process_singleton_posix|chromium has locked the profile/i.test(message);
}

function clearChromiumSingletonLocks(sessionId: string): void {
  const authDataPath = resolveAuthDataPath();
  const profileCandidates = [
    path.join(authDataPath, `session-${sessionId}`),
    path.join(authDataPath, 'session'),
  ];

  const singletonFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

  for (const profilePath of profileCandidates) {
    for (const lockName of singletonFiles) {
      const lockPath = path.join(profilePath, lockName);
      try {
        if (fs.existsSync(lockPath)) {
          fs.rmSync(lockPath, { force: true });
        }
      } catch {
        // Ignore lock cleanup errors; retry will still surface original init error if unresolved.
      }
    }
  }
}

function normalizePhoneToChatId(phone: string): string | null {
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

function getOrCreateManagedSession(sessionId: string): ManagedSession {
  const existing = managedSessions.get(sessionId);
  if (existing) {
    return existing;
  }

  const created: ManagedSession = {
    sessionId,
    client: null,
    status: 'not_initialized',
    qrCodeDataUrl: null,
    lastError: null,
    updatedAt: now(),
    initializingPromise: null,
  };

  managedSessions.set(sessionId, created);
  return created;
}

function patchSessionState(session: ManagedSession, patch: Partial<ManagedSession>) {
  if (typeof patch.status !== 'undefined') {
    session.status = patch.status;
  }

  if (typeof patch.qrCodeDataUrl !== 'undefined') {
    session.qrCodeDataUrl = patch.qrCodeDataUrl;
  }

  if (typeof patch.lastError !== 'undefined') {
    session.lastError = patch.lastError;
  }

  session.updatedAt = now();
}

async function readSettings(): Promise<WhatsAppWwebjsSettings> {
  const saved = await getAdminSettingsByKey<Partial<WhatsAppWwebjsSettings>>(WHATSAPP_WWEBJS_SETTINGS_KEY);
  const rawSessions = Array.isArray(saved?.sessions) ? saved?.sessions : defaultSettings.sessions;
  const sessions = rawSessions
    .map((value) => sanitizeSessionId(String(value)))
    .filter(Boolean);

  const uniqSessions = Array.from(new Set(sessions.length > 0 ? sessions : defaultSettings.sessions));
  const primaryCandidate = sanitizeSessionId(saved?.primarySessionId ?? defaultSettings.primarySessionId);
  const primarySessionId = uniqSessions.includes(primaryCandidate) ? primaryCandidate : uniqSessions[0];

  return {
    sessions: uniqSessions,
    primarySessionId,
  };
}

async function saveSettings(settings: WhatsAppWwebjsSettings): Promise<void> {
  await upsertAdminSettings<WhatsAppWwebjsSettings>({
    key: WHATSAPP_WWEBJS_SETTINGS_KEY,
    value: settings,
  });
}

async function destroySessionClient(session: ManagedSession): Promise<void> {
  const client = session.client;
  if (!client) return;

  try {
    await client.destroy();
  } catch {
    // Ignore teardown errors and continue rebuilding the client.
  }

  session.client = null;
}

async function initializeSession(sessionId: string, forceRestart = false): Promise<void> {
  const session = getOrCreateManagedSession(sessionId);

  if (session.initializingPromise) {
    await session.initializingPromise;
    return;
  }

  if (forceRestart) {
    await destroySessionClient(session);
  }

  if (session.client && !forceRestart) {
    return;
  }

  const initPromise = (async () => {
    patchSessionState(session, {
      status: 'initializing',
      qrCodeDataUrl: null,
      lastError: null,
    });

    const chromeExecutablePath = resolveChromeExecutablePath();

    let lastInitError: unknown = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: resolveAuthDataPath(),
        }),
        puppeteer: {
          headless: true,
          executablePath: chromeExecutablePath,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        },
      });

      client.on('qr', (qr) => {
        void QRCode.toDataURL(qr)
          .then((dataUrl: string) => {
            patchSessionState(session, {
              status: 'qr',
              qrCodeDataUrl: dataUrl,
              lastError: null,
            });
          })
          .catch((error: unknown) => {
            patchSessionState(session, {
              status: 'error',
              qrCodeDataUrl: null,
              lastError: error instanceof Error ? error.message : 'Failed to generate QR code.',
            });
          });
      });

      client.on('authenticated', () => {
        patchSessionState(session, {
          status: 'authenticated',
          qrCodeDataUrl: null,
          lastError: null,
        });
      });

      client.on('ready', () => {
        patchSessionState(session, {
          status: 'ready',
          qrCodeDataUrl: null,
          lastError: null,
        });
      });

      client.on('auth_failure', (message) => {
        patchSessionState(session, {
          status: 'auth_failure',
          lastError: message || 'Authentication failure.',
        });
      });

      client.on('disconnected', (reason) => {
        patchSessionState(session, {
          status: 'disconnected',
          lastError: reason || null,
        });
      });

      session.client = client;

      try {
        await client.initialize();
        return;
      } catch (error) {
        lastInitError = error;
        await destroySessionClient(session);

        if (attempt === 0 && isChromiumProfileLockError(error)) {
          clearChromiumSingletonLocks(sessionId);
          continue;
        }
      }
    }

    const baseMessage =
      lastInitError instanceof Error ? lastInitError.message : 'Failed to initialize WhatsApp session.';
    const withPath = `${baseMessage} (chromeExecutablePath=${chromeExecutablePath || 'not-found'})`;
    patchSessionState(session, {
      status: 'error',
      lastError: withPath,
    });
  })();

  session.initializingPromise = initPromise;

  try {
    await initPromise;
  } finally {
    session.initializingPromise = null;
  }
}

async function ensureConfiguredSessionsBootstrapped(): Promise<void> {
  const existingBootstrapPromise = getBootstrapPromise();
  if (existingBootstrapPromise) {
    await existingBootstrapPromise;
    return;
  }

  const nextBootstrapPromise = (async () => {
    const settings = await readSettings();
    await Promise.allSettled(settings.sessions.map((sessionId) => initializeSession(sessionId)));
  })();

  setBootstrapPromise(nextBootstrapPromise);

  try {
    await nextBootstrapPromise;
  } finally {
    setBootstrapPromise(null);
  }
}

export async function listWhatsAppSessions(): Promise<{
  sessions: WhatsAppSessionSnapshot[];
  primarySessionId: string;
}> {
  await ensureConfiguredSessionsBootstrapped();

  const settings = await readSettings();

  const sessions = settings.sessions.map((sessionId) => {
    const session = getOrCreateManagedSession(sessionId);

    return {
      sessionId,
      isPrimary: sessionId === settings.primarySessionId,
      status: session.status,
      qrCodeDataUrl: session.qrCodeDataUrl,
      lastError: session.lastError,
      updatedAt: session.updatedAt.toISOString(),
    } satisfies WhatsAppSessionSnapshot;
  });

  return {
    sessions,
    primarySessionId: settings.primarySessionId,
  };
}

export async function addWhatsAppSession(rawSessionId: string): Promise<void> {
  const sessionId = sanitizeSessionId(rawSessionId);
  if (!sessionId) {
    throw new Error('Session ID is required and can only contain letters, numbers, dash, and underscore.');
  }

  const settings = await readSettings();
  if (!settings.sessions.includes(sessionId)) {
    const updatedSettings: WhatsAppWwebjsSettings = {
      ...settings,
      sessions: [...settings.sessions, sessionId],
    };
    await saveSettings(updatedSettings);
  }

  await initializeSession(sessionId);
}

export async function setPrimaryWhatsAppSession(rawSessionId: string): Promise<void> {
  const sessionId = sanitizeSessionId(rawSessionId);
  if (!sessionId) {
    throw new Error('A valid session ID is required.');
  }

  const settings = await readSettings();
  if (!settings.sessions.includes(sessionId)) {
    throw new Error('The selected session does not exist.');
  }

  await saveSettings({
    ...settings,
    primarySessionId: sessionId,
  });
}

export async function restartWhatsAppSession(rawSessionId: string): Promise<void> {
  const sessionId = sanitizeSessionId(rawSessionId);
  if (!sessionId) {
    throw new Error('A valid session ID is required.');
  }

  await initializeSession(sessionId, true);
}

export async function sendWhatsAppTextViaManagedSession(input: {
  phoneNumber: string;
  text: string;
  sessionId?: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const messageText = input.text.trim();
  if (!messageText) {
    return { ok: false, status: 400, body: 'Message text is required.' };
  }

  const chatId = normalizePhoneToChatId(input.phoneNumber);
  if (!chatId) {
    return { ok: false, status: 400, body: 'Invalid phone number.' };
  }

  const settings = await readSettings();
  const resolvedSessionId = sanitizeSessionId(input.sessionId || settings.primarySessionId);
  if (!resolvedSessionId) {
    return { ok: false, status: 400, body: 'No WhatsApp sender session is configured.' };
  }

  if (!settings.sessions.includes(resolvedSessionId)) {
    return { ok: false, status: 404, body: `Session "${resolvedSessionId}" does not exist.` };
  }

  await initializeSession(resolvedSessionId);

  const session = getOrCreateManagedSession(resolvedSessionId);
  if (!session.client) {
    return { ok: false, status: 503, body: 'WhatsApp client is not initialized for this session.' };
  }

  if (session.status !== 'ready') {
    const statusHint =
      session.status === 'qr'
        ? 'Scan the QR code in admin WhatsApp sessions page first.'
        : `Current session status is ${session.status}.`;

    return { ok: false, status: 503, body: `Sender session is not ready. ${statusHint}` };
  }

  try {
    await session.client.sendMessage(chatId, messageText);
    patchSessionState(session, {
      status: 'ready',
      lastError: null,
    });

    return {
      ok: true,
      status: 200,
      body: 'Message sent successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message.';
    patchSessionState(session, {
      status: 'error',
      lastError: message,
    });

    return {
      ok: false,
      status: 502,
      body: message,
    };
  }
}
