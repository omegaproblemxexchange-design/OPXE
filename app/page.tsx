/*
  OPXE landing page note:
  - Purpose: Home page for discovering approved listings, categories, and the OPXE exchange service.
  - Key behavior: reads the current browser marketplace store and links live listings, story shortcuts, category counts, and headline metrics to working routes.
*/

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { AppListing } from '@/lib/appStore';

const categoryIcons: Record<string, string> = {
  Electronics: '📱',
  'Books & Study': '📚',
  Books: '📚',
  Furniture: '🪑',
  'Clothing & Accessories': '👕',
  Clothing: '👕',
  'Sports & Fitness': '🏃',
  Bikes: '🚲',
  Vehicles: '🚲',
  'Home & Kitchen': '🏠',
  Home: '🏠',
  Campus: '🎓',
  Offers: '🎁',
};

const presetCategories = [
  'Electronics',
  'Books & Study',
  'Furniture',
  'Clothing & Accessories',
  'Sports & Fitness',
  'Home & Kitchen',
  'Vehicles',
  'Other',
];

function getCategoryIcon(category: string) {
  return categoryIcons[category] ?? '📦';
}

function getListingHref(listing: AppListing) {
  return `/listing/${encodeURIComponent(listing.id)}`;
}

export default function HomePage() {
  const [listings, setListings] = useState<AppListing[]>([]);
  const [communitySize, setCommunitySize] = useState(0);
  const [storeReady, setStoreReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    const loadMarketplace = async () => {
      try {
        const [listingResponse, statsResponse] = await Promise.all([
          fetch('/api/listings', { cache: 'no-store' }),
          fetch('/api/public/stats', { cache: 'no-store' }),
        ]);
        const [listingPayload, statsPayload]: [unknown, unknown] = await Promise.all([
          listingResponse.json(),
          statsResponse.json(),
        ]);
        if (!listingResponse.ok || !statsResponse.ok) {
          const problem = !listingResponse.ok ? listingPayload : statsPayload;
          const message = problem && typeof problem === 'object' && 'error' in problem
            ? String(problem.error)
            : 'Marketplace data is temporarily unavailable.';
          throw new Error(message);
        }
        if (
          !listingPayload || typeof listingPayload !== 'object' || !('listings' in listingPayload)
          || !Array.isArray(listingPayload.listings)
          || !statsPayload || typeof statsPayload !== 'object'
          || !('members' in statsPayload) || typeof statsPayload.members !== 'number'
        ) throw new Error('Marketplace returned data in an unsupported format.');
        if (!active) return;
        setListings(listingPayload.listings as AppListing[]);
        setCommunitySize(statsPayload.members);
        setLoadError('');
      } catch (error) {
        console.error('Unable to refresh the homepage marketplace data.', error);
        if (active) setLoadError(error instanceof Error ? error.message : 'Marketplace data is unavailable.');
      } finally {
        if (active) setStoreReady(true);
      }
    };
    void loadMarketplace();
    const refreshTimer = window.setInterval(() => void loadMarketplace(), 60_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const categories = useMemo(() => {
    const categoryNames = new Set([
      ...presetCategories,
      ...listings.map((listing) => listing.category.trim()).filter(Boolean),
    ]);
    return Array.from(categoryNames).map((name) => ({
      name,
      count: listings.filter((listing) => listing.category.trim().toLowerCase() === name.toLowerCase()).length,
    })).sort((first, second) => {
      const firstPreset = presetCategories.indexOf(first.name);
      const secondPreset = presetCategories.indexOf(second.name);
      if (firstPreset !== -1 || secondPreset !== -1) {
        return (firstPreset === -1 ? presetCategories.length : firstPreset)
          - (secondPreset === -1 ? presetCategories.length : secondPreset);
      }
      return first.name.localeCompare(second.name);
    });
  }, [listings]);

  const storyListings = listings;
  const featuredListings = listings.slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-[32px] border border-slate-800 bg-slate-900/70 p-5 shadow-[0_30px_80px_rgba(8,15,35,0.8)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 font-black text-slate-950">Ω</div>
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Omega ProblemX Exchange</div>
              <div className="text-xs text-slate-400">A community marketplace for useful things</div>
            </div>
          </div>
          <Link href="/marketplace" className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-400 hover:text-cyan-300">
            Explore marketplace
          </Link>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Recently approved listings</div>
              <p className="mt-1 text-xs text-slate-400">Select a listing to see its details.</p>
            </div>
            <Link href="/post" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">+ Post a listing</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" aria-label="Recently approved marketplace listings">
            {storyListings.map((listing) => (
              <Link key={listing.id} href={getListingHref(listing)} className="group min-w-[82px] text-center">
                <div className="mx-auto mb-2 h-[70px] w-[70px] rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 p-[2px] transition group-hover:scale-105">
                  <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-950 text-lg font-black text-white">
                    {listing.images?.[0]
                      ? <Image src={listing.images[0]} alt="" fill unoptimized sizes="70px" className="object-cover" />
                      : listing.title.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="max-w-[86px] truncate text-[11px] text-slate-300">{listing.title}</div>
              </Link>
            ))}
            {storeReady && loadError && (
              <div role="alert" className="rounded-2xl border border-amber-500/30 px-5 py-4 text-sm text-amber-200">{loadError}</div>
            )}
            {storeReady && !loadError && storyListings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-4 text-sm text-slate-400">
                No approved listings yet. Post a listing to get started.
              </div>
            )}
            {!storeReady && <div className="px-3 py-4 text-sm text-slate-400">Loading current listings...</div>}
          </div>
        </div>

        <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-200">
              Exchange, reuse, and share locally
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Find it. Exchange it. <span className="text-cyan-300">Pass it on.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
              OPXE means Omega ProblemX Exchange: a place for people and campus communities to buy, sell, swap, lend, borrow, or give away useful items. Browse approved listings, contact their owners through exchange requests, or post an item of your own.
            </p>
            <p className="mt-3 max-w-2xl text-sm text-slate-400">
              Listings and account information are stored in this browser and are not shared across devices. Payments and transaction processing are not connected.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/marketplace" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 font-semibold text-slate-950 shadow-glow transition hover:brightness-110">
                Browse listings
              </Link>
              <Link href="/post" className="rounded-full border border-slate-700 bg-slate-900/60 px-6 py-3 font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300">
                Post an item
              </Link>
              <Link href="/about" className="rounded-full border border-slate-700 bg-slate-900/60 px-6 py-3 font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-300">
                About Omega
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Link href="/marketplace" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-400/60 hover:bg-slate-900">
                <div className="text-2xl font-black text-white">{storeReady && !loadError ? listings.length : '—'}</div>
                <div className="mt-1 text-xs text-slate-400">Approved listings across OPXE</div>
              </Link>
              <Link href="#categories" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-400/60 hover:bg-slate-900">
                <div className="text-2xl font-black text-white">{storeReady && !loadError ? categories.filter((category) => category.count > 0).length : '—'}</div>
                <div className="mt-1 text-xs text-slate-400">Categories with listings</div>
              </Link>
              <Link href="/register" className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-400/60 hover:bg-slate-900">
                <div className="text-2xl font-black text-white">{storeReady && !loadError ? communitySize : '—'}</div>
                <div className="mt-1 text-xs text-slate-400">Active member accounts</div>
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">Counts reflect active accounts and approved listings across OPXE.</p>
          </div>

          <div className="rounded-[28px] border border-slate-800 bg-slate-950/80 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">Latest in the marketplace</div>
                <div className="mt-1 text-xs text-slate-400">Recently approved OPXE listings</div>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-200">Updated</span>
            </div>
            <div className="space-y-3">
              {featuredListings.slice(0, 4).map((listing) => (
                <Link key={listing.id} href={getListingHref(listing)} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 transition hover:border-cyan-400/60">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/40 to-blue-900 text-sm font-bold text-white">
                    {listing.images?.[0]
                      ? <Image src={listing.images[0]} alt="" fill unoptimized sizes="56px" className="object-cover" />
                      : listing.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10px] uppercase tracking-[0.2em] text-cyan-300">{listing.category} · {listing.type}</div>
                    <div className="mt-1 truncate font-semibold text-white">{listing.title}</div>
                    <div className="mt-1 truncate text-[11px] text-slate-400">{listing.city} · {listing.seller}</div>
                  </div>
                  <div className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300">{listing.price}</div>
                </Link>
              ))}
              {storeReady && !loadError && featuredListings.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No approved items to show yet.</p>
              )}
              {!storeReady && <p className="p-4 text-sm text-slate-400">Loading current listings...</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Live marketplace</div>
            <h2 className="mt-2 text-3xl font-black text-white">Recently approved items</h2>
            <p className="mt-2 text-sm text-slate-400">Listings appear here after OPXE Head approval.</p>
          </div>
          <Link href="/marketplace" className="shrink-0 text-sm font-medium text-cyan-300">View all</Link>
        </div>

        {loadError ? null : featuredListings.length === 0 && storeReady ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center">
            <div className="text-xl font-bold text-white">No approved listings yet</div>
            <p className="mt-2 text-sm text-slate-400">Sign in and post an item to start filling the marketplace.</p>
            <Link href="/post" className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950">Post a listing</Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredListings.map((listing) => (
              <Link key={listing.id} href={getListingHref(listing)} className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/65 transition hover:-translate-y-1 hover:border-cyan-400/60">
                <div className="relative flex h-56 items-end justify-between bg-gradient-to-br from-cyan-500/60 via-slate-900 to-blue-900 p-4">
                  {listing.images?.[0] && <Image src={listing.images[0]} alt={listing.title} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />}
                  <span className="relative rounded-full bg-slate-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-cyan-200">{listing.category}</span>
                  <span className="relative rounded-full bg-slate-950/80 px-3 py-2 text-sm font-black text-white">{listing.price}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-white">{listing.title}</div>
                      <div className="mt-1 text-sm text-slate-400">{listing.city} · {listing.seller}</div>
                    </div>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-cyan-300">{listing.type}</span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-300">{listing.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{listing.condition}</span>
                    <span>{listing.availability}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="categories" className="mt-12 scroll-mt-28">
        <div className="mb-8 flex items-end justify-between gap-3">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Browse categories</div>
            <h2 className="mt-2 text-3xl font-black text-white">Find items by category</h2>
            <p className="mt-2 text-sm text-slate-400">Each category opens matching approved listings. Counts come from this browser&apos;s marketplace.</p>
          </div>
          <Link href="/marketplace" className="shrink-0 text-sm font-medium text-cyan-300">All listings</Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <Link href={`/marketplace?category=${encodeURIComponent(category.name)}`} key={category.name} className="group rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-5 transition hover:-translate-y-1 hover:border-cyan-400/60">
              <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 p-3 text-2xl">{getCategoryIcon(category.name)}</div>
              <div className="text-xl font-bold text-white">{category.name}</div>
              <div className="mt-2 text-sm text-slate-400">{loadError ? '—' : `${category.count} approved ${category.count === 1 ? 'listing' : 'listings'}`}</div>
              <div className="mt-4 text-xs font-semibold text-cyan-300 group-hover:text-cyan-200">Browse category →</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="rounded-[30px] border border-slate-800 bg-slate-900/70 p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">About Omega</div>
              <h2 className="mt-3 text-3xl font-black text-white">Omega ProblemX Exchange</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                OPXE is a community exchange marketplace for students and local communities to give useful things another life: discover items, post what you have or need, and arrange a possible exchange with the listing owner.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Listings wait for review before appearing publicly.                 Listing discovery uses OPXE&apos;s server when configured. Several account workflows remain local prototypes; payment processing and courier booking are not connected.
              </p>
              <Link href="/about" className="mt-5 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200">Read more about OPXE →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-2xl">🔁</div>
                <div className="mt-3 text-base font-bold text-white">Reuse & exchange</div>
                <p className="mt-2 text-sm text-slate-300">Buy, sell, swap, lend, borrow, or donate items.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-2xl">🧭</div>
                <div className="mt-3 text-base font-bold text-white">Discover locally</div>
                <p className="mt-2 text-sm text-slate-300">Browse approved items by category and city.</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-2xl">🛡️</div>
                <div className="mt-3 text-base font-bold text-white">Review first</div>
                <p className="mt-2 text-sm text-slate-300">New listings stay hidden until they are approved.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
