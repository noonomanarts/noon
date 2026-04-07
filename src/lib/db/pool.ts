/**
 * PostgreSQL connection pool using pg library
 */
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Connection pool singleton
const globalForPool = global as unknown as { pool: Pool | undefined };

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  const host = process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || '5433';
  const user = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'noonomanarts';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

const connectionString = resolveDatabaseUrl();

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Falling back to PG/POSTGRES environment variables.');
}

export const pool: Pool =
  globalForPool.pool ||
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPool.pool = pool;
}

// Logging in development
if (process.env.NODE_ENV === 'development') {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
}

/**
 * Execute a query with parameters
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
  }
  
  return result;
}

/**
 * Get a client from the pool for transaction support
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
