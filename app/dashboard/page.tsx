'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Account = {
  id: string;
  name: string;
  role: 'user' | 'premium' | 'admin';
};

type DashboardListing = {
  id: string;
  title: string;
  status: string;
};

type ExchangeRequest = {
  id: string;
  listing_id: string;
  listing_title_snapshot: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester_name?: string;
};

type DashboardData = {
  user: Account;
  listings: DashboardListing[];
  sentRequests: ExchangeRequest[];
  receivedRequests: ExchangeRequest[];
};

async function readError(response: Response, fallback: string) {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error || fallback;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [busyRequest, setBusyRequest] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadDashboard = async (signal?: AbortSignal) => {
    const response = await fetch('/api/dashboard', { cache: 'no-store', signal });
    if (response.status === 401) {
      setSignedOut(true);
      setData(null);
      return;
    }
    if (!response.ok) throw new Error(await readError(response, 'Unable to load your dashboard.'));
    setSignedOut(false);
    setData(await response.json() as DashboardData);
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Unable to load the OPXE dashboard.', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load your dashboard.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const updateRequest = async (requestId: string, status: 'Accepted' | 'Declined') => {
    setBusyRequest(requestId);
    setErrorMessage('');
    setActionMessage('');
    try {
      const response = await fetch('/api/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      });
      if (!response.ok) throw new Error(await readError(response, 'Unable to update the exchange request.'));
      setActionMessage(`Request ${status.toLowerCase()}. The requester has been notified.`);
      await loadDashboard();
    } catch (error) {
      console.error('Unable to update the OPXE exchange request.', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update the exchange request.');
    } finally {
      setBusyRequest('');
    }
  };

  if (loading) {
    return <main className="page-shell"><p className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">Loading your dashboard…</p></main>;
  }

  if (signedOut || !data) {
    return (
      <main className="page-shell">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-black text-white">Your OPXE dashboard</h1>
          <p className="mt-2 text-slate-300">{errorMessage || 'Sign in to see your listings and exchange requests.'}</p>
          {signedOut && <Link href={`/login?next=${encodeURIComponent('/dashboard')}`} className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Sign in</Link>}
          {!signedOut && <button type="button" onClick={() => { setLoading(true); loadDashboard().catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard.')).finally(() => setLoading(false)); }} className="mt-5 rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Try again</button>}
        </div>
      </main>
    );
  }

  const pendingListings = data.listings.filter((listing) => listing.status === 'pending').length;
  const pendingRequests = data.sentRequests.filter((request) => request.status === 'pending').length;
  const stats = [
    { label: 'Your listings', value: String(data.listings.length) },
    { label: 'Pending approval', value: String(pendingListings) },
    { label: 'Requests sent', value: String(data.sentRequests.length) },
    { label: 'Requests awaiting reply', value: String(pendingRequests) },
  ];

  return (
    <main className="page-shell">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Dashboard</div>
          <h1 className="mt-2 text-3xl font-black text-white">Welcome, {data.user.name}</h1>
          <p className="mt-2 text-sm text-slate-400">Your listings and exchange requests sync with your OPXE account.</p>
        </div>
        <Link href="/post" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">Create listing</Link>
      </div>
      {errorMessage && <p role="alert" className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}
      {actionMessage && <p role="status" className="mb-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{actionMessage}</p>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="text-3xl font-black text-white">{stat.value}</div>
            <div className="mt-2 text-sm text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Your listings</h2>
            <Link href="/profile" className="text-sm text-cyan-300">View profile</Link>
          </div>
          <div className="space-y-3">
            {data.listings.length ? data.listings.map((listing) => (
              <Link key={listing.id} href={`/listing/${encodeURIComponent(listing.id)}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-400/50">
                <span className="font-medium text-white">{listing.title}</span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-cyan-200">{listing.status}</span>
              </Link>
            )) : <p className="text-sm text-slate-400">No listings yet. Create your first post to get started.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Exchange requests you sent</h2>
            <Link href="/marketplace" className="text-sm text-cyan-300">Find items</Link>
          </div>
          <div className="space-y-3">
            {data.sentRequests.length ? data.sentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <Link href={`/listing/${encodeURIComponent(request.listing_id)}`} className="font-medium text-white hover:text-cyan-200">{request.listing_title_snapshot}</Link>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs capitalize text-cyan-200">{request.status}</span>
              </div>
            )) : <p className="text-sm text-slate-400">No requests yet. Browse the marketplace and send a request on an item.</p>}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Requests on your listings</h2>
          <span className="text-sm text-cyan-300">{data.receivedRequests.filter((request) => request.status === 'pending').length} pending</span>
        </div>
        <div className="space-y-3">
          {data.receivedRequests.length ? data.receivedRequests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div>
                <div className="font-semibold text-white">{request.listing_title_snapshot}</div>
                <div className="mt-1 text-sm capitalize text-slate-400">Request from {request.requester_name} · {request.status}</div>
              </div>
              {request.status === 'pending' && (
                <div className="flex gap-2">
                  <button type="button" disabled={busyRequest === request.id} onClick={() => updateRequest(request.id, 'Accepted')} className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 disabled:opacity-50">Accept</button>
                  <button type="button" disabled={busyRequest === request.id} onClick={() => updateRequest(request.id, 'Declined')} className="rounded-full bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200 disabled:opacity-50">Decline</button>
                </div>
              )}
            </div>
          )) : <p className="text-sm text-slate-400">No one has requested your listings yet.</p>}
        </div>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/marketplace" className="rounded-full border border-slate-700 px-5 py-3 text-center font-semibold text-white transition hover:border-cyan-400">Browse marketplace</Link>
        <Link href="/delivery" className="rounded-full border border-slate-700 px-5 py-3 text-center font-semibold text-white transition hover:border-cyan-400">Delivery information</Link>
        {data.user.role === 'admin' && <Link href="/admin" className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-center font-semibold text-cyan-200 sm:col-span-2">Open Head console</Link>}
      </div>
    </main>
  );
}
