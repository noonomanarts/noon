import 'server-only';

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { getAdminSettingsByKey, upsertAdminSettings } from '@/lib/db/adminSettings';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

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
  /** Non-null while initializeSession() is running. */
  initializingPromise: Promise<void> | null;
  /** Resolves when the wwebjs `ready` event fires after client.initialize(). */
  readyDeferred: PromiseDeferred | null;
  /** Timer handle for auto-reconnect delays. */
  reconnectTimer: ReturnType<typeof setTimeout> | null;
};

type PromiseDeferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: Error) => void;
  settled: boolean;
};

const defaultSettings: WhatsAppWwebjsSettings = {
  sessions: ['default'],
  primarySessionId: 'default',
};

// ═══════════════════════════════════════════════════════════════════════════
// Global singleton state
// ═══════════════════════════════════════════════════════════════════════════

type GlobalState = {
  __NOON_WWEBJS_SESSIONS__?: Map<string, ManagedSession>;
  __NOON_WWEBJS_BOOTSTRAP__?: Promise<void> | null;
};

const g = globalThis as typeof globalThis & GlobalState;
const sessions = g.__NOON_WWEBJS_SESSIONS__ ?? (g.__NOON_WWEBJS_SESSIONS__ = new Map());

function getBootstrapPromise(): Promise<void> | null {
  return g.__NOON_WWEBJS_BOOTSTRAP__ ?? null;
}
function setBootstrapPromise(v: Promise<void> | null): void {
  g.__NOON_WWEBJS_BOOTSTRAP__ = v;
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration (all tunable via env vars)
// ═══════════════════════════════════════════════════════════════════════════

/** Delays between send retries. length+1 = total attempts. */
const SEND_RETRY_DELAYS = [2_000, 4_000, 8_000];

/** Max time to wait for the `ready` event after client.initialize(). */
const READY_TIMEOUT = envInt('WWEBJS_READY_TIMEOUT_MS', 120_000, 10_000);

/** Delay before auto-reconnecting a disconnected session. */
const RECONNECT_DELAY = envInt('WWEBJS_RECONNECT_DELAY_MS', 5_000, 1_000);

/** Max auto-reconnect attempts before giving up (0 = unlimited). */
const MAX_RECONNECT_ATTEMPTS = envInt('WWEBJS_MAX_RECONNECT', 10, 0);

const LOG_LEVEL = (process.env.WWEBJS_SEND_LOG_LEVEL || 'info').trim().toLowerCase();
const LOG_SCORES: Record<string, number> = { silent: 0, error: 1, warn: 2, info: 3 };

function envInt(key: string, fallback: number, min: number): number {
  const raw = Number(process.env[key]);
  return Number.isFinite(raw) && raw >= min ? Math.floor(raw) : fallback;
}

// ═══════════════════════════════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════════════════════════════

function log(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>): void {
  const cfgScore = LOG_SCORES[LOG_LEVEL] ?? 2;
  if ((LOG_SCORES[level] ?? 2) > cfgScore) return;
  const line = `[wwebjs] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function safeMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e ?? 'Unknown error');
}

function makeDeferred(): PromiseDeferred {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  let settled = false;
  const promise = new Promise<void>((res, rej) => {
    resolve = () => { if (!settled) { settled = true; res(); } };
    reject = (err: Error) => { if (!settled) { settled = true; rej(err); } };
  });
  return { promise, resolve, reject, get settled() { return settled; } };
}

// ═══════════════════════════════════════════════════════════════════════════
// Chrome / Puppeteer
// ═══════════════════════════════════════════════════════════════════════════

function findChrome(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/opt/google/chrome/google-chrome',
    '/snap/bin/chromium',
  ].filter(Boolean) as string[];
  return candidates.find((c) => fs.existsSync(c));
}

/** Puppeteer args optimised for Docker / Alpine containers. */
const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage', // write to /tmp instead of shared memory
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-translate',
  '--disable-sync',
  '--no-first-run',
  '--metrics-recording-only',
  '--mute-audio',
];

function authDataPath(): string {
  return path.join(process.cwd(), '.wwebjs_auth');
}

function isLockError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e ?? '');
  return /profile appears to be in use|process_singleton_posix|chromium has locked/i.test(m);
}

function clearLocks(sessionId: string): void {
  const base = authDataPath();
  const dirs = [path.join(base, `session-${sessionId}`), path.join(base, 'session')];
  const lockNames = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

  // Kill lingering chromium processes for this session
  try {
    const ps = execSync('ps -eo pid=,args=', { encoding: 'utf8' });
    const hint = path.join('.wwebjs_auth', `session-${sessionId}`);
    ps.split('\n')
      .map((l) => l.trim().match(/^(\d+)\s+(.*)$/))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .filter(([, , args]) => {
        const a = args.toLowerCase();
        return (a.includes('chromium') || a.includes('chrome')) &&
          (args.includes(hint) || args.includes('.wwebjs_auth'));
      })
      .forEach(([, pid]) => {
        try { process.kill(Number(pid), 'SIGKILL'); } catch { /* */ }
      });
  } catch { /* ps not available */ }

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop()!;
      try {
        for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
          const full = path.join(cur, e.name);
          if (e.isDirectory()) stack.push(full);
          else if (lockNames.includes(e.name)) try { fs.rmSync(full, { force: true }); } catch { /* */ }
        }
      } catch { /* */ }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Phone normalisation
// ═══════════════════════════════════════════════════════════════════════════

function phoneToChatId(phone: string): string | null {
  let d = phone.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 8) d = `968${d}`;
  return d.length >= 8 ? `${d}@c.us` : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Session management
// ═══════════════════════════════════════════════════════════════════════════

function sanitize(id: string): string {
  return id.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 64);
}

function getSession(id: string): ManagedSession {
  const existing = sessions.get(id);
  if (existing) return existing;
  const s: ManagedSession = {
    sessionId: id,
    client: null,
    status: 'not_initialized',
    qrCodeDataUrl: null,
    lastError: null,
    updatedAt: new Date(),
    initializingPromise: null,
    readyDeferred: null,
    reconnectTimer: null,
  };
  sessions.set(id, s);
  return s;
}

function patch(s: ManagedSession, p: Partial<Pick<ManagedSession, 'status' | 'qrCodeDataUrl' | 'lastError'>>) {
  if (p.status !== undefined) s.status = p.status;
  if (p.qrCodeDataUrl !== undefined) s.qrCodeDataUrl = p.qrCodeDataUrl;
  if (p.lastError !== undefined) s.lastError = p.lastError;
  s.updatedAt = new Date();
}

function telemetry(s: ManagedSession) {
  return {
    sessionId: s.sessionId,
    status: s.status,
    hasClient: Boolean(s.client),
    hasWid: Boolean(s.client?.info?.wid),
    updatedAt: s.updatedAt.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Settings persistence
// ═══════════════════════════════════════════════════════════════════════════

async function readSettings(): Promise<WhatsAppWwebjsSettings> {
  const raw = await getAdminSettingsByKey<Partial<WhatsAppWwebjsSettings>>(WHATSAPP_WWEBJS_SETTINGS_KEY);
  const list = (Array.isArray(raw?.sessions) ? raw.sessions : defaultSettings.sessions)
    .map((v) => sanitize(String(v)))
    .filter(Boolean);
  const uniq = [...new Set(list.length ? list : defaultSettings.sessions)];
  const primary = sanitize(raw?.primarySessionId ?? defaultSettings.primarySessionId);
  return { sessions: uniq, primarySessionId: uniq.includes(primary) ? primary : uniq[0] };
}

async function saveSettings(s: WhatsAppWwebjsSettings): Promise<void> {
  await upsertAdminSettings<WhatsAppWwebjsSettings>({ key: WHATSAPP_WWEBJS_SETTINGS_KEY, value: s });
}

// ═══════════════════════════════════════════════════════════════════════════
// Client lifecycle
// ═══════════════════════════════════════════════════════════════════════════

async function destroyClient(s: ManagedSession): Promise<void> {
  if (s.reconnectTimer) { clearTimeout(s.reconnectTimer); s.reconnectTimer = null; }
  const c = s.client;
  if (!c) return;
  s.client = null;
  if (s.readyDeferred && !s.readyDeferred.settled) {
    s.readyDeferred.reject(new Error('Client destroyed.'));
  }
  s.readyDeferred = null;
  try { await c.destroy(); } catch { /* ignore */ }
}

/**
 * Schedule an automatic reconnect after the session disconnects.
 */
function scheduleReconnect(s: ManagedSession, attemptNum: number): void {
  if (s.reconnectTimer) return; // already scheduled
  if (MAX_RECONNECT_ATTEMPTS > 0 && attemptNum >= MAX_RECONNECT_ATTEMPTS) {
    log('error', 'Max auto-reconnect attempts reached.', { sessionId: s.sessionId, attempts: attemptNum });
    return;
  }

  const delay = RECONNECT_DELAY * Math.min(attemptNum + 1, 5); // progressive backoff capped at 5x
  log('info', `Auto-reconnect scheduled in ${delay}ms.`, { sessionId: s.sessionId, attempt: attemptNum + 1 });

  s.reconnectTimer = setTimeout(() => {
    s.reconnectTimer = null;
    initializeSession(s.sessionId, true).catch((err) => {
      log('error', 'Auto-reconnect failed.', { sessionId: s.sessionId, error: safeMsg(err) });
      scheduleReconnect(s, attemptNum + 1);
    });
  }, delay);
}

/**
 * Initialize a WhatsApp session.
 *
 * Critical design: we wait for the `ready` event (with timeout) BEFORE
 * resolving. This prevents the "authenticated but hasWid=false" failures
 * that occur in Docker where `ready` fires 10-60s after initialize().
 */
async function initializeSession(sessionId: string, forceRestart = false): Promise<void> {
  const s = getSession(sessionId);

  if (s.initializingPromise) {
    await s.initializingPromise;
    if (!forceRestart) return;
  }

  if (forceRestart) await destroyClient(s);
  if (s.client && !forceRestart) return;

  const work = (async () => {
    patch(s, { status: 'initializing', qrCodeDataUrl: null, lastError: null });
    const chrome = findChrome();
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      // ── Deferred for `ready` event ──────────────────────────────
      const deferred = makeDeferred();
      s.readyDeferred = deferred;

      const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId, dataPath: authDataPath() }),
        puppeteer: {
          headless: true,
          executablePath: chrome,
          args: CHROMIUM_ARGS,
          timeout: 60_000,
        },
      });

      // ── Events ──────────────────────────────────────────────────
      client.on('qr', (qr) => {
        void QRCode.toDataURL(qr)
          .then((url: string) => patch(s, { status: 'qr', qrCodeDataUrl: url, lastError: null }))
          .catch((e: unknown) => patch(s, {
            status: 'error',
            qrCodeDataUrl: null,
            lastError: e instanceof Error ? e.message : 'QR generation failed.',
          }));
      });

      client.on('authenticated', () => {
        patch(s, { status: 'authenticated', qrCodeDataUrl: null, lastError: null });
        log('info', 'Authenticated, waiting for ready…', { sessionId });
      });

      client.on('ready', () => {
        patch(s, { status: 'ready', qrCodeDataUrl: null, lastError: null });
        log('info', 'Session READY.', { sessionId, wid: String(client.info?.wid ?? 'unknown') });
        deferred.resolve();
      });

      client.on('auth_failure', (message) => {
        patch(s, { status: 'auth_failure', lastError: message || 'Auth failure.' });
        deferred.reject(new Error(message || 'Auth failure.'));
      });

      client.on('disconnected', (reason) => {
        log('warn', 'Session disconnected.', { sessionId, reason });
        patch(s, { status: 'disconnected', lastError: reason || null });
        deferred.reject(new Error(reason || 'Disconnected.'));
        // Auto-reconnect
        scheduleReconnect(s, 0);
      });

      // Track state changes for debugging
      client.on('change_state', (state) => {
        log('info', 'State changed.', { sessionId, state: String(state) });
      });

      s.client = client;

      try {
        // ── Launch Chromium & load WhatsApp Web ────────────────────
        log('info', 'Calling client.initialize()…', { sessionId, chrome, attempt });
        await client.initialize();
        log('info', 'client.initialize() resolved.', {
          sessionId,
          status: s.status,
          hasWid: Boolean(client.info?.wid),
        });

        // ── Wait for `ready` event ─────────────────────────────────
        // In Docker, this takes 10-90 seconds after initialize() resolves.
        if (s.status !== 'ready') {
          const outcome = await Promise.race([
            deferred.promise.then(() => 'ready' as const),
            wait(READY_TIMEOUT).then(() => 'timeout' as const),
          ]).catch(() => 'error' as const);

          if (outcome === 'timeout') {
            // Fallback: check if WID is actually available (event missed)
            if (client.info?.wid) {
              patch(s, { status: 'ready', lastError: null });
              log('warn', 'Ready timeout but WID found — marked ready.', { sessionId });
            } else if (s.status === 'qr') {
              log('info', 'Timeout: waiting for QR scan.', { sessionId });
            } else {
              log('warn', 'Ready timeout. Session may not be usable.', {
                sessionId, status: s.status, timeout: READY_TIMEOUT,
              });
            }
          } else if (outcome === 'error') {
            log('warn', 'Ready promise rejected.', { sessionId, status: s.status });
          }
        }

        return; // success
      } catch (err) {
        lastErr = err;
        await destroyClient(s);
        if (attempt === 0 && isLockError(err)) {
          clearLocks(sessionId);
          continue;
        }
      }
    }

    const msg = lastErr instanceof Error ? lastErr.message : 'Failed to initialize.';
    patch(s, { status: 'error', lastError: `${msg} (chrome=${chrome || 'not-found'})` });
  })();

  s.initializingPromise = work;
  try { await work; } finally { s.initializingPromise = null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════════════════════════════════════

async function bootstrap(): Promise<void> {
  const existing = getBootstrapPromise();
  if (existing) { await existing; return; }

  const p = (async () => {
    const cfg = await readSettings();
    await Promise.allSettled(cfg.sessions.map((id) => initializeSession(id)));
  })();
  setBootstrapPromise(p);
  try { await p; } finally { setBootstrapPromise(null); }
}

// ═══════════════════════════════════════════════════════════════════════════
// Readiness gate — the sender calls this to get a ready session
// ═══════════════════════════════════════════════════════════════════════════

function isReady(s: ManagedSession): boolean {
  return Boolean(s.client && s.status === 'ready');
}

/**
 * Wait for a session to become ready.
 * Leverages the readyDeferred + polling with WID fallback.
 */
async function ensureReady(s: ManagedSession, timeout: number): Promise<boolean> {
  if (isReady(s)) return true;

  // 1. Wait for the ready deferred if it exists
  if (s.readyDeferred && !s.readyDeferred.settled) {
    const r = await Promise.race([
      s.readyDeferred.promise.then(() => true).catch(() => false),
      wait(timeout).then(() => null),
    ]);
    if (r === true || isReady(s)) return true;
    if (r === null) {
      // Timeout — check WID fallback
      if (s.client?.info?.wid) {
        patch(s, { status: 'ready', lastError: null });
        return true;
      }
      return false;
    }
  }

  // 2. Poll (covers edge cases where deferred is already settled/rejected)
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (isReady(s)) return true;
    if (s.client?.info?.wid) {
      patch(s, { status: 'ready', lastError: null });
      return true;
    }
    await wait(500);
  }

  return isReady(s);
}

/**
 * Obtain a session that is guaranteed ready for sending, or throw.
 * This is the ONLY entry point the send function uses.
 */
async function getReadySession(sessionId: string): Promise<ManagedSession> {
  await initializeSession(sessionId);
  const s = getSession(sessionId);

  // Fast path
  if (isReady(s)) return s;

  // Wait for ready
  log('info', 'Waiting for session to become ready…', telemetry(s));
  let ready = await ensureReady(s, READY_TIMEOUT);

  if (!ready) {
    // Force-restart once
    log('info', 'Force-restarting session.', telemetry(s));
    await initializeSession(sessionId, true);
    ready = await ensureReady(s, READY_TIMEOUT);
  }

  if (!ready) {
    throw new Error(`Session "${sessionId}" could not reach ready state (status=${s.status}).`);
  }

  return s;
}

// ═══════════════════════════════════════════════════════════════════════════
// Send with recovery
// ═══════════════════════════════════════════════════════════════════════════

function isGetChatError(e: unknown): boolean {
  return /Cannot read properties of undefined \(reading 'getChat'\)/i.test(safeMsg(e));
}

async function sendWithRecovery(
  session: ManagedSession,
  chatId: string,
  text: string,
): Promise<number> {
  if (!session.client) throw new Error('Client not initialized.');

  const maxAttempts = SEND_RETRY_DELAYS.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await session.client.sendMessage(chatId, text);
      if (attempt > 1) log('info', 'Send recovered.', { attempt, ...telemetry(session) });
      return attempt;
    } catch (err) {
      const canRetry = attempt < maxAttempts;
      log(canRetry ? 'warn' : 'error', 'Send attempt failed.', {
        attempt, maxAttempts, chatId, error: safeMsg(err),
        isGetChatError: isGetChatError(err), ...telemetry(session),
      });

      if (!canRetry) throw err;

      // Recover: restart + wait ready
      await initializeSession(session.sessionId, true);
      const ok = await ensureReady(session, READY_TIMEOUT);
      if (!ok) throw new Error('Could not recover session after send failure.');

      await wait(SEND_RETRY_DELAYS[attempt - 1]);
    }
  }

  throw new Error('Unexpected termination.');
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API — Session management
// ═══════════════════════════════════════════════════════════════════════════

export async function listWhatsAppSessions(): Promise<{
  sessions: WhatsAppSessionSnapshot[];
  primarySessionId: string;
}> {
  await bootstrap();
  const cfg = await readSettings();
  const list = cfg.sessions.map((id) => {
    const s = getSession(id);
    return {
      sessionId: id,
      isPrimary: id === cfg.primarySessionId,
      status: (s.status === 'authenticated' ? 'ready' : s.status) as WhatsAppSessionStatus,
      qrCodeDataUrl: s.qrCodeDataUrl,
      lastError: s.lastError,
      updatedAt: s.updatedAt.toISOString(),
    } satisfies WhatsAppSessionSnapshot;
  });
  return { sessions: list, primarySessionId: cfg.primarySessionId };
}

export async function addWhatsAppSession(rawId: string): Promise<void> {
  const id = sanitize(rawId);
  if (!id) throw new Error('Invalid session ID.');
  const cfg = await readSettings();
  if (!cfg.sessions.includes(id)) {
    await saveSettings({ ...cfg, sessions: [...cfg.sessions, id] });
  }
  await initializeSession(id);
}

export async function setPrimaryWhatsAppSession(rawId: string): Promise<void> {
  const id = sanitize(rawId);
  if (!id) throw new Error('Invalid session ID.');
  const cfg = await readSettings();
  if (!cfg.sessions.includes(id)) throw new Error('Session does not exist.');
  await saveSettings({ ...cfg, primarySessionId: id });
}

export async function restartWhatsAppSession(rawId: string): Promise<void> {
  const id = sanitize(rawId);
  if (!id) throw new Error('Invalid session ID.');
  await initializeSession(id, true);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API — Send message
// ═══════════════════════════════════════════════════════════════════════════

export async function sendWhatsAppTextViaManagedSession(input: {
  phoneNumber: string;
  text: string;
  sessionId?: string;
}): Promise<WhatsAppSendResult> {
  const text = input.text.trim();
  if (!text) return { ok: false, status: 400, body: 'Message text is required.' };

  const chatId = phoneToChatId(input.phoneNumber);
  if (!chatId) return { ok: false, status: 400, body: 'Invalid phone number.' };

  const cfg = await readSettings();
  const sid = sanitize(input.sessionId || cfg.primarySessionId);
  if (!sid) return { ok: false, status: 400, body: 'No session configured.' };
  if (!cfg.sessions.includes(sid)) return { ok: false, status: 404, body: `Session "${sid}" not found.` };

  const diag = (attempts?: number): WhatsAppSendDiagnostics => {
    const s = getSession(sid);
    return { ...telemetry(s), attempts };
  };

  // ── Get a ready session ────────────────────────────────────────────
  let session: ManagedSession;
  try {
    session = await getReadySession(sid);
  } catch (err) {
    const s = getSession(sid);
    const hint = s.status === 'qr'
      ? 'Scan the QR code in admin WhatsApp sessions page first.'
      : `Current status: ${s.status}. ${safeMsg(err)}`;
    log('warn', 'Send aborted: session not ready.', { chatId, ...telemetry(s) });
    return { ok: false, status: 503, body: `Sender session not ready. ${hint}`, diagnostics: diag(0) };
  }

  // ── Send ───────────────────────────────────────────────────────────
  try {
    log('info', 'Sending…', { chatId, textLen: text.length, ...telemetry(session) });
    const attempts = await sendWithRecovery(session, chatId, text);
    patch(session, { status: 'ready', lastError: null });
    log('info', 'Sent.', { chatId, attempts, ...telemetry(session) });
    return { ok: true, status: 200, body: 'Message sent.', diagnostics: diag(attempts) };
  } catch (err) {
    const msg = safeMsg(err);
    patch(session, { status: 'error', lastError: msg });
    log('error', 'Send failed.', { chatId, error: msg, ...telemetry(session) });
    return { ok: false, status: 502, body: msg, diagnostics: diag(SEND_RETRY_DELAYS.length + 1) };
  }
}
