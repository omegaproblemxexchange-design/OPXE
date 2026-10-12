import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { getDatabasePool, withDatabaseTransaction } from '@/lib/server/db';

export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in to view your dashboard.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const pool = getDatabasePool();
    const [listings, sentRequests, receivedRequests] = await Promise.all([
      pool.query(
        `SELECT listings.id, listings.title, listings.type, listings.city, listings.price,
                listings.category, listings.status, listings.created_at,
                COALESCE(array_agg(listing_images.secure_url ORDER BY listing_images.position)
                  FILTER (WHERE listing_images.secure_url IS NOT NULL), '{}') AS images
         FROM listings
         LEFT JOIN listing_images ON listing_images.listing_id = listings.id
         WHERE listings.owner_id = $1
         GROUP BY listings.id
         ORDER BY listings.created_at DESC
         LIMIT 200`,
        [user.id],
      ),
      pool.query(
        `SELECT exchange_requests.id, exchange_requests.listing_id, exchange_requests.listing_title_snapshot,
                exchange_requests.status, exchange_requests.created_at
         FROM exchange_requests
         WHERE exchange_requests.requester_id = $1
         ORDER BY exchange_requests.created_at DESC
         LIMIT 200`,
        [user.id],
      ),
      pool.query(
        `SELECT exchange_requests.id, exchange_requests.listing_id, exchange_requests.listing_title_snapshot,
                exchange_requests.status, exchange_requests.created_at, requester.name AS requester_name
         FROM exchange_requests
         JOIN listings ON listings.id = exchange_requests.listing_id
         JOIN users AS requester ON requester.id = exchange_requests.requester_id
         WHERE listings.owner_id = $1
         ORDER BY exchange_requests.created_at DESC
         LIMIT 200`,
        [user.id],
      ),
    ]);

    return NextResponse.json({
      user,
      listings: listings.rows,
      sentRequests: sentRequests.rows,
      receivedRequests: receivedRequests.rows,
    });
  } catch (error) {
    console.error('Unable to load the authenticated OPXE dashboard.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load the dashboard.' },
      { status },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in to manage exchange requests.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A request ID and decision are required.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (typeof input.requestId !== 'string' || !UUID_PATTERN.test(input.requestId)) {
      return NextResponse.json({ error: 'Choose a valid exchange request.' }, { status: 400 });
    }
    if (input.status !== 'Accepted' && input.status !== 'Declined') {
      return NextResponse.json({ error: 'Choose Accepted or Declined.' }, { status: 400 });
    }

    const updated = await withDatabaseTransaction(async (connection) => {
      const requestRow = await connection.query<{
        id: string;
        listing_id: string;
        requester_id: string;
        listing_title_snapshot: string;
      }>(
        `SELECT exchange_requests.id, exchange_requests.listing_id, exchange_requests.requester_id,
                exchange_requests.listing_title_snapshot
         FROM exchange_requests
         JOIN listings ON listings.id = exchange_requests.listing_id
         WHERE exchange_requests.id = $1
           AND listings.owner_id = $2
           AND exchange_requests.status = 'pending'
         FOR UPDATE OF exchange_requests`,
        [input.requestId, user.id],
      );
      const pendingRequest = requestRow.rows[0];
      if (!pendingRequest) return null;

      const status = input.status === 'Accepted' ? 'accepted' : 'declined';
      await connection.query(
        `UPDATE exchange_requests SET status = $2, updated_at = now() WHERE id = $1`,
        [pendingRequest.id, status],
      );
      await connection.query(
        `INSERT INTO notifications (recipient_id, sender_id, title, detail, notification_type, reference_id)
         VALUES ($1, $2, $3, $4, 'exchange_request_status', $5)`,
        [
          pendingRequest.requester_id,
          user.id,
          `Exchange request ${status}`,
          `Your request for "${pendingRequest.listing_title_snapshot}" was ${status} by the listing owner.`,
          pendingRequest.id,
        ],
      );
      await connection.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'exchange_request', $3, jsonb_build_object('status', $4))`,
        [user.id, `exchange_request.${status}`, pendingRequest.id, status],
      );
      return { id: pendingRequest.id, status };
    });

    if (!updated) {
      return NextResponse.json({ error: 'This request is no longer pending or is not for your listing.' }, { status: 409 });
    }
    return NextResponse.json({ request: { id: updated.id, status: updated.status } });
  } catch (error) {
    console.error('Unable to update the OPXE exchange request.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update the exchange request.' },
      { status },
    );
  }
}
