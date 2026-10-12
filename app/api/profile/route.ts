import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { withDatabaseTransaction } from '@/lib/server/db';

export const runtime = 'nodejs';

function getStatus(error: unknown) {
  return error instanceof AuthenticationConfigurationError ? 503 : 500;
}

export async function GET() {
  try {
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in with a verified email to view your profile.' }, { status: 401 });
    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'This account is not active. Contact OPXE support.' }, { status: 403 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Unable to load the authenticated OPXE profile.', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load the profile.' },
      { status: getStatus(error) },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in with a verified email to update your profile.' }, { status: 401 });
    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A profile object is required.' }, { status: 400 });
    }
    const fields = body as Record<string, unknown>;
    const profileFields = ['name', 'city', 'phone', 'college', 'course', 'classYear'] as const;
    if (!profileFields.every((field) => typeof fields[field] === 'string')) {
      return NextResponse.json({ error: 'Name, city, phone, college, course, and class/year are required.' }, { status: 400 });
    }

    const values = profileFields.map((field) => (fields[field] as string).trim());
    if (values.some((value) => value.length === 0) || values.some((value) => value.length > 160)) {
      return NextResponse.json({ error: 'Profile fields must contain 1–160 characters.' }, { status: 400 });
    }

    const updated = await withDatabaseTransaction(async (connection) => connection.query(
      `UPDATE users
       SET name = $2, city = $3, phone = $4, college = $5, course = $6, class_year = $7, updated_at = now()
       WHERE id = $1 AND account_status = 'active'
       RETURNING id`,
      [user.id, ...values],
    ));
    if (updated.rowCount !== 1) {
      return NextResponse.json({ error: 'The active account could not be updated.' }, { status: 409 });
    }

    const refreshed = await getCurrentDatabaseUser();
    if (!refreshed) throw new Error('The profile was saved, but the updated account could not be reloaded.');
    return NextResponse.json({ user: refreshed });
  } catch (error) {
    console.error('Unable to update the authenticated OPXE profile.', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update the profile.' },
      { status: getStatus(error) },
    );
  }
}
