#!/bin/sh
set -e

echo "============================================"
echo "Noon Application Startup Script"
echo "============================================"

# Build DATABASE_URL from PG/POSTGRES variables when it is missing.
if [ -z "$DATABASE_URL" ]; then
  DB_HOST="${PGHOST:-${POSTGRES_HOST:-localhost}}"
  DB_PORT="${PGPORT:-${POSTGRES_PORT:-5433}}"
  DB_USER="${PGUSER:-${POSTGRES_USER:-postgres}}"
  DB_PASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD:-postgres}}"
  DB_NAME="${PGDATABASE:-${POSTGRES_DB:-noonomanarts}}"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  echo "DATABASE_URL was missing, built it from PG/POSTGRES environment variables."
fi

# Function to wait for database
wait_for_db() {
  echo "Waiting for PostgreSQL to be ready..."

  node -e "
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL is not set');
      process.exit(0);
    }
    try {
      const parsed = new URL(dbUrl);
      const database = (parsed.pathname || '').replace(/^\//, '') || '(empty)';
      const user = decodeURIComponent(parsed.username || '');
      console.log('DB target => host=' + parsed.hostname + ' port=' + (parsed.port || '5432') + ' user=' + user + ' db=' + database);
    } catch {
      console.error('DATABASE_URL is invalid and could not be parsed');
    }
  "
  
  max_retries=30
  counter=0
  
  until node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT 1')
      .then(() => { pool.end(); process.exit(0); })
      .catch(() => { pool.end(); process.exit(1); });
  " 2>/dev/null; do
    counter=$((counter + 1))
    if [ $counter -ge $max_retries ]; then
      echo "Error: Could not connect to database after $max_retries attempts"
      echo "Hint: if PostgreSQL uses a persisted volume, changing POSTGRES_PASSWORD in .env will NOT update the existing DB user password."
      echo "Reset password in DB container or set DATABASE_URL to the current real DB password."
      exit 1
    fi
    echo "Database not ready yet... retrying in 2 seconds (attempt $counter/$max_retries)"
    sleep 2
  done
  
  echo "Database is ready!"
}

# Function to run migrations
run_migrations() {
  echo "Checking for pending migrations..."
  
  # Run the migration script
  if [ -f "/app/scripts/run-migrations.js" ]; then
    node /app/scripts/run-migrations.js
  else
    echo "Migration script not found, skipping..."
  fi
}

# Wait for database to be ready
wait_for_db

# Run migrations
run_migrations

echo "============================================"
echo "Starting Next.js server..."
echo "============================================"

# Start the server
exec node server.js