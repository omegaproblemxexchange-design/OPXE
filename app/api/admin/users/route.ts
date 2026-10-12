import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser } from '@/lib/server/auth';
import { getDatabasePool } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const head = await getCurrentDatabaseUser();
    if (!head) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });
    if (head.accountStatus !== 'active' || head.role !== 'admin') {
      return NextResponse.json({ error: 'Head access is required.' }, { status: 403 });
    }

    const result = await getDatabasePool().query(
      `SELECT id, email, name, role, account_status, city, phone, college, course,
              class_year, profile_reviewed, email_verified_at, phone_verified_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 500`,
    );
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Unable to load OPXE accounts for the Head.', error);
    return NextResponse.json(
      { error: error instanceof AuthenticationConfigurationError ? error.message : 'Unable to load accounts.' },
      { status: error instanceof AuthenticationConfigurationError ? 503 : 500 },
    );
  }
}
