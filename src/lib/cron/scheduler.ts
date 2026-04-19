/**
 * In-process cron scheduler.
 *
 * Runs `runCronTick()` every minute inside the Next.js server process so
 * the project does not need a separate cron container. Safe across HMR
 * reloads — a global flag prevents double-registration. Birthday greetings
 * are enabled only during the 08:00 local hour (dedupe_key prevents
 * duplicates if the tick fires multiple times within that hour).
 */

import { runCronTick } from './tick';

const STARTED = Symbol.for('noon.cron.scheduler.started');

type SchedulerGlobal = typeof globalThis & {
  [STARTED]?: boolean;
};

export function startInProcessScheduler(): void {
  const g = globalThis as SchedulerGlobal;
  if (g[STARTED]) return;
  g[STARTED] = true;

  const tz = process.env.CRON_TZ || 'Asia/Muscat';

  const tick = async () => {
    try {
      const hour = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          hour12: false,
        }).format(new Date()),
      );
      const birthday = hour === 8;
      const result = await runCronTick({ birthday });
      if (process.env.CRON_LOG === 'true') {
        console.log(`[cron] tick completed in ${result.durationMs}ms`);
      }
    } catch (error) {
      console.error('[cron] tick failed:', error);
    }
  };

  // Align first tick to the next minute boundary, then every 60s.
  const delay = 60_000 - (Date.now() % 60_000);
  setTimeout(() => {
    void tick();
    setInterval(() => {
      void tick();
    }, 60_000);
  }, delay);

  console.log(`[cron] in-process scheduler started (tz=${tz})`);
}
