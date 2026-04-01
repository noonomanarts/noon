import 'server-only';

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  /** Resolves when the `ready` event fires after initialize(). */
  readyPromise: Promise<void> | null;
};

const defaultSettings: WhatsAppWwebjsSettings = {
  sessions: ['default'],
  primarySessionId: 'default',
};

// ---------------------------------------------------------------------------
// Global singleton state (survives HMR in dev + stays in production)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Retry delays between send attempts. 4 entries = 5 total attempts. */
const SEND_RETRY_DELAYS_MS = [2000, 4000, 6000, 8000];

/**
 * How long to wait for the `ready` event after client.initialize().
 * In Docker with Alpine + Chromium this routinely takes 20-60 s.
 */
const READY_TIMEOUT_MS = (() => {
  const raw = Number(process.env.WWEBJS_READY_TIMEOUT_MS || '90000');
  return Number.isFinite(raw) && raw >= 5000 ? Math.floor(raw) : 90000;
})();

const WHATSAPP_SEND_LOG_LEVEL = (process.env.WWEBJS_SEND_LOG_LEVEL || 'warn').trim().toLowerCase();
const LOG_LEVEL_SCORE: Record<'silent' | 'error' | 'warn' | 'info', number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return new Date();
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? 'Unknown error');
}

function logWhatsAppService(
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, unknown>
): void {
  const configured =
    WHATSAPP_SEND_LOG_LEVEL === 'silent' ||
    WHATSAPP_SEND_LOG_LEVEL === 'error' ||
    WHATSAPP_SEND_LOG_LEVEL === 'warn' ||
    WHATSAPP_SEND_LOG_LEVEL === 'info'
      ? WHATSAPP_SEND_LOG_LEVEL
      : 'warn';

  if (LOG_LEVEL_SCORE[level] > LOG_LEVEL_SCORE[configured]) {
    return;
  }

  const suffix = metadata ? ` ${JSON.stringify(metadata)}` : '';
  const line = `[wwebjs] ${message}${suffix}`;

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
}

