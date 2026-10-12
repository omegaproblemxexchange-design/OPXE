import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { getDatabasePool, withDatabaseTransaction } from '@/lib/server/db';

export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in to view notifications.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const result = await getDatabasePool().query(
      `SELECT id, title, detail, notification_type, reference_id, read_at, created_at
       FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [user.id],
    );
    return NextResponse.json({ notifications: result.rows });
  } catch (error) {
    console.error('Unable to load OPXE notifications.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load notifications.' },
      { status },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in to update notifications.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A notification ID or markAll flag is required.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (input.markAll === true) {
      await withDatabaseTransaction((connection) => connection.query(
        `UPDATE notifications SET read_at = now()
         WHERE recipient_id = $1 AND read_at IS NULL`,
        [user.id],
      ));
      return NextResponse.json({ markedAllRead: true });
    }
    if (typeof input.id !== 'string' || !UUID_PATTERN.test(input.id)) {
      return NextResponse.json({ error: 'Choose a valid notification.' }, { status: 400 });
    }
    const result = await withDatabaseTransaction((connection) => connection.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, now())
       WHERE id = $1 AND recipient_id = $2
       RETURNING id`,
      [input.id, user.id],
    ));
    if (result.rowCount !== 1) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    return NextResponse.json({ markedRead: true });
  } catch (error) {
    console.error('Unable to update OPXE notification state.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update notifications.' },
      { status },
    );
  }
}
