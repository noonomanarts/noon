import 'server-only';

import {
  checkNumberExists,
  getSessionDetails,
  phoneToChatId,
  readWahaSettings,
  sendText,
  wahaRequest,
  type WahaRequestResult,
} from '@/lib/whatsapp/wahaClient';

type RecoveryMode = 'none' | 'restart' | 'stop-start';

export type WhatsAppOtpSendResult = {
  ok: boolean;
  status: number;
  internalError?: string;
  diagnostics: {
    sessionId: string;
    sessionStatus: string;
    attempts: number;
    recovery: RecoveryMode;
  };
};

const READY_SESSION_STATES = new Set(['WORKING', 'READY', 'CONNECTED', 'AUTHENTICATED']);
const RECOVERABLE_STATUS_CODES = new Set([0, 408, 409, 422, 429]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSessionReady(status: string | null | undefined): boolean {
  if (!status) return false;
  return READY_SESSION_STATES.has(status.trim().toUpperCase());
}

function isRecoverableFailure(result: WahaRequestResult): boolean {
  return RECOVERABLE_STATUS_CODES.has(result.status) || result.status >= 500;
}

function isBrokenWebJsState(text: string): boolean {
  return /getChat|WPage\.evaluate|Evaluation failed|Cannot read properties of undefined/i.test(text);
}

function errorResult(error: unknown): WahaRequestResult {
  return {
    ok: false,
    status: 0,
    data: null,
    text: error instanceof Error ? error.message : 'WhatsApp request failed.',
  };
}

async function safeSendText(
  settings: Awaited<ReturnType<typeof readWahaSettings>>,
  session: string,
  chatId: string,
  text: string,
): Promise<WahaRequestResult> {
  return sendText(settings, session, chatId, text).catch(errorResult);
}

async function waitForSessionReady(
  settings: Awaited<ReturnType<typeof readWahaSettings>>,
  session: string,
  timeoutMs = 20_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 'UNKNOWN';

  while (Date.now() < deadline) {
    const details = await getSessionDetails(settings, session).catch(() => null);
    if (details?.status) lastStatus = details.status;
    if (details && isSessionReady(details.status)) return details.status;
    await sleep(1_000);
  }

  return lastStatus;
}

async function restartSession(
  settings: Awaited<ReturnType<typeof readWahaSettings>>,
  session: string,
): Promise<boolean> {
  const result = await wahaRequest(
    settings,
    `/api/sessions/${encodeURIComponent(session)}/restart`,
    { method: 'POST', timeoutMs: 15_000 },
  ).catch(() => null);

  return Boolean(result?.ok);
}

async function hardCycleSession(
  settings: Awaited<ReturnType<typeof readWahaSettings>>,
  session: string,
): Promise<boolean> {
  const stop = await wahaRequest(
    settings,
    `/api/sessions/${encodeURIComponent(session)}/stop`,
    { method: 'POST', timeoutMs: 15_000 },
  ).catch(() => null);

  if (!stop?.ok && stop?.status !== 409) return false;

  await sleep(1_000);

  const start = await wahaRequest(
    settings,
    `/api/sessions/${encodeURIComponent(session)}/start`,
    { method: 'POST', timeoutMs: 15_000 },
  ).catch(() => null);

  return Boolean(start?.ok);
}

/**
 * Sends authentication OTP messages through WAHA with recovery tailored to
 * WEBJS failures. A session may report WORKING while its browser-side Store is
 * broken; the characteristic `getChat`/evaluation error therefore triggers a
 * restart even when the session status endpoint still looks healthy.
 */
export async function sendWhatsAppOtp(input: {
  phoneNumber: string;
  text: string;
}): Promise<WhatsAppOtpSendResult> {
  const settings = await readWahaSettings();
  const session = settings.activeSession;
  const fallbackChatId = phoneToChatId(input.phoneNumber);

  if (!session || !fallbackChatId) {
    return {
      ok: false,
      status: 400,
      internalError: !session ? 'No active WhatsApp session configured.' : 'Invalid phone number.',
      diagnostics: {
        sessionId: session || 'none',
        sessionStatus: 'UNKNOWN',
        attempts: 0,
        recovery: 'none',
      },
    };
  }

  // WAHA can return the canonical chat id (including newer identifier forms).
  // A failed existence lookup must not block OTP delivery because it can also
  // fail when the session itself is temporarily unhealthy.
  const existence = await checkNumberExists(settings, session, input.phoneNumber).catch(() => null);
  const chatId = existence?.numberExists && existence.chatId ? existence.chatId : fallbackChatId;

  let sessionStatus = (await getSessionDetails(settings, session).catch(() => null))?.status ?? 'UNKNOWN';
  let recovery: RecoveryMode = 'none';
  let attempts = 0;

  // Recover an already unhealthy session before the first send.
  if (!isSessionReady(sessionStatus)) {
    recovery = 'restart';
    if (await restartSession(settings, session)) {
      sessionStatus = await waitForSessionReady(settings, session);
    }
  }

  let result = await safeSendText(settings, session, chatId, input.text.trim());
  attempts += 1;

  if (result.ok) {
    return {
      ok: true,
      status: result.status || 200,
      diagnostics: { sessionId: session, sessionStatus, attempts, recovery },
    };
  }

  if (!isRecoverableFailure(result)) {
    return {
      ok: false,
      status: result.status || 502,
      internalError: result.text.slice(0, 1_000),
      diagnostics: { sessionId: session, sessionStatus, attempts, recovery },
    };
  }

  // A WEBJS Store crash can still report WORKING. Restart on 5xx or the known
  // browser-evaluation signature instead of trusting the status probe alone.
  recovery = 'restart';
  if (await restartSession(settings, session)) {
    sessionStatus = await waitForSessionReady(settings, session);
  }

  result = await safeSendText(settings, session, chatId, input.text.trim());
  attempts += 1;

  if (result.ok) {
    return {
      ok: true,
      status: result.status || 200,
      diagnostics: { sessionId: session, sessionStatus, attempts, recovery },
    };
  }

  // If WEBJS is still in the same broken browser state, force a stop/start
  // cycle. This preserves authentication while rebuilding the engine process.
  if (isRecoverableFailure(result) && (result.status >= 500 || isBrokenWebJsState(result.text))) {
    recovery = 'stop-start';
    if (await hardCycleSession(settings, session)) {
      sessionStatus = await waitForSessionReady(settings, session);
      result = await safeSendText(settings, session, chatId, input.text.trim());
      attempts += 1;
    }
  }

  if (result.ok) {
    return {
      ok: true,
      status: result.status || 200,
      diagnostics: { sessionId: session, sessionStatus, attempts, recovery },
    };
  }

  return {
    ok: false,
    status: result.status || 503,
    internalError: result.text.slice(0, 1_000),
    diagnostics: { sessionId: session, sessionStatus, attempts, recovery },
  };
}
