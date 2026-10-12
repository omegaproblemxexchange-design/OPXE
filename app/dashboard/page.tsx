/*
  OPXE dashboard note:
  - Purpose: Personal marketplace dashboard with live local listing and request counts.
  - Key behavior: links actions to listing, marketplace, delivery, and Head workflows.
*/

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAppStore, getCurrentUser, listingBelongsToUser, saveAppStore, type AppStore, type AppUser } from '@/lib/appStore';
import { addRecipientNotification } from '@/lib/notifications';

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [store, setStore] = useState<AppStore | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    setUser(getCurrentUser());
    setStore(getAppStore());
  }, []);

  if (!user || !store) {
    return (
      <main className="page-shell">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-black text-white">Your OPXE dashboard</h1>
          <p className="mt-2 text-slate-300">Sign in to see your listings and exchange requests.</p>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Sign in</Link>
        </div>
      </main>
    );
  }

  const myListings = store.listings.filter((listing) => listingBelongsToUser(listing, user));
  const myRequests = store.requests.filter((request) => request.requesterEmail === user.email);
  const pendingListings = myListings.filter((listing) => listing.status === 'Pending').length;
  const pendingRequests = myRequests.filter((request) => request.status === 'Pending').length;
  const incomingRequests = store.requests.filter((request) => {
    const listing = store.listings.find((item) => item.id === request.listingId);
    return listing ? listingBelongsToUser(listing, user) : false;
  });
  const stats = [
    { label: 'Your listings', value: String(myListings.length) },
    { label: 'Pending approval', value: String(pendingListings) },
    { label: 'Requests sent', value: String(myRequests.length) },
    { label: 'Requests awaiting reply', value: String(pendingRequests) },
  ];

  const updateRequest = (requestId: string, status: 'Accepted' | 'Declined') => {
    if (!user) return;
    const currentStore = getAppStore();
    const request = currentStore.requests.find((item) => item.id === requestId);
    const listing = request && currentStore.listings.find((item) => item.id === request.listingId);
    if (!request || !listing || request.status !== 'Pending' || !listingBelongsToUser(listing, user)) {
      setActionMessage('This request is no longer pending or is not on your listing. Refresh and try again.');
      return;
    }
    const nextStore = {
      ...currentStore,
      requests: currentStore.requests.map((request) => request.id === requestId ? { ...request, status } : request),
    };
    saveAppStore(nextStore);
    setStore(nextStore);
    try {
      addRecipientNotification({
        recipientEmail: request.requesterEmail,
        senderLabel: user.name,
        title: `Exchange request ${status.toLowerCase()}`,
        detail: `Your request for "${request.listingTitle}" was ${status.toLowerCase()} by the listing owner.`,
      });
      setActionMessage(`Request ${status.toLowerCase()}. The requester has a notification.`);
    } catch (error) {
      console.error('The request status was saved, but the requester notification could not be saved.', error);
      setActionMessage('The request status was saved, but the requester notification could not be saved.');
    }
  };

  return (
    <main className="page-shell">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Dashboard</div>
          <h1 className="mt-2 text-3xl font-black text-white">Welcome, {user.name}</h1>
          <p className="mt-2 text-sm text-slate-400">Your exchange activity is stored in this browser and is not synced across devices.</p>
        </div>
        <Link href="/post" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">Create listing</Link>
      </div>
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
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Your listings</h2>
            <Link href="/profile" className="text-sm text-cyan-300">View profile</Link>
          </div>
          <div className="space-y-3">
            {myListings.length ? myListings.map((listing) => (
              <Link key={listing.id} href={`/listing/${listing.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-400/50">
                <span className="font-medium text-white">{listing.title}</span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-cyan-200">{listing.status}</span>
              </Link>
            )) : <p className="text-sm text-slate-400">No listings yet. Create your first post to get started.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Exchange requests</h2>
            <Link href="/marketplace" className="text-sm text-cyan-300">Find items</Link>
          </div>
          <div className="space-y-3">
            {myRequests.length ? myRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="font-medium text-white">{request.listingTitle}</span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-cyan-200">{request.status}</span>
              </div>
            )) : <p className="text-sm text-slate-400">No requests yet. Browse the marketplace and send a request on an item.</p>}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Requests on your listings</h2>
          <span className="text-sm text-cyan-300">{incomingRequests.filter((request) => request.status === 'Pending').length} pending</span>
        </div>
        <div className="space-y-3">
          {incomingRequests.length ? incomingRequests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div>
                <div className="font-semibold text-white">{request.listingTitle}</div>
                <div className="mt-1 text-sm text-slate-400">Request from {request.requester} • {request.status}</div>
              </div>
              {request.status === 'Pending' && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => updateRequest(request.id, 'Accepted')} className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200">Accept</button>
                  <button type="button" onClick={() => updateRequest(request.id, 'Declined')} className="rounded-full bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200">Decline</button>
                </div>
              )}
            </div>
          )) : <p className="text-sm text-slate-400">No one has requested your listings yet.</p>}
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/marketplace" className="rounded-full border border-slate-700 px-5 py-3 text-center font-semibold text-white transition hover:border-cyan-400">Browse marketplace</Link>
        <Link href="/delivery" className="rounded-full border border-slate-700 px-5 py-3 text-center font-semibold text-white transition hover:border-cyan-400">Delivery information</Link>
        {user.role === 'admin' && <Link href="/admin" className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-center font-semibold text-cyan-200 sm:col-span-2">Open Head console</Link>}
      </div>
    </main>
  );
}
