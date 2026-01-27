#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  ./node_modules/.bin/prisma migrate deploy
else
  echo "DATABASE_URL is not set. Skipping migrations."
fi

echo "Starting server..."
exec node server.js