import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import pg from 'pg';

const { Client } = pg;
const { loadEnvConfig } = nextEnv;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDirectory = path.join(projectRoot, 'database', 'migrations');
const migrationNamePattern = /^\d{4}_[a-z0-9_]+\.sql$/;

loadEnvConfig(projectRoot);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing. Add it to .env.local or the process environment before running migrations.');
  process.exit(1);
}

const client = new Client({ connectionString });
let lockAcquired = false;

try {
  await client.connect();
  await client.query('SELECT pg_advisory_lock(hashtext($1))', ['opxe_database_migrations']);
  lockAcquired = true;
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._opxe_schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const name of migrationFiles) {
    if (!migrationNamePattern.test(name)) {
      throw new Error(`Migration filename "${name}" must use the format NNNN_lowercase_name.sql.`);
    }

    const originalSql = await readFile(path.join(migrationsDirectory, name), 'utf8');
    if (!/^\s*BEGIN;\s*/i.test(originalSql) || !/\s*COMMIT;\s*$/i.test(originalSql)) {
      throw new Error(`Migration "${name}" must start with BEGIN; and end with COMMIT;.`);
    }
    const sql = originalSql
      .replace(/^\s*BEGIN;\s*/i, '')
      .replace(/\s*COMMIT;\s*$/i, '')
      .trim();

    const checksum = createHash('sha256').update(originalSql).digest('hex');
    const existing = await client.query(
      'SELECT checksum FROM public._opxe_schema_migrations WHERE name = $1',
      [name],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`Applied migration "${name}" was modified. Add a new migration instead of editing an applied file.`);
      }
      console.log(`Already applied: ${name}`);
      continue;
    }

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO public._opxe_schema_migrations (name, checksum) VALUES ($1, $2)',
        [name, checksum],
      );
      await client.query('COMMIT');
      console.log(`Applied: ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  console.log('Database migrations are up to date.');
} catch (error) {
  console.error('Database migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (lockAcquired) {
    try {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', ['opxe_database_migrations']);
    } catch (error) {
      console.error('Unable to release the database migration lock:', error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
  await client.end().catch((error) => {
    console.error('Unable to close the database connection:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
