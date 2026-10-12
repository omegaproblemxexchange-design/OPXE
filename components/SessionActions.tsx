'use client';

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

function SignedInActions() {
  const { user } = useUser();
  const isHead = user?.publicMetadata.role === 'admin';

  return (
    <div className="flex items-center gap-2">
      {user && (
        <Link href={isHead ? '/admin' : '/profile'} className="hidden rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 sm:inline-flex">
          {user.fullName || user.primaryEmailAddress?.emailAddress || 'Account'}
        </Link>
      )}
      <UserButton />
    </div>
  );
}

export default function SessionActions() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <Link href="/login" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
        Login
      </Link>
    );
  }

  return (
    <>
      <SignedIn><SignedInActions /></SignedIn>
      <SignedOut>
        <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
          <button type="button" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110">
            Login
          </button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
