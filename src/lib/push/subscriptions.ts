import { query } from '@/lib/db/pool';

let schemaReady: Promise<void> | null = null;

async function ensurePushSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
      )
    `);
    await query(
      `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`
    );
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
};

export async function upsertPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}): Promise<PushSubscriptionRow> {
  await ensurePushSchema();
  const result = await query<PushSubscriptionRow>(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = COALESCE(EXCLUDED.user_agent, push_subscriptions.user_agent),
           last_seen_at = NOW()
     RETURNING *`,
    [input.userId, input.endpoint, input.p256dh, input.auth, input.userAgent ?? null]
  );
  return result.rows[0];
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
  await ensurePushSchema();
  const result = await query(
    `DELETE FROM push_subscriptions WHERE endpoint = $1`,
    [endpoint]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  await ensurePushSchema();
  const result = await query<PushSubscriptionRow>(
    `SELECT * FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
}

export async function countPushSubscriptionsForUser(userId: string): Promise<number> {
  await ensurePushSchema();
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]?.count ?? 0;
}
