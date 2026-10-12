import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { getDatabasePool, withDatabaseTransaction } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const head = await getCurrentDatabaseUser();
    if (!head) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });
    if (head.accountStatus !== 'active' || head.role !== 'admin') {
      return NextResponse.json({ error: 'Head access is required.' }, { status: 403 });
    }

    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof (body as Record<string, unknown>).password !== 'string') {
      return NextResponse.json({ error: 'A new password is required.' }, { status: 400 });
    }
    const password = (body as { password: string }).password;
    if (password.length < 12 || password.length > 128) {
      return NextResponse.json({ error: 'Use a password with 12–128 characters.' }, { status: 400 });
    }

    const pool = getDatabasePool();
    const target = await pool.query<{ provider_subject: string; email: string }>(
      `SELECT auth_identities.provider_subject, users.email
       FROM users
       JOIN auth_identities ON auth_identities.user_id = users.id
       WHERE users.id = $1
         AND users.account_status = 'active'
         AND auth_identities.provider = 'clerk'`,
      [id],
    );
    if (!target.rows[0]) {
      return NextResponse.json({ error: 'This active account has no linked Clerk identity.' }, { status: 404 });
    }
    if (target.rows[0].email.toLowerCase() === head.email.toLowerCase()) {
      return NextResponse.json({ error: 'Use Clerk account settings to change the signed-in Head password.' }, { status: 409 });
    }

    const clerk = await clerkClient();
    await clerk.users.updateUser(target.rows[0].provider_subject, {
      password,
      signOutOfOtherSessions: true,
    });
    try {
      await withDatabaseTransaction(async (connection) => connection.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'user.password_reset', 'user', $2, '{}'::jsonb)`,
        [head.id, id],
      ));
      return NextResponse.json({ reset: true, auditLogged: true });
    } catch (auditError) {
      console.error('The password was reset, but its audit record could not be stored.', auditError);
      return NextResponse.json({
        reset: true,
        auditLogged: false,
        warning: 'The password was reset, but OPXE could not record the audit entry. Contact support.',
      });
    }
  } catch (error) {
    console.error('Unable to reset a user password from the Head console.', error);
    return NextResponse.json(
      { error: error instanceof AuthenticationConfigurationError ? error.message : 'Unable to reset the password.' },
      { status: error instanceof AuthenticationConfigurationError ? 503 : 500 },
    );
  }
}
