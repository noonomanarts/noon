import "server-only";

import { pool } from "./pool";

let userPreferencesTableReady = false;

async function ensureUserPreferencesTable(): Promise<void> {
  if (userPreferencesTableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pref_key VARCHAR(80) NOT NULL,
      pref_value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, pref_key)
    )
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at DESC)`
  );

  userPreferencesTableReady = true;
}

export async function getUserPreferenceByKey<T>(userId: string, key: string): Promise<T | null> {
  await ensureUserPreferencesTable();

  const result = await pool.query(
    `SELECT pref_value
     FROM user_preferences
     WHERE user_id = $1 AND pref_key = $2
     LIMIT 1`,
    [userId, key]
  );

  if (!result.rows[0]) return null;
  return result.rows[0].pref_value as T;
}

export async function upsertUserPreference<T>(input: {
  userId: string;
  key: string;
  value: T;
}): Promise<void> {
  await ensureUserPreferencesTable();

  await pool.query(
    `INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (user_id, pref_key)
     DO UPDATE SET
       pref_value = EXCLUDED.pref_value,
       updated_at = NOW()`,
    [input.userId, input.key, JSON.stringify(input.value)]
  );
}
