import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { withDatabaseTransaction } from '@/lib/server/db';

export const runtime = 'nodejs';

async function requireHead() {
  const user = await getCurrentDatabaseUser();
  if (!user) return { response: NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 }) };
  if (user.accountStatus !== 'active' || user.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Head access is required.' }, { status: 403 }) };
  }
  return { user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const access = await requireHead();
    if (access.response) return access.response;
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A moderation status is required.' }, { status: 400 });
    }
    const status = (body as Record<string, unknown>).status;
    const nextStatus = status === 'Approved' ? 'approved'
      : status === 'Active' ? 'active'
        : status === 'Pending' ? 'pending'
          : status === 'Rejected' ? 'rejected'
            : null;
    if (!nextStatus) return NextResponse.json({ error: 'Choose Approved, Active, Pending, or Rejected.' }, { status: 400 });

    const result = await withDatabaseTransaction(async (connection) => {
      const updated = await connection.query<{ id: string; status: string }>(
        `UPDATE listings
         SET status = $2, reviewed_by = $3,
             review_started_at = CASE WHEN $2 = 'pending' THEN now() ELSE review_started_at END,
             reviewed_at = CASE WHEN $2 IN ('approved', 'rejected') THEN now() ELSE NULL END,
             updated_at = now()
         WHERE id = $1
         RETURNING id, status`,
        [id, nextStatus, access.user.id],
      );
      const listing = updated.rows[0];
      if (!listing) return null;
      await connection.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'listing', $3, jsonb_build_object('status', $4))`,
        [access.user.id, `listing.${nextStatus}`, id, nextStatus],
      );
      return listing;
    });
    if (!result) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    return NextResponse.json({ listing: { id: result.id, status: result.status } });
  } catch (error) {
    console.error('Unable to moderate the OPXE listing.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503
      : error instanceof Error && error.message.includes('at least three uploaded photos') ? 409
        : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to moderate the listing.' },
      { status },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(_request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const access = await requireHead();
    if (access.response) return access.response;
    const { id } = await params;
    const deleted = await withDatabaseTransaction(async (connection) => {
      const result = await connection.query<{ id: string; title: string }>(
        `DELETE FROM listings WHERE id = $1 RETURNING id, title`,
        [id],
      );
      const listing = result.rows[0];
      if (!listing) return null;
      await connection.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'listing.deleted', 'listing', $2, jsonb_build_object('title', $3))`,
        [access.user.id, id, listing.title],
      );
      return listing;
    });
    if (!deleted) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('Unable to delete the OPXE listing.', error);
    return NextResponse.json(
      { error: error instanceof AuthenticationConfigurationError ? error.message : 'Unable to delete the listing.' },
      { status: error instanceof AuthenticationConfigurationError ? 503 : 500 },
    );
  }
}
