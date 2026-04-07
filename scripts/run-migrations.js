/**
 * Database Migration Runner
 * This script runs SQL migrations from the migrations folder
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { resolveDatabaseUrl } = require('./db-connection');

function resolveMigrationsDir() {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.join(process.cwd(), 'database', 'migrations'),
    '/app/database/migrations',
  ].filter(Boolean);

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return found || path.join(process.cwd(), 'database', 'migrations');
}

const MIGRATIONS_DIR = resolveMigrationsDir();

async function runMigrations() {
  const connectionString = resolveDatabaseUrl();
  const pool = new Pool({
    connectionString,
  });

  try {
    // Ensure schema_migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Get already applied migrations
    const { rows: appliedMigrations } = await pool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    console.log(`Found ${appliedVersions.size} already applied migrations`);

    // Check if migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log(`Migrations directory not found at ${MIGRATIONS_DIR}, skipping...`);
      return;
    }

    // Get all migration files
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }

    console.log(`Found ${migrationFiles.length} migration files`);

    // Run pending migrations
    let migrationsRun = 0;
    for (const file of migrationFiles) {
      const version = file.replace('.sql', '');
      
      if (appliedVersions.has(version)) {
        console.log(`  ✓ ${version} (already applied)`);
        continue;
      }

      console.log(`  → Running migration: ${version}`);
      
      const migrationPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        await pool.query('COMMIT');
        console.log(`  ✓ ${version} (applied successfully)`);
        migrationsRun++;
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`  ✗ ${version} failed:`, error.message);
        throw error;
      }
    }

    if (migrationsRun > 0) {
      console.log(`\nSuccessfully ran ${migrationsRun} migrations`);
    } else {
      console.log('\nNo pending migrations to run');
    }

  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('Migration check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
