/*
  OPXE sign-in prompt note:
  - Purpose: Shared sign-in callout for actions and pages that require an account.
  - Key behavior: Returns users to the intended local route after successful login.
*/

import Link from 'next/link';

export default function SignInPrompt({ next, title, description }: { next: string; title: string; description: string }) {
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
      <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">OPXE account required</div>
      <h1 className="mt-3 text-3xl font-black text-white">{title}</h1>
      <p className="mt-3 text-slate-300">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={loginHref} className="inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Sign in to continue</Link>
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="inline-flex rounded-full border border-slate-700 px-5 py-3 font-semibold text-white">Create account</Link>
      </div>
    </div>
  );
}
