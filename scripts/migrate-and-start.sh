#!/bin/sh
set -e

echo "============================================"
echo "Noon Application Startup Script"
echo "============================================"

# Function to wait for database
wait_for_db() {
  echo "Waiting for PostgreSQL to be ready..."
  
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