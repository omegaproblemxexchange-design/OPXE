import 'server-only';

import { Pool, type PoolClient } from 'pg';

let pool: Pool | undefined;

export function getDatabasePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to PostgreSQL.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on('error', (error) => {
      console.error('Unexpected idle PostgreSQL client error.', error);
    });
  }

  return pool;
}

export async function withDatabaseTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getDatabasePool().connect();

  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Unable to roll back the PostgreSQL transaction.', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
