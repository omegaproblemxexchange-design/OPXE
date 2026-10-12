import 'server-only';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { withDatabaseTransaction } from '@/lib/server/db';

export type DatabaseUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'premium' | 'admin';
  accountStatus: 'active' | 'blocked' | 'banned';
  city: string;
  phone: string;
  college: string;
  course: string;
  classYear: string;
  profileReviewed: boolean;
  emailVerified: boolean;
  createdAt: string;
};

export class AuthenticationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationConfigurationError';
  }
}

export function hasAuthenticationConfiguration() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch (error) {
    console.error('Rejected an invalid Origin header on an authenticated request.', error);
    return false;
  }
}

export async function getCurrentDatabaseUser(): Promise<DatabaseUser | null> {
  if (!hasAuthenticationConfiguration()) {
    throw new AuthenticationConfigurationError('Clerk authentication is not configured.');
  }

  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  const identity = await client.users.getUser(userId);
  const emailAddress = identity.emailAddresses.find(
    (email) => email.id === identity.primaryEmailAddressId,
  );
  if (!emailAddress || emailAddress.verification?.status !== 'verified') {
    return null;
  }

  const email = emailAddress.emailAddress.trim().toLowerCase();
  const name = [identity.firstName, identity.lastName].filter(Boolean).join(' ').trim()
    || email.split('@')[0];
  const configuredHeadEmail = process.env.OPXE_HEAD_EMAIL?.trim().toLowerCase();
  const isConfiguredHead = configuredHeadEmail === email;

  return withDatabaseTransaction(async (connection) => {
    const existingIdentity = await connection.query<{ id: string }>(
      `SELECT users.id
       FROM auth_identities
       JOIN users ON users.id = auth_identities.user_id
       WHERE auth_identities.provider = 'clerk'
         AND auth_identities.provider_subject = $1
       FOR UPDATE OF users`,
      [userId],
    );

    let userIdInDatabase = existingIdentity.rows[0]?.id;
    if (userIdInDatabase) {
      await connection.query(
        `UPDATE users
         SET email = $2,
             role = CASE WHEN $3 THEN 'admin'::account_role ELSE role END,
             email_verified_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [userIdInDatabase, email, isConfiguredHead],
      );
    } else {
      const insertedUser = await connection.query<{ id: string }>(
        `INSERT INTO users (email, name, role, email_verified_at)
         VALUES ($1, $2, CASE WHEN $3 THEN 'admin'::account_role ELSE 'user'::account_role END, now())
         ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             role = CASE WHEN $3 THEN 'admin'::account_role ELSE users.role END,
             email_verified_at = now(),
             updated_at = now()
         RETURNING id`,
        [email, name, isConfiguredHead],
      );
      userIdInDatabase = insertedUser.rows[0]?.id;
      if (!userIdInDatabase) throw new Error('Unable to create or locate the OPXE account.');

      await connection.query(
        `INSERT INTO auth_identities (user_id, provider, provider_subject)
         VALUES ($1, 'clerk', $2)
         ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [userIdInDatabase, userId],
      );
      const linkedIdentity = await connection.query<{ user_id: string }>(
        `SELECT user_id
         FROM auth_identities
         WHERE provider = 'clerk' AND provider_subject = $1`,
        [userId],
      );
      if (!linkedIdentity.rows[0]) throw new Error('Unable to link the Clerk account to OPXE.');
      userIdInDatabase = linkedIdentity.rows[0].user_id;
    }

    const user = await connection.query<{
      id: string;
      email: string;
      name: string;
      role: DatabaseUser['role'];
      account_status: DatabaseUser['accountStatus'];
      city: string;
      phone: string;
      college: string;
      course: string;
      class_year: string;
      profile_reviewed: boolean;
      email_verified_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, email, name, role, account_status, city, phone, college, course,
              class_year, profile_reviewed, email_verified_at, created_at
       FROM users
       WHERE id = $1`,
      [userIdInDatabase],
    );
    const row = user.rows[0];
    if (!row) throw new Error('The OPXE account could not be loaded after synchronization.');

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      accountStatus: row.account_status,
      city: row.city,
      phone: row.phone,
      college: row.college,
      course: row.course,
      classYear: row.class_year,
      profileReviewed: row.profile_reviewed,
      emailVerified: Boolean(row.email_verified_at),
      createdAt: row.created_at.toISOString(),
    };
  });
}
