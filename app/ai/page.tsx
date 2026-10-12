/*
  OPXE AI match note:
  - Purpose: Local keyword-based suggestions against approved marketplace listings.
  - Key behavior: analyzes the prompt in the browser; it does not call an external AI service.
*/

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getAppStore, type AppListing } from '@/lib/appStore';

function rankListings(query: string): Array<{ listing: AppListing; score: number }> {
  const terms = Array.from(new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? [])).filter((term) => term.length > 2);
  if (!terms.length) return [];

  return getAppStore().listings
    .filter((listing) => listing.status === 'Approved' || listing.status === 'Active')
    .map((listing) => {
      const text = `${listing.title} ${listing.description} ${listing.category} ${listing.type} ${listing.city}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
      return { listing, score: Math.round((score / terms.length) * 100) };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export default function AiPage() {
  const [query, setQuery] = useState('Looking for a compact desk setup and books for engineering students');
  const [analyzedQuery, setAnalyzedQuery] = useState(query);
  const [error, setError] = useState('');
  const suggestions = useMemo(() => rankListings(analyzedQuery), [analyzedQuery]);

  const analyze = () => {
    if (!query.trim()) {
      setError('Describe what you are looking for first.');
      return;
    }
    setError('');
    setAnalyzedQuery(query.trim());
  };

  return (
    <main className="page-shell">
      <div className="mb-8">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">AI matching</div>
        <h1 className="mt-2 text-3xl font-black text-white">Smart suggestions</h1>
        <p className="mt-2 text-sm text-slate-400">Finds relevant words in approved listings on this device. No remote AI service is used.</p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <label htmlFor="match-query" className="mb-2 block text-sm text-slate-300">What do you need?</label>
        <textarea id="match-query" value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-[110px] w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" />
        <button type="button" onClick={analyze} className="mt-4 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">Run match analysis</button>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-white">Matches for: “{analyzedQuery}”</h2>
        {suggestions.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map(({ listing, score }) => (
              <Link key={listing.id} href={`/listing/${listing.id}`} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-cyan-400/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-bold text-white">{listing.title}</div>
                  <div className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300">{score}%</div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{listing.description}</p>
                <div className="mt-4 flex justify-between text-xs text-slate-400"><span>{listing.city}</span><span>{listing.price}</span></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">No approved listings match those words. Try a broader description or browse all listings.</div>
        )}
      </div>
    </main>
  );
}
