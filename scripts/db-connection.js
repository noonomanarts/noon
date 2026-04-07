function resolveDatabaseUrl() {
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

module.exports = {
  resolveDatabaseUrl,
};