// ---------------------------------------------------------------------------
// Chrome / Puppeteer helpers
// ---------------------------------------------------------------------------

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

  const removeSingletonLocksRecursively = (rootPath: string) => {
    if (!fs.existsSync(rootPath)) return;

    const stack = [rootPath];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }

        if (singletonFiles.includes(entry.name)) {
          try {
            fs.rmSync(fullPath, { force: true });
          } catch {
            // best-effort
          }
        }
      }
    }
  };

  const terminateLingeringChromiumProcesses = () => {
    try {
      const psOutput = execSync('ps -eo pid=,args=', { encoding: 'utf8' });
      const profileHint = path.join('.wwebjs_auth', `session-${sessionId}`);

      const candidates = psOutput
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/^(\d+)\s+(.*)$/);
          if (!match) return null;
          return { pid: Number(match[1]), args: match[2] };
        })
        .filter((item): item is { pid: number; args: string } => Boolean(item))
        .filter((item) => {
          const args = item.args.toLowerCase();
          const isChromiumProcess =
            args.includes('chromium') || args.includes('chrome') || args.includes('google-chrome');
          const isWhatsAppProfile =
            item.args.includes(profileHint) || item.args.includes('.wwebjs_auth');
          return isChromiumProcess && isWhatsAppProfile && item.pid !== process.pid;
        });

      for (const proc of candidates) {
        try {
          process.kill(proc.pid, 'SIGTERM');
        } catch {
          // already dead
        }
      }

      if (candidates.length > 0) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
      }

      for (const proc of candidates) {
        try {
          process.kill(proc.pid, 'SIGKILL');
        } catch {
          // already dead
        }
      }
    } catch {
      // ps unavailable — continue with lock cleanup only
    }
  };

  terminateLingeringChromiumProcesses();

  for (const profilePath of profileCandidates) {
    removeSingletonLocksRecursively(profilePath);
    for (const lockName of singletonFiles) {
      const lockPath = path.join(profilePath, lockName);
      try {
        if (fs.existsSync(lockPath)) {
          fs.rmSync(lockPath, { force: true });
        }
      } catch {
        // best-effort
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Phone number normalization
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Session ID helpers
// ---------------------------------------------------------------------------

function sanitizeSessionId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 64);
}

// ---------------------------------------------------------------------------
// Managed session map
// ---------------------------------------------------------------------------

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
    readyPromise: null,
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

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------

async function readSettings(): Promise<WhatsAppWwebjsSettings> {
  const saved = await getAdminSettingsByKey<Partial<WhatsAppWwebjsSettings>>(WHATSAPP_WWEBJS_SETTINGS_KEY);
  const rawSessions = Array.isArray(saved?.sessions) ? saved?.sessions : defaultSettings.sessions;
  const sessions = rawSessions
    .map((value) => sanitizeSessionId(String(value)))
    .filter(Boolean);

  const uniqSessions = Array.from(new Set(sessions.length > 0 ? sessions : defaultSettings.sessions));
  const primaryCandidate = sanitizeSessionId(saved?.primarySessionId ?? defaultSettings.primarySessionId);
  const primarySessionId = uniqSessions.includes(primaryCandidate) ? primaryCandidate : uniqSessions[0];

  return { sessions: uniqSessions, primarySessionId };
}

async function saveSettings(settings: WhatsAppWwebjsSettings): Promise<void> {
  await upsertAdminSettings<WhatsAppWwebjsSettings>({
    key: WHATSAPP_WWEBJS_SETTINGS_KEY,
    value: settings,
  });
}

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

async function destroySessionClient(session: ManagedSession): Promise<void> {
  const client = session.client;
  if (!client) return;

  try {
    await client.destroy();
  } catch {
    // Ignore teardown errors.
  }

  session.client = null;
  session.readyPromise = null;
}

/**
 * Core initialization.
 *
 * Key design: the function awaits **both** `client.initialize()` **and** the
 * `ready` event (with a generous timeout). This guarantees the session is
 * truly operational before the promise resolves — which is the root cause of
 * the Docker "authenticated but hasWid=false" failures.
 */
async function initializeSession(sessionId: string, forceRestart = false): Promise<void> {
  const session = getOrCreateManagedSession(sessionId);

  // If another caller is already initializing, piggy-back on that.
  if (session.initializingPromise) {
    await session.initializingPromise;
    if (!forceRestart) return;
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
      // ── Build readyPromise BEFORE client events can fire ──────────
      let resolveReady!: () => void;
      let rejectReady!: (err: Error) => void;
      const readyPromise = new Promise<void>((res, rej) => {
        resolveReady = res;
        rejectReady = rej;
      });
      session.readyPromise = readyPromise;

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: resolveAuthDataPath(),
        }),
        puppeteer: {
          headless: true,
          executablePath: chromeExecutablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-accelerated-2d-canvas',
          ],
        },
      });

      // ── Event listeners ──────────────────────────────────────────
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
        logWhatsAppService('info', 'Session authenticated, waiting for ready event.', {
          sessionId,
        });
      });

      client.on('ready', () => {
        patchSessionState(session, {
          status: 'ready',
          qrCodeDataUrl: null,
          lastError: null,
        });
        logWhatsAppService('info', 'Session ready (wid available).', {
          sessionId,
          hasWid: Boolean(client.info?.wid),
        });
        resolveReady();
      });

      client.on('auth_failure', (message) => {
        patchSessionState(session, {
          status: 'auth_failure',
          lastError: message || 'Authentication failure.',
        });
        rejectReady(new Error(message || 'Authentication failure.'));
      });

      client.on('disconnected', (reason) => {
        patchSessionState(session, {
          status: 'disconnected',
          lastError: reason || null,
        });
        rejectReady(new Error(reason || 'Disconnected.'));
      });

      session.client = client;

      try {
        // ── Start Chromium + WhatsApp Web ────────────────────────────
        await client.initialize();

        logWhatsAppService('info', 'client.initialize() resolved, waiting for ready event.', {
          sessionId,
          status: session.status,
          hasWid: Boolean(client.info?.wid),
        });

        // ── Wait for the `ready` event with a timeout ────────────────
        // This is THE critical fix: in Docker, `ready` fires 10-60 s
        // AFTER initialize() resolves.
        const readyOrTimeout = await Promise.race([
          readyPromise.then(() => 'ready' as const),
          waitMs(READY_TIMEOUT_MS).then(() => 'timeout' as const),
        ]);

        if (readyOrTimeout === 'timeout') {
          // Check if the client is actually functional despite no event
          if (client.info?.wid) {
            patchSessionState(session, { status: 'ready', lastError: null });
            logWhatsAppService('warn', 'Ready event timed out but WID is available — treating as ready.', {
              sessionId,
            });
          } else if (session.status === 'qr') {
            // User needs to scan QR — that's not an error, just waiting.
            logWhatsAppService('info', 'Waiting for QR scan.', { sessionId });
          } else {
            logWhatsAppService('warn', 'Ready event timed out.', {
              sessionId,
              status: session.status,
              hasWid: false,
              timeoutMs: READY_TIMEOUT_MS,
            });
          }
        }

        return; // Success path
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

// ---------------------------------------------------------------------------
// Bootstrap (called lazily on first API hit)
// ---------------------------------------------------------------------------

async function ensureConfiguredSessionsBootstrapped(): Promise<void> {
  const existingBootstrapPromise = getBootstrapPromise();
  if (existingBootstrapPromise) {
    await existingBootstrapPromise;
    return;
  }

  const nextBootstrapPromise = (async () => {
    const settings = await readSettings();
    await Promise.allSettled(settings.sessions.map((sid) => initializeSession(sid)));
  })();

  setBootstrapPromise(nextBootstrapPromise);

  try {
    await nextBootstrapPromise;
  } finally {
    setBootstrapPromise(null);
  }
}

// ---------------------------------------------------------------------------
// Readiness helpers
// ---------------------------------------------------------------------------

function isSessionReadyForSend(session: ManagedSession): boolean {
  return Boolean(session.client && session.status === 'ready');
}

function isGetChatUndefinedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Cannot read properties of undefined \(reading 'getChat'\)/i.test(message);
}

