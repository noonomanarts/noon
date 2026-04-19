/**
 * Next.js instrumentation hook.
 *
 * Runs once per server instance on startup. We use it to boot the
 * in-process cron scheduler so scheduled jobs (outbox, reminders,
 * birthdays) run without a separate cron container.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.CRON_IN_PROCESS === 'false') return;

  const { startInProcessScheduler } = await import('./lib/cron/scheduler');
  startInProcessScheduler();
}
