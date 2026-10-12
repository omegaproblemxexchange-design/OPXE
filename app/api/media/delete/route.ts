import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { getDatabasePool } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const body: unknown = await request.json();
    const publicId = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).publicId
      : null;
    if (typeof publicId !== 'string' || publicId.length > 255) {
      return NextResponse.json({ error: 'A valid uploaded image ID is required.' }, { status: 400 });
    }
    const allowedPrefixes = [
      `opxe/users/${user.id}/listings/`,
      ...(user.role === 'admin' ? [`opxe/users/${user.id}/digital-products/`] : []),
    ];
    if (!allowedPrefixes.some((prefix) => publicId.startsWith(prefix))) {
      return NextResponse.json({ error: 'You cannot delete this uploaded image.' }, { status: 403 });
    }

    const referenced = await getDatabasePool().query<{ used: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM listing_images WHERE object_key = $1
         UNION ALL
         SELECT 1 FROM digital_product_images WHERE object_key = $1
       ) AS used`,
      [publicId],
    );
    if (referenced.rows[0]?.used) {
      return NextResponse.json({ error: 'This photo is attached to a saved listing or product and cannot be deleted here.' }, { status: 409 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary server credentials are not configured.');
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary could not delete the uploaded image (status: ${result.result}).`);
    }
    return NextResponse.json({ deleted: result.result === 'ok' });
  } catch (error) {
    console.error('Unable to delete an OPXE Cloudinary upload.', error);
    return NextResponse.json(
      { error: error instanceof AuthenticationConfigurationError ? error.message : error instanceof Error ? error.message : 'Unable to delete the uploaded image.' },
      { status: error instanceof AuthenticationConfigurationError ? 503 : 500 },
    );
  }
}
