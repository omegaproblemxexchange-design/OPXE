/*
  OPXE 404 note:
  - Purpose: Not-found page for invalid or removed listing routes.
  - Key behavior: tells the user the URL is unavailable and redirects to the marketplace.
  - Change log: added to keep the product experience polished even during missing or broken links.
*/

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell flex min-h-[60vh] items-center justify-center">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">404</div>
        <h1 className="mt-3 text-3xl font-black text-white">Listing not found</h1>
        <p className="mt-3 text-slate-300">The page you requested is unavailable or may have been removed.</p>
        <Link href="/marketplace" className="mt-6 inline-block rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">Explore marketplace</Link>
      </div>
    </main>
  );
}
