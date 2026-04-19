/**
 * Unified notification outbox.
 *
 * Every outbound notification (email, WhatsApp, web push, in-app) is written
 * to the `notification_outbox` table first, then delivered asynchronously by
 * a worker with exponential backoff and a bounded number of retries.
 *
 * Benefits:
 *   - Durability: provider outages no longer lose messages.
 *   - Retries: transient failures are retried automatically.
 *   - Audit: every attempted send is visible in one place.
 *   - Idempotency: `dedupe_key` guarantees at-most-once enqueue per logical event.
 *
 * Design notes:
 *   - The schema is created by migration 038; `ensureOutboxSchema()` also
 *     provisions it at runtime so local dev without migrations still works.
 *   - `enqueueNotification()` is cheap (single INSERT); callers should use it
 *     in the same request they handle domain logic and do NOT need to await
 *     delivery. A non-blocking tick is spawned after enqueue for near-real-time
 *     delivery on the happy path; the cron worker covers retries.
 *   - `processOutboxBatch()` uses `FOR UPDATE SKIP LOCKED` so concurrent
 *     workers never collide on the same row.
 */

import { getClient, query } from '@/lib/db/pool';
import type { NotificationChannel, NotificationOutboxStatus } from '@/lib/db/types';

let schemaReady: Promise<void> | null = null;

