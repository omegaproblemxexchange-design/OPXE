import { NextResponse } from 'next/server';
import { AuthenticationConfigurationError, getCurrentDatabaseUser, hasSameOrigin } from '@/lib/server/auth';
import { createCloudinaryUploadSignature } from '@/lib/server/cloudinary';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
    const user = await getCurrentDatabaseUser();
    if (!user) return NextResponse.json({ error: 'Sign in with a verified account before uploading.' }, { status: 401 });
    if (user.accountStatus !== 'active') return NextResponse.json({ error: 'This account is not active.' }, { status: 403 });

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Choose a supported upload type.' }, { status: 400 });
    }
    const kind = (body as Record<string, unknown>).kind;
    if (kind !== 'listing' && kind !== 'digital-product') {
      return NextResponse.json({ error: 'Choose a supported upload type.' }, { status: 400 });
    }
    if (kind === 'digital-product' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the Head can upload digital product images.' }, { status: 403 });
    }

    const folder = `opxe/users/${user.id}/${kind === 'listing' ? 'listings' : 'digital-products'}`;
    return NextResponse.json(createCloudinaryUploadSignature(folder));
  } catch (error) {
    console.error('Unable to create a signed Cloudinary upload.', error);
    const status = error instanceof AuthenticationConfigurationError ? 503 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to prepare the image upload.' },
      { status },
    );
  }
}
