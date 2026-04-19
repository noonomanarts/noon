/**
 * Shared helper to authorise cron/scheduler endpoints.
 *
 * A request is accepted if ANY of these is true:
 *   - `CRON_SECRET` env is set and the request carries it in one of:
 *       - header `x-cron-secret`
 *       - header `x-calendar-reminder-secret` (legacy)
 *       - query `?secret=...`
 *       - `Authorization: Bearer <secret>`
 *   - `CALENDAR_REMINDER_SECRET` env is set and matches (legacy env name)
 *   - The caller has a valid admin session cookie.
 *
 * This avoids the previous env-var mismatch (docker-compose set CRON_SECRET,
 * but the code only checked CALENDAR_REMINDER_SECRET, so automatic cron was
 * effectively unauthenticated and relied on admin cookie fallback).
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { getUserById } from '@/lib/db/users';

function pickSecretFromRequest(request: NextRequest): string | null {
  return (
    request.headers.get('x-cron-secret') ||
    request.headers.get('x-calendar-reminder-secret') ||
    request.nextUrl.searchParams.get('secret') ||
    (request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null)
  );
}

export async function isAuthorizedCronRequest(request: NextRequest): Promise<boolean> {
  const configured = [process.env.CRON_SECRET, process.env.CALENDAR_REMINDER_SECRET]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (configured.length > 0) {
    const provided = pickSecretFromRequest(request)?.trim();
    if (provided && configured.includes(provided)) {
      return true;
    }
  }

  // Fallback: interactive admin session (useful for manual triggering from
  // the admin panel).
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('noon_session')?.value;
  if (!sessionId) return false;
  const user = await getUserById(sessionId);
  return Boolean(user && user.role === 'ADMIN');
}
