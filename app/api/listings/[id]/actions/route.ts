import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { getDatabasePool, withDatabaseTransaction } from '@/lib/server/db';

export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(error: unknown) {
  console.error('Unable to process an OPXE listing action.', error);
  const configurationError = error instanceof AuthenticationConfigurationError;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Unable to process this listing action.' },
    { status: configurationError ? 503 : 500 },
  );
}

async function getActionableListing(listingId: string) {
  const result = await getDatabasePool().query<{
    id: string;
    owner_id: string;
    title: string;
    status: 'pending' | 'approved' | 'rejected' | 'active';
  }>(
    `SELECT id, owner_id, title, status
     FROM listings
     WHERE id = $1`,
    [listingId],
  );
  return result.rows[0] ?? null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const listing = await getActionableListing(id);
    if (!listing || !['approved', 'active'].includes(listing.status)) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }

    const pool = getDatabasePool();
    const [saved, request] = await Promise.all([
      pool.query('SELECT 1 FROM saved_listings WHERE user_id = $1 AND listing_id = $2', [user.id, id]),
      pool.query(
        `SELECT 1 FROM exchange_requests
         WHERE requester_id = $1 AND listing_id = $2 AND status <> 'declined'
         LIMIT 1`,
        [user.id, id],
      ),
    ]);
    return NextResponse.json({
      saved: saved.rowCount === 1,
      requestSent: request.rowCount === 1,
      isOwner: listing.owner_id === user.id,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const listing = await getActionableListing(id);
    if (!listing || !['approved', 'active'].includes(listing.status)) {
      return NextResponse.json({ error: 'Only available listings can be saved.' }, { status: 404 });
    }

    await withDatabaseTransaction(async (connection) => {
      await connection.query(
        `INSERT INTO saved_listings (user_id, listing_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, listing_id) DO NOTHING`,
        [user.id, id],
      );
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    await withDatabaseTransaction(async (connection) => {
      await connection.query(
        'DELETE FROM saved_listings WHERE user_id = $1 AND listing_id = $2',
        [user.id, id],
      );
    });
    return NextResponse.json({ saved: false });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Choose a valid listing action.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (input.action !== 'request' && input.action !== 'report') {
      return NextResponse.json({ error: 'Choose a valid listing action.' }, { status: 400 });
    }

    const reason = input.action === 'report' && typeof input.reason === 'string'
      ? input.reason.trim()
      : input.action === 'report' ? 'User reported this listing for Head review.' : '';
    if (input.action === 'report' && (!reason || reason.length > 1000)) {
      return NextResponse.json({ error: 'Report details must contain 1–1000 characters.' }, { status: 400 });
    }

    const result = await withDatabaseTransaction(async (connection) => {
      const found = await connection.query<{
        id: string;
        owner_id: string;
        title: string;
        status: 'pending' | 'approved' | 'rejected' | 'active';
      }>(
        `SELECT id, owner_id, title, status
         FROM listings
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );
      const listing = found.rows[0];
      if (!listing || !['approved', 'active'].includes(listing.status)) {
        return { kind: 'not_available' as const };
      }
      if (input.action === 'request') {
        if (listing.owner_id === user.id) return { kind: 'own_listing' as const };
        const created = await connection.query<{ id: string }>(
          `INSERT INTO exchange_requests (listing_id, requester_id, listing_title_snapshot)
           VALUES ($1, $2, $3)
           ON CONFLICT (listing_id, requester_id) WHERE status <> 'declined'
           DO NOTHING
           RETURNING id`,
          [id, user.id, listing.title],
        );
        if (!created.rows[0]) return { kind: 'already_requested' as const };
        await connection.query(
          `INSERT INTO notifications (recipient_id, sender_id, title, detail, notification_type, reference_id)
           VALUES ($1, $2, 'New exchange request', $3, 'exchange_request', $4)`,
          [listing.owner_id, user.id, `${user.name} requested your listing "${listing.title}". Review the request on your dashboard.`, created.rows[0].id],
        );
        return { kind: 'request_created' as const };
      }

      await connection.query(
        `INSERT INTO disputes (reporter_id, listing_id, reason, severity, status)
         VALUES ($1, $2, $3, 'medium', 'open')`,
        [user.id, id, reason],
      );
      return { kind: 'report_created' as const };
    });

    if (result.kind === 'not_available') return NextResponse.json({ error: 'This listing is not available for this action.' }, { status: 404 });
    if (result.kind === 'own_listing') return NextResponse.json({ error: 'You cannot request your own listing.' }, { status: 409 });
    if (result.kind === 'already_requested') return NextResponse.json({ error: 'You already have an active request for this listing.' }, { status: 409 });
    return NextResponse.json(
      result.kind === 'request_created' ? { requestSent: true } : { reportSubmitted: true },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