function getSessionTelemetry(session: ManagedSession) {
  return {
    sessionId: session.sessionId,
    status: session.status,
    hasClient: Boolean(session.client),
    hasWid: Boolean(session.client?.info?.wid),
    updatedAt: session.updatedAt.toISOString(),
  };
}

/**
 * Wait for the session to reach `ready` state.
 * First waits for any in-flight readyPromise, then polls.
 */
async function waitUntilReady(session: ManagedSession, timeoutMs: number): Promise<boolean> {
  if (isSessionReadyForSend(session)) return true;

  // If a readyPromise exists (from initializeSession), race against timeout.
  if (session.readyPromise) {
    const result = await Promise.race([
      session.readyPromise.then(() => 'ready' as const).catch(() => 'failed' as const),
      waitMs(timeoutMs).then(() => 'timeout' as const),
    ]);
    if (result === 'ready' || isSessionReadyForSend(session)) return true;
    if (result === 'timeout') return false;
  }

  // Fallback: poll status
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isSessionReadyForSend(session)) return true;
    // Also check wid directly in case event was missed
    if (session.client?.info?.wid) {
      patchSessionState(session, { status: 'ready', lastError: null });
      return true;
    }
    await waitMs(500);
  }

  return isSessionReadyForSend(session);
}

// ---------------------------------------------------------------------------
// Send with recovery
// ---------------------------------------------------------------------------

async function sendMessageWithRecovery(
  session: ManagedSession,
  chatId: string,
  messageText: string
): Promise<number> {
  if (!session.client) {
    throw new Error('WhatsApp client is not initialized for this session.');
  }

  const maxAttempts = SEND_RETRY_DELAYS_MS.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await session.client.sendMessage(chatId, messageText);
      if (attempt > 1) {
        logWhatsAppService('info', 'Send recovered after retry.', {
          attempt,
          ...getSessionTelemetry(session),
        });
      }
      return attempt;
    } catch (error) {
      const message = safeErrorMessage(error);
      const isGetChatError = isGetChatUndefinedError(error);
      const canRetry = attempt < maxAttempts;

      logWhatsAppService(canRetry ? 'warn' : 'error', 'Send attempt failed.', {
        attempt,
        maxAttempts,
        chatId,
        error: message,
        isGetChatError,
        ...getSessionTelemetry(session),
      });

      if (!canRetry) {
        throw error;
      }

      // Recover: force-restart and wait for ready
      await initializeSession(session.sessionId, true);
      const ok = await waitUntilReady(session, READY_TIMEOUT_MS);
      if (!ok) {
        throw new Error('Sender session could not recover after restart.');
      }

      await waitMs(SEND_RETRY_DELAYS_MS[attempt - 1]);
    }
  }

  throw new Error('Unexpected send flow termination.');
}

// ---------------------------------------------------------------------------
// Public API: sessions management
// ---------------------------------------------------------------------------

