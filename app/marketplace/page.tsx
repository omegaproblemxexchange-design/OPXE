/*
  OPXE marketplace note:
  - Purpose: Searchable marketplace page with listing filters, location filters, and price-based sorting logic.
  - Key behavior: reads listings from the local app store, hides rejected items, and displays filtered results for marketplace browsing.
  - Change log: upgraded from a static catalog to a working UI with real local-state filtering and active listing behavior.
*/

/*
  OPXE marketplace note:
  - Purpose: Searchable marketplace page with listing filters, location filters, and price-based sorting logic.
  - Key behavior: reads listings from the local app store, hides rejected items, and displays filtered results for marketplace browsing.
  - Change log: upgraded from a static catalog to a working UI with real local-state filtering and active listing behavior.
*/

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ImagePreview from '@/components/ImagePreview';
import type { AppListing } from '@/lib/appStore';

const filters = ['All', 'NEED', 'HAVE', 'BUY', 'SELL', 'SWAP', 'BORROW', 'LEND', 'GIVE AWAY', 'DONATION'];
const storyPills = ['For you', 'Campus', 'Deals', 'Tech', 'Furniture', 'Books'];

function getNumericPrice(value: string) {
  const numbers = value.match(/\d+/g);
  return numbers ? Number(numbers[0]) : 0;
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<AppListing[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('Across India');
  const [priceFilter, setPriceFilter] = useState('all');
  const [city, setCity] = useState('Bengaluru');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch('/api/listings', { cache: 'no-store' }),
      fetch('/api/profile', { cache: 'no-store' }),
    ]).then(async ([listingsResponse, profileResponse]) => {
      const listingsResult: unknown = await listingsResponse.json();
      const profileResult: unknown = profileResponse.status === 401 ? null : await profileResponse.json();
      if (!listingsResponse.ok) {
        const message = listingsResult && typeof listingsResult === 'object' && 'error' in listingsResult ? String(listingsResult.error) : 'Listings could not be loaded.';
        throw new Error(message);
      }
      if (!listingsResult || typeof listingsResult !== 'object' || !('listings' in listingsResult) || !Array.isArray(listingsResult.listings)) {
        throw new Error('Marketplace returned data in an unsupported format.');
      }
      if (!active) return;
      setListings(listingsResult.listings as AppListing[]);
      if (profileResult && typeof profileResult === 'object' && 'user' in profileResult && profileResult.user && typeof profileResult.user === 'object' && 'city' in profileResult.user && typeof profileResult.user.city === 'string') {
        setCity(profileResult.user.city);
      }
      setLoadError('');
    }).catch((error: unknown) => {
      console.error('Unable to load marketplace listings.', error);
      if (active) setLoadError(error instanceof Error ? error.message : 'Listings could not be loaded.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    const category = new URLSearchParams(window.location.search).get('category');
    if (category) setQuery(category);
    return () => { active = false; };
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesType = selectedFilter === 'All' || listing.type === selectedFilter;
      const haystack = `${listing.title} ${listing.description} ${listing.city} ${listing.type} ${listing.category} ${listing.price}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesLocation =
        locationFilter === 'Across India' ||
        ((locationFilter === 'Nearby' || locationFilter === 'In my city') && listing.city.toLowerCase() === city.toLowerCase());
      const numericPrice = getNumericPrice(listing.price);
      const matchesPrice =
        priceFilter === 'all' ||
        (priceFilter === 'under-1000' && numericPrice < 1000) ||
        (priceFilter === 'range-1000-10000' && numericPrice >= 1000 && numericPrice <= 10000) ||
        (priceFilter === 'above-10000' && numericPrice > 10000);

      return matchesType && matchesQuery && matchesLocation && matchesPrice;
    });
  }, [listings, selectedFilter, query, locationFilter, priceFilter, city]);

  const selectStory = (pill: string) => {
    setSelectedFilter('All');
    setLocationFilter('Across India');
    setPriceFilter('all');
    if (pill === 'Deals') {
      setQuery('');
      setSelectedFilter('DONATION');
      return;
    }
    setQuery(
      pill === 'For you'
        ? ''
        : pill === 'Tech'
          ? 'laptop'
          : pill === 'Furniture'
            ? 'table'
            : pill.toLowerCase(),
    );
  };

  return (
    <main className="page-shell">
      <div className="mb-8 rounded-[30px] border border-slate-800 bg-slate-900/65 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <label className="block text-xs uppercase tracking-[0.25em] text-slate-400">Search</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
              placeholder="Search electronics, books, bikes, campus deals..."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400"
            >
              <option>Nearby</option>
              <option>In my city</option>
              <option>Across India</option>
            </select>
            <select
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400"
            >
              <option value="all">Price: any</option>
              <option value="under-1000">Under ₹1,000</option>
              <option value="range-1000-10000">₹1,000 - ₹10,000</option>
              <option value="above-10000">Above ₹10,000</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {storyPills.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => selectStory(pill)}
              className={`whitespace-nowrap rounded-full border px-3 py-2 text-sm ${(pill === 'Deals' && selectedFilter === 'DONATION') || (pill === 'For you' && !query) || query.toLowerCase() === pill.toLowerCase() ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 bg-slate-950/60 text-slate-300'}`}
            >
              {pill}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              type="button"
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                selectedFilter === filter ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-cyan-400/60'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Marketplace</div>
          <h1 className="mt-2 text-3xl font-black text-white">Trending feed</h1>
        </div>
        <Link href="/post" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-center font-semibold text-slate-950 sm:w-auto">Post a listing</Link>
      </div>

      {loadError && <div role="alert" className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">{loadError}</div>}
      {loading ? (
        <div role="status" className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300">Loading current listings...</div>
      ) : loadError ? null : filteredListings.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <div className="text-xl font-bold text-white">No listings match your filters</div>
          <button
            type="button"
            onClick={() => {
              setSelectedFilter('All');
              setQuery('');
              setLocationFilter('Across India');
              setPriceFilter('all');
            }}
            className="mt-4 rounded-full border border-cyan-400 bg-cyan-500/10 px-5 py-2.5 font-semibold text-cyan-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((listing) => {
            const palette = [
              'from-cyan-500/80 via-sky-500/60 to-blue-900/90',
              'from-violet-500/80 via-fuchsia-500/60 to-slate-900',
              'from-emerald-500/80 via-teal-500/60 to-slate-900',
              'from-rose-500/80 via-pink-500/60 to-slate-900',
            ];
            const accent = palette[Number(listing.id.split('-').at(-1)?.length || 0) % palette.length];

            return (
              <article key={listing.id} className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/65 transition hover:-translate-y-1 hover:border-cyan-400/60">
                <Link href={`/listing/${encodeURIComponent(listing.id)}`} className="flex items-center justify-between border-b border-slate-800 px-4 py-3 hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-black text-slate-950">
                      {listing.seller.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{listing.seller}</div>
                      <div className="text-[11px] text-slate-400">{listing.city}</div>
                    </div>
                  </div>
                  <div className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">{listing.type}</div>
                </Link>

                <div className={`relative h-64 bg-gradient-to-br ${accent}`}>
                  {listing.images?.[0] && <ImagePreview src={listing.images[0]} alt={`${listing.title} photo`} width={640} height={480} sizes="(max-width: 768px) 100vw, 33vw" thumbnailClassName="h-64 w-full rounded-none object-cover" />}
                  <div className="pointer-events-none absolute inset-0 flex items-end justify-between p-5">
                    <span className="rounded-full bg-slate-950/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200">{listing.type}</span>
                    <span className="rounded-full bg-slate-950/70 px-3 py-2 text-sm font-black text-white">{listing.price}</span>
                  </div>
                </div>

                <Link href={`/listing/${encodeURIComponent(listing.id)}`} className="block p-4 hover:bg-slate-900">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-white">{listing.title}</div>
                      <div className="mt-1 text-sm text-slate-400">{listing.distance}</div>
                    </div>
                    <div className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">{listing.condition}</div>
                  </div>

                  <p className="text-sm text-slate-300">{listing.description}</p>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                      <span>♥ 128</span>
                      <span>💬 24</span>
                    </div>
                    <span>{listing.availability}</span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
