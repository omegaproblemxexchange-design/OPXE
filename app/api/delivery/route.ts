import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { getDatabasePool, withDatabaseTransaction } from '@/lib/server/db';

export const runtime = 'nodejs';

const PARTNERS = new Set(['No preference', 'Blue Dart', 'Delhivery', 'Shiprocket']);

export async function GET() {
  try {
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in to view your delivery requests.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const result = await getDatabasePool().query(
      `SELECT id, product, pickup_address, delivery_address, distance_km, preferred_partner,
              estimated_fee_inr, status, created_at
       FROM delivery_requests
       WHERE requester_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [user.id],
    );
    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error('Unable to load OPXE delivery requests.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load delivery requests.' },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in to request delivery.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Delivery request details are required.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const product = typeof input.product === 'string' ? input.product.trim() : '';
    const pickupAddress = typeof input.pickupAddress === 'string' ? input.pickupAddress.trim() : '';
    const deliveryAddress = typeof input.deliveryAddress === 'string' ? input.deliveryAddress.trim() : '';
    const distanceKm = typeof input.distanceKm === 'number' ? input.distanceKm : Number.NaN;
    const preferredPartner = typeof input.preferredPartner === 'string' ? input.preferredPartner : '';
    if (!product || product.length > 120 || !pickupAddress || pickupAddress.length > 300
      || !deliveryAddress || deliveryAddress.length > 300) {
      return NextResponse.json({ error: 'Product must be 1–120 characters; each address must be 1–300 characters.' }, { status: 400 });
    }
    if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 100) {
      return NextResponse.json({ error: 'Delivery distance must be greater than zero and no more than 100 km.' }, { status: 400 });
    }
    if (!PARTNERS.has(preferredPartner)) {
      return NextResponse.json({ error: 'Choose a supported courier preference.' }, { status: 400 });
    }

    const estimatedFee = Math.max(80, Math.ceil(distanceKm * 12 + 40));
    const created = await withDatabaseTransaction((connection) => connection.query<{
      id: string;
      product: string;
      pickup_address: string;
      delivery_address: string;
      distance_km: string;
      preferred_partner: string;
      estimated_fee_inr: number;
      status: string;
      created_at: Date;
    }>(
      `INSERT INTO delivery_requests (
         requester_id, product, pickup_address, delivery_address, distance_km,
         preferred_partner, estimated_fee_inr
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, product, pickup_address, delivery_address, distance_km,
                 preferred_partner, estimated_fee_inr, status, created_at`,
      [user.id, product, pickupAddress, deliveryAddress, distanceKm, preferredPartner, estimatedFee],
    ));
    const deliveryRequest = created.rows[0];
    if (!deliveryRequest) throw new Error('The delivery request could not be saved.');
    return NextResponse.json({ request: deliveryRequest }, { status: 201 });
  } catch (error) {
    console.error('Unable to save the OPXE delivery request.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to save the delivery request.' },
      { status },
    );
  }
}
