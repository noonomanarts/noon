/**
 * Unified cron tick runner.
 *
 * Every job scheduled by the platform runs from a single endpoint
 * (`/api/cron/tick`) so operators only need to wire one external cron.
 * Each job is isolated — a failure in one does not abort the others.
 *
 * Jobs are idempotent: re-running the tick just processes whatever is
 * currently due.
 */

import { dispatchDueCalendarAppointmentReminders } from '@/lib/calendarReminders';
import { dispatchDueClassWhatsAppNotifications } from '@/lib/classWhatsAppNotifications';
import { processOutboxBatch } from '@/lib/notifications/outbox';
import { getSenderForChannel } from '@/lib/notifications/dispatchers';
import { dispatchBirthdayGreetings } from '@/lib/notifications/birthday';

export type TickJobResult =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; error: string };

export type TickResult = {
  ranAt: string;
  durationMs: number;
  jobs: Record<string, TickJobResult>;
};

async function safeRun<T>(fn: () => Promise<T>): Promise<TickJobResult> {
  try {
    const output = await fn();
    return { ok: true, output: (output as unknown) as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runCronTick(options?: { birthday?: boolean }): Promise<TickResult> {
  const startedAt = Date.now();
  const jobs: Record<string, TickJobResult> = {};

  // Outbox drains first — if upstream jobs enqueue more rows, the next tick
  // will pick them up.
  jobs.outbox_email = await safeRun(() =>
    processOutboxBatch('EMAIL', getSenderForChannel('EMAIL'), 50)
  );
  jobs.outbox_whatsapp = await safeRun(() =>
    processOutboxBatch('WHATSAPP', getSenderForChannel('WHATSAPP'), 50)
  );
  jobs.outbox_push = await safeRun(() =>
    processOutboxBatch('PUSH', getSenderForChannel('PUSH'), 50)
  );
  jobs.outbox_in_app = await safeRun(() =>
    processOutboxBatch('IN_APP', getSenderForChannel('IN_APP'), 100)
  );

  // Calendar appointment reminders (trainer reminders, start-time pings).
  jobs.calendar_reminders = await safeRun(() =>
    dispatchDueCalendarAppointmentReminders(200)
  );

  // Class workshop reminders + review requests (customer).
  jobs.class_whatsapp = await safeRun(() =>
    dispatchDueClassWhatsAppNotifications(200)
  );

  // Birthday greetings. Only runs once per day (dedupe_key stops duplicates
  // inside the same year), so it is cheap to invoke every tick, but callers
  // can opt to skip it for minute-granular ticks.
  if (options?.birthday !== false) {
    jobs.birthdays = await safeRun(() => dispatchBirthdayGreetings(200));
  }

  return {
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    jobs,
  };
}
