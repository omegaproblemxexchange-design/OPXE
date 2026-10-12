import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { verifyCloudinaryImage } from '@/lib/server/cloudinary';
import { getDatabasePool, withDatabaseTransaction } from '@/lib/server/db';

export const runtime = 'nodejs';

type ListingRow = {
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
};

function toPublicListing(row: ListingRow, images: Array<{ secure_url: string | null; position: number }>) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    seller: row.seller,
    title: row.title,
    type: row.type,
    city: row.city,
    price: row.price,
    description: row.description,
    condition: row.condition,
    availability: row.availability,
    category: row.category,
    status: row.status[0].toUpperCase() + row.status.slice(1),
    createdAt: row.created_at.toISOString(),
    distance: '',
    images: images.map((image) => image.secure_url).filter((url): url is string => Boolean(url)),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mine = url.searchParams.get('mine') === 'true';
    const user = mine ? await getCurrentDatabaseUser() : null;
    if (mine && !user) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });
    if (user && user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const pool = getDatabasePool();
    const result = mine
      ? await pool.query<ListingRow>(
        `SELECT listings.id, listings.owner_id, users.name AS seller, listings.title, listings.type,
                listings.city, listings.price, listings.description, listings.condition, listings.availability,
                listings.category, listings.status, listings.created_at
         FROM listings
         JOIN users ON users.id = listings.owner_id
         WHERE listings.owner_id = $1
         ORDER BY listings.created_at DESC
         LIMIT 200`,
        [user?.id],
      )
      : await pool.query<ListingRow>(
        `SELECT listings.id, listings.owner_id, users.name AS seller, listings.title, listings.type,
                listings.city, listings.price, listings.description, listings.condition, listings.availability,
                listings.category, listings.status, listings.created_at
         FROM listings
         JOIN users ON users.id = listings.owner_id
         WHERE listings.status IN ('approved', 'active')
         ORDER BY listings.created_at DESC
         LIMIT 100`,
      );
    const ids = result.rows.map((listing) => listing.id);
    const images = ids.length
      ? await pool.query<{ listing_id: string; secure_url: string | null; position: number }>(
        `SELECT listing_id, secure_url, position
         FROM listing_images
         WHERE listing_id = ANY($1::uuid[])
         ORDER BY listing_id, position`,
        [ids],
      )
      : { rows: [] };
    const imageMap = new Map<string, Array<{ secure_url: string | null; position: number }>>();
    for (const image of images.rows) {
      const listingImages = imageMap.get(image.listing_id) ?? [];
      listingImages.push(image);
      imageMap.set(image.listing_id, listingImages);
    }
    return NextResponse.json({
      listings: result.rows.map((listing) => toPublicListing(listing, imageMap.get(listing.id) ?? [])),
    });
  } catch (error) {
    console.error('Unable to retrieve OPXE listings.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to retrieve listings.' },
      { status },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in with a verified account to post a listing.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A listing object is required.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const required = ['title', 'type', 'city', 'price', 'description', 'category', 'condition', 'availability'];
    if (!required.every((field) => typeof input[field] === 'string')) {
      return NextResponse.json({ error: 'Complete all required listing fields.' }, { status: 400 });
    }
    const text = Object.fromEntries(required.map((field) => [field, (input[field] as string).trim()]));
    const limits: Record<string, number> = {
      title: 120, type: 40, city: 100, price: 80, description: 4000,
      category: 80, condition: 80, availability: 120,
    };
    if (required.some((field) => !text[field] || text[field].length > limits[field])) {
      return NextResponse.json({ error: 'One or more listing fields are empty or exceed their allowed length.' }, { status: 400 });
    }
    if (!Array.isArray(input.images) || input.images.length < 3 || input.images.length > 5) {
      return NextResponse.json({ error: 'Add between 3 and 5 listing photos.' }, { status: 400 });
    }
    if (!input.images.every((image) => typeof image === 'string' && image.length <= 255)) {
      return NextResponse.json({ error: 'One or more uploaded photo references are invalid.' }, { status: 400 });
    }
    const publicIds = input.images as string[];
    if (new Set(publicIds).size !== publicIds.length) {
      return NextResponse.json({ error: 'Each listing photo must be different.' }, { status: 400 });
    }

    const folder = `opxe/users/${user.id}/listings`;
    const verifiedImages = await Promise.all(publicIds.map((publicId) => verifyCloudinaryImage(publicId, folder)));
    const listing = await withDatabaseTransaction(async (connection) => {
      const created = await connection.query<{ id: string; created_at: Date }>(
        `INSERT INTO listings (
           owner_id, title, type, city, price, description, condition, availability, category, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
         RETURNING id, created_at`,
        [user.id, text.title, text.type, text.city, text.price, text.description, text.condition, text.availability, text.category],
      );
      const row = created.rows[0];
      if (!row) throw new Error('The listing was not created.');
      for (const [position, image] of verifiedImages.entries()) {
        await connection.query(
          `INSERT INTO listing_images (
             listing_id, object_key, secure_url, content_type, byte_size, width, height, position
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [row.id, image.publicId, image.secureUrl, image.contentType, image.byteSize, image.width, image.height, position],
        );
      }
      return {
        id: row.id,
        ownerId: user.id,
        seller: user.name,
        ...text,
        status: 'Pending',
        createdAt: row.created_at.toISOString(),
        distance: '',
        images: verifiedImages.map((image) => image.secureUrl),
      };
    });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('Unable to create an OPXE listing.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create the listing.' },
      { status },
    );
  }
}
