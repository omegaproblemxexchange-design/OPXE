'use client';

import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="page-shell">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-500/30 bg-slate-900/70 p-8">
          <h1 className="text-2xl font-black text-white">Secure sign-in is not configured</h1>
          <p className="mt-3 text-slate-300">Set up Clerk keys in the deployment environment before enabling accounts. The old browser-only sign-in has been disabled for the production launch.</p>
          <Link href="/help" className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Contact support</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mx-auto flex max-w-md justify-center">
        <SignIn
          signUpUrl="/register"
          forceRedirectUrl="/dashboard"
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
