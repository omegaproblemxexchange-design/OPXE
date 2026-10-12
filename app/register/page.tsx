'use client';

import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="page-shell">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-500/30 bg-slate-900/70 p-8">
          <h1 className="text-2xl font-black text-white">Secure registration is not configured</h1>
          <p className="mt-3 text-slate-300">Set up Clerk keys in the deployment environment before allowing account creation. The old browser-only registration has been disabled for the production launch.</p>
          <Link href="/help" className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Contact support</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mx-auto flex max-w-md justify-center">
        <SignUp
          signInUrl="/login"
          forceRedirectUrl="/profile"
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'border border-slate-800 bg-slate-900/90 shadow-none',
            },
          }}
        />
      </div>
    </main>
  );
}