export async function listWhatsAppSessions(): Promise<{
  sessions: WhatsAppSessionSnapshot[];
  primarySessionId: string;
}> {
  await ensureConfiguredSessionsBootstrapped();

  const settings = await readSettings();

  const sessions = settings.sessions.map((sessionId) => {
    const session = getOrCreateManagedSession(sessionId);
    const effectiveStatus: WhatsAppSessionStatus =
      session.status === 'authenticated' ? 'ready' : session.status;

    return {
      sessionId,
      isPrimary: sessionId === settings.primarySessionId,
      status: effectiveStatus,
      qrCodeDataUrl: session.qrCodeDataUrl,
      lastError: session.lastError,
      updatedAt: session.updatedAt.toISOString(),
    } satisfies WhatsAppSessionSnapshot;
  });

  return { sessions, primarySessionId: settings.primarySessionId };
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

  await saveSettings({ ...settings, primarySessionId: sessionId });
}

export async function restartWhatsAppSession(rawSessionId: string): Promise<void> {
  const sessionId = sanitizeSessionId(rawSessionId);
  if (!sessionId) {
    throw new Error('A valid session ID is required.');
  }

  await initializeSession(sessionId, true);
}

// ---------------------------------------------------------------------------
// Public API: send message
// ---------------------------------------------------------------------------

export async function sendWhatsAppTextViaManagedSession(input: {
  phoneNumber: string;
  text: string;
  sessionId?: string;
}): Promise<WhatsAppSendResult> {
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

  // ── Ensure session is initialized and READY ───────────────────────
  await initializeSession(resolvedSessionId);

  const session = getOrCreateManagedSession(resolvedSessionId);
  const getDiagnostics = (attempts?: number): WhatsAppSendDiagnostics => ({
    ...getSessionTelemetry(session),
    attempts,
  });

  // If not ready yet (bootstrap still completing), wait patiently.
  if (!isSessionReadyForSend(session)) {
    logWhatsAppService('info', 'Session not ready yet, waiting...', {
      chatId,
      ...getSessionTelemetry(session),
    });

    const becameReady = await waitUntilReady(session, READY_TIMEOUT_MS);

    if (!becameReady) {
      // One more attempt: force restart
      logWhatsAppService('info', 'Force-restarting session after wait timeout.', {
        chatId,
        ...getSessionTelemetry(session),
      });
      await initializeSession(resolvedSessionId, true);
      await waitUntilReady(session, READY_TIMEOUT_MS);
    }
  }

  // ── Final gate ─────────────────────────────────────────────────────
  if (!session.client) {
    logWhatsAppService('warn', 'Send aborted: client not initialized.', {
      chatId,
      ...getSessionTelemetry(session),
    });
    return {
      ok: false,
      status: 503,
      body: 'WhatsApp client is not initialized for this session.',
      diagnostics: getDiagnostics(0),
    };
  }

  if (!isSessionReadyForSend(session)) {
    logWhatsAppService('warn', 'Send aborted: session not ready.', {
      chatId,
      ...getSessionTelemetry(session),
    });
    const statusHint =
      session.status === 'qr'
        ? 'Scan the QR code in admin WhatsApp sessions page first.'
        : `Current session status is ${session.status}.`;

    return {
      ok: false,
      status: 503,
      body: `Sender session is not ready. ${statusHint}`,
      diagnostics: getDiagnostics(0),
    };
  }

  // ── Send ───────────────────────────────────────────────────────────
  try {
    logWhatsAppService('info', 'Send requested.', {
      chatId,
      textLength: messageText.length,
      ...getSessionTelemetry(session),
    });

    const attempts = await sendMessageWithRecovery(session, chatId, messageText);
    patchSessionState(session, { status: 'ready', lastError: null });

    logWhatsAppService('info', 'Send completed.', {
      chatId,
      ...getSessionTelemetry(session),
    });

    return {
      ok: true,
      status: 200,
      body: 'Message sent successfully.',
      diagnostics: getDiagnostics(attempts),
    };
  } catch (error) {
    const message = safeErrorMessage(error) || 'Failed to send message.';
    patchSessionState(session, { status: 'error', lastError: message });

    logWhatsAppService('error', 'Send failed permanently.', {
      chatId,
      error: message,
      ...getSessionTelemetry(session),
    });

    return {
      ok: false,
      status: 502,
      body: message,
      diagnostics: getDiagnostics(SEND_RETRY_DELAYS_MS.length + 1),
    };
  }
}