export async function ensureOutboxSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS notification_outbox (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel VARCHAR(20) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        template_key VARCHAR(80),
        title TEXT,
        body TEXT,
        vars JSONB,
        data JSONB,
        status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_error TEXT,
        provider_message_id TEXT,
        dedupe_key VARCHAR(200),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT notification_outbox_channel_check
          CHECK (channel IN ('EMAIL','WHATSAPP','PUSH','IN_APP')),
        CONSTRAINT notification_outbox_status_check
          CHECK (status IN ('PENDING','SENT','FAILED','DEAD','SKIPPED'))
      )
    `);
    await query(
      `CREATE INDEX IF NOT EXISTS idx_notification_outbox_due
       ON notification_outbox(status, next_attempt_at)
       WHERE status = 'PENDING'`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_notification_outbox_user
       ON notification_outbox(user_id, created_at DESC)`
    );
    await query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_outbox_dedupe_active
       ON notification_outbox(dedupe_key)
       WHERE dedupe_key IS NOT NULL AND status IN ('PENDING','SENT')`
    );
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export type EnqueueInput = {
  channel: NotificationChannel;
  userId?: string | null;
  templateKey?: string | null;
  title?: string | null;
  body?: string | null;
  vars?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
  dedupeKey?: string | null;
  /** When to first attempt delivery. Defaults to NOW(). */
  runAt?: Date;
  /** Maximum attempts before the row is marked DEAD. Defaults to 5. */
  maxAttempts?: number;
};

export type OutboxRow = {
  id: string;
  channel: NotificationChannel;
  user_id: string | null;
  template_key: string | null;
  title: string | null;
  body: string | null;
  vars: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
  status: NotificationOutboxStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  provider_message_id: string | null;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

export async function enqueueNotification(input: EnqueueInput): Promise<OutboxRow | null> {
  await ensureOutboxSchema();

  const result = await query<OutboxRow>(
    `INSERT INTO notification_outbox
      (channel, user_id, template_key, title, body, vars, data,
       dedupe_key, next_attempt_at, max_attempts)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, NOW()), COALESCE($10, 5))
     ON CONFLICT (dedupe_key)
       WHERE dedupe_key IS NOT NULL AND status IN ('PENDING','SENT')
       DO NOTHING
     RETURNING *`,
    [
      input.channel,
      input.userId ?? null,
      input.templateKey ?? null,
      input.title ?? null,
      input.body ?? null,
      input.vars ? JSON.stringify(input.vars) : null,
      input.data ? JSON.stringify(input.data) : null,
      input.dedupeKey ?? null,
      input.runAt ?? null,
      input.maxAttempts ?? null,
    ]
  );

  return result.rows[0] ?? null;
}

/**
 * Backoff schedule (minutes): 1, 5, 30, 120, 720. After attempts >= max, DEAD.
 */
function backoffMinutes(attempts: number): number {
  const schedule = [1, 5, 30, 120, 720];
  return schedule[Math.min(attempts, schedule.length - 1)] ?? 720;
}

export type OutboxSender = (row: OutboxRow) => Promise<
  | { ok: true; providerMessageId?: string | null; skip?: false }
  | { ok: false; error: string; retry?: boolean }
  | { ok: true; skip: true; reason?: string }
>;

export type ProcessResult = {
  picked: number;
  sent: number;
  failed: number;
  dead: number;
  skipped: number;
};

/**
 * Claim and process up to `limit` due outbox rows.
 *
 * Caller must provide a `sender` that dispatches a single row. Returning
 * `{ ok: true, skip: true }` marks the row as SKIPPED (no retry), typically
 * because the user does not have a required contact (e.g. no email).
 *
 * Returning `{ ok: false, retry: false }` marks the row FAILED immediately
 * without further retries (permanent failure, e.g. invalid template).
 */
export async function processOutboxBatch(
  channel: NotificationChannel | 'ALL',
  sender: OutboxSender,
  limit = 25
): Promise<ProcessResult> {
  await ensureOutboxSchema();

  const result: ProcessResult = { picked: 0, sent: 0, failed: 0, dead: 0, skipped: 0 };
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const channelClause = channel === 'ALL' ? '' : 'AND channel = $2';
    const params: unknown[] =
      channel === 'ALL' ? [limit] : [limit, channel];

    const picked = await client.query<OutboxRow>(
      `SELECT *
         FROM notification_outbox
        WHERE status = 'PENDING'
          AND next_attempt_at <= NOW()
          ${channelClause}
        ORDER BY next_attempt_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED`,
      params
    );

    if (picked.rows.length === 0) {
      await client.query('COMMIT');
      return result;
    }

    result.picked = picked.rows.length;

    // Mark rows as in-progress (we bump attempts now so a crashed worker
    // does not re-deliver; the row's next_attempt_at is pushed forward to
    // its new backoff just in case).
    const ids = picked.rows.map((r) => r.id);
    await client.query(
      `UPDATE notification_outbox
          SET attempts = attempts + 1,
              next_attempt_at = NOW() + (INTERVAL '1 minute' * $2)
        WHERE id = ANY($1::uuid[])`,
      [ids, Math.max(...picked.rows.map((r) => backoffMinutes(r.attempts)))]
    );

    await client.query('COMMIT');

    // Process outside the transaction to avoid holding row locks for
    // the full duration of network calls.
    for (const row of picked.rows) {
      try {
        const delivery = await sender(row);
        if (delivery.ok) {
          if ('skip' in delivery && delivery.skip) {
            await query(
              `UPDATE notification_outbox
                  SET status = 'SKIPPED',
                      last_error = $2,
                      sent_at = NOW()
                WHERE id = $1`,
              [row.id, delivery.reason ?? null]
            );
            result.skipped += 1;
          } else {
            await query(
              `UPDATE notification_outbox
                  SET status = 'SENT',
                      provider_message_id = $2,
                      last_error = NULL,
                      sent_at = NOW()
                WHERE id = $1`,
              [row.id, delivery.providerMessageId ?? null]
            );
            result.sent += 1;
          }
        } else {
          const retry = delivery.retry !== false;
          const nextAttempts = row.attempts + 1;
          const isDead = !retry || nextAttempts >= row.max_attempts;
          if (isDead) {
            await query(
              `UPDATE notification_outbox
                  SET status = $2,
                      last_error = $3
                WHERE id = $1`,
              [row.id, retry ? 'DEAD' : 'FAILED', delivery.error.slice(0, 500)]
            );
            if (retry) result.dead += 1;
            else result.failed += 1;
          } else {
            await query(
              `UPDATE notification_outbox
                  SET last_error = $2,
                      next_attempt_at = NOW() + (INTERVAL '1 minute' * $3)
                WHERE id = $1`,
              [row.id, delivery.error.slice(0, 500), backoffMinutes(nextAttempts)]
            );
            result.failed += 1;
          }
        }
      } catch (error) {
        // Unexpected sender error — keep row pending with backoff.
        const nextAttempts = row.attempts + 1;
        const errMessage = error instanceof Error ? error.message : String(error);
        const isDead = nextAttempts >= row.max_attempts;
        await query(
          `UPDATE notification_outbox
              SET status = $2,
                  last_error = $3,
                  next_attempt_at = NOW() + (INTERVAL '1 minute' * $4)
            WHERE id = $1`,
          [
            row.id,
            isDead ? 'DEAD' : 'PENDING',
            errMessage.slice(0, 500),
            isDead ? 0 : backoffMinutes(nextAttempts),
          ]
        );
        if (isDead) result.dead += 1;
        else result.failed += 1;
      }
    }

    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Kick off a best-effort non-blocking drain. Fires an async worker loop
 * but does not await it. Safe to call from any request handler after enqueue.
 *
 * The dispatcher registry is injected by the dispatchers module on first
 * import to avoid a circular dependency with the senders.
 */

export type DispatcherRegistry = Partial<Record<NotificationChannel, OutboxSender>>;

let registeredDispatchers: DispatcherRegistry = {};

export function registerDispatchers(dispatchers: DispatcherRegistry): void {
  registeredDispatchers = { ...registeredDispatchers, ...dispatchers };
}

export function scheduleOutboxDrain(channels: NotificationChannel[] = ['EMAIL', 'WHATSAPP', 'PUSH']): void {
  setImmediate(async () => {
    for (const channel of channels) {
      const sender = registeredDispatchers[channel];
      if (!sender) continue;
      try {
        await processOutboxBatch(channel, sender, 10);
      } catch (error) {
        console.error(`[outbox] drain(${channel}) failed:`, error);
      }
    }
  });
}
