import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser } from '@/lib/server/auth';
import { getDatabasePool } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }
    const pool = getDatabasePool();
    const result = await pool.query<{
      id: string;
      owner_id: string;
      seller: string;
      title: string;
      type: string;
      city: string;
      price: string;
      description: string;
      condition: string;
      availability: string;
      category: string;
      status: 'pending' | 'approved' | 'rejected' | 'active';
      created_at: Date;
    }>(
      `SELECT listings.id, listings.owner_id, users.name AS seller, listings.title, listings.type,
              listings.city, listings.price, listings.description, listings.condition, listings.availability,
              listings.category, listings.status, listings.created_at
       FROM listings
       JOIN users ON users.id = listings.owner_id
       WHERE listings.id = $1`,
      [id],
    );
    const listing = result.rows[0];
    if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

    const user = await getCurrentDatabaseUser();
    const owner = user?.id === listing.owner_id;
    const head = user?.role === 'admin' && user.accountStatus === 'active';
    if (!['approved', 'active'].includes(listing.status) && !owner && !head) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }
    const imageResult = await pool.query<{ secure_url: string | null }>(
      `SELECT secure_url FROM listing_images WHERE listing_id = $1 ORDER BY position`,
      [id],
    );
    return NextResponse.json({
      listing: {
        id: listing.id,
        ownerId: listing.owner_id,
        seller: listing.seller,
        title: listing.title,
        type: listing.type,
        city: listing.city,
        price: listing.price,
        description: listing.description,
        condition: listing.condition,
        availability: listing.availability,
        category: listing.category,
        status: listing.status[0].toUpperCase() + listing.status.slice(1),
        createdAt: listing.created_at.toISOString(),
        distance: '',
        images: imageResult.rows.map((image) => image.secure_url).filter((url): url is string => Boolean(url)),
      },
    });
  } catch (error) {
    console.error('Unable to retrieve the OPXE listing.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to retrieve the listing.' },
      { status },
    );
  }
}
