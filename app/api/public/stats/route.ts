import { NextResponse } from 'next/server';
import { getDatabasePool } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await getDatabasePool().query<{ listings: string; users: string }>(
      `SELECT
         (SELECT count(*) FROM listings WHERE status IN ('approved', 'active'))::text AS listings,
         (SELECT count(*) FROM users WHERE role <> 'admin' AND account_status = 'active')::text AS users`,
    );
    const counts = result.rows[0];
    if (!counts) throw new Error('Public marketplace counts were not returned.');
    return NextResponse.json({
      approvedListings: Number(counts.listings),
      members: Number(counts.users),
    });
  } catch (error) {
    console.error('Unable to load OPXE public counts.', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load marketplace counts.' },
      { status: 503 },
    );
  }
}
