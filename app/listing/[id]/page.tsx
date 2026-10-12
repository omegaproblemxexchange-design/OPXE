'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import ImagePreview from '@/components/ImagePreview';
import type { AppListing } from '@/lib/appStore';

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [listing, setListing] = useState<AppListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [saved, setSaved] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch(`/api/listings/${encodeURIComponent(id)}`, { cache: 'no-store' }),
      fetch('/api/profile', { cache: 'no-store' }),
    ]).then(async ([listingResponse, profileResponse]) => {
      const listingPayload: unknown = await listingResponse.json();
      const profilePayload: unknown = profileResponse.ok ? await profileResponse.json() : null;
      if (!listingResponse.ok) {
        const message = listingPayload && typeof listingPayload === 'object' && 'error' in listingPayload ? String(listingPayload.error) : 'Unable to load this listing.';
        throw new Error(message);
      }
      if (!listingPayload || typeof listingPayload !== 'object' || !('listing' in listingPayload) || !listingPayload.listing) {
        throw new Error('The listing service returned an unsupported response.');
      }
      if (!active) return;
      setListing(listingPayload.listing as AppListing);
      const signedInUser = profilePayload && typeof profilePayload === 'object' && 'user' in profilePayload
        ? profilePayload.user
        : null;
      const userId = signedInUser && typeof signedInUser === 'object' && 'id' in signedInUser && typeof signedInUser.id === 'string'
        ? signedInUser.id
        : '';
      setCurrentUserId(userId);
      setIsSignedIn(profileResponse.ok && Boolean(userId));
      if (profileResponse.ok && userId) {
        const actionsResponse = await fetch(`/api/listings/${encodeURIComponent(id)}/actions`, { cache: 'no-store' });
        const actionsPayload: unknown = await actionsResponse.json();
        if (!actionsResponse.ok) {
          const message = actionsPayload && typeof actionsPayload === 'object' && 'error' in actionsPayload ? String(actionsPayload.error) : 'Unable to load your listing actions.';
          throw new Error(message);
        }
        if (
          !actionsPayload || typeof actionsPayload !== 'object'
          || !('saved' in actionsPayload) || typeof actionsPayload.saved !== 'boolean'
          || !('requestSent' in actionsPayload) || typeof actionsPayload.requestSent !== 'boolean'
          || !('isOwner' in actionsPayload) || typeof actionsPayload.isOwner !== 'boolean'
        ) throw new Error('The listing actions service returned an unsupported response.');
        if (!active) return;
        setSaved(actionsPayload.saved);
        setRequestSent(actionsPayload.requestSent);
        setIsOwner(actionsPayload.isOwner);
      }
      setLoadError('');
    }).catch((error: unknown) => {
      console.error('Unable to load the listing detail page.', error);
      if (active) {
        setListing(null);
        setLoadError(error instanceof Error ? error.message : 'Unable to load this listing.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  const performAction = async (action: 'request' | 'report') => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionMessage('');
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(id)}/actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action === 'request'
          ? { action }
          : { action, reason: reportReason.trim() || 'User reported this listing for Head review.' }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result ? String(result.error) : 'Unable to complete this action.';
        throw new Error(message);
      }
      if (action === 'request') setRequestSent(true);
      else setReportReason('');
      setActionMessage(action === 'request'
        ? 'Your request was sent and the listing owner was notified.'
        : 'Your report was submitted for OPXE Head review.');
    } catch (error) {
      console.error(`Unable to ${action} the listing.`, error);
      setActionMessage(error instanceof Error ? error.message : 'Unable to complete this action.');
    } finally {
      setActionBusy(false);
    }
  };

  const toggleSaved = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionMessage('');
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(id)}/actions`, {
        method: saved ? 'DELETE' : 'PUT',
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result ? String(result.error) : 'Unable to update saved listings.';
        throw new Error(message);
      }
      setSaved(!saved);
      setActionMessage(saved ? 'Listing removed from your saved listings.' : 'Listing added to your saved listings.');
    } catch (error) {
      console.error('Unable to update the saved listing.', error);
      setActionMessage(error instanceof Error ? error.message : 'Unable to update saved listings.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return <main className="page-shell"><div className="text-slate-300">Loading listing...</div></main>;
  }
  if (!listing) {
    return (
      <main className="page-shell">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">{loadError ? 'Listing unavailable' : 'Listing not found'}</h1>
          <p role={loadError ? 'alert' : undefined} className="mt-2 text-slate-300">{loadError || 'This item may have been removed or the link is invalid.'}</p>
          <Link href="/marketplace" className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Back to marketplace</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/marketplace" className="text-sm text-cyan-300">← Back to marketplace</Link>
        <div className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
          {listing.type}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          {listing.images?.length ? (
            <div className="space-y-3">
              <ImagePreview src={listing.images[0]} alt={`${listing.title} photo 1`} width={1200} height={720} sizes="(max-width: 1024px) 100vw, 60vw" thumbnailClassName="h-72 w-full rounded-3xl object-cover" />
              {listing.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {listing.images.slice(1).map((image: string, index: number) => (
                    <ImagePreview key={`${index}-${image.length}`} src={image} alt={`${listing.title} photo ${index + 2}`} width={320} height={240} thumbnailClassName="h-24 w-full rounded-2xl object-cover" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-72 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-slate-900 to-blue-500/20 p-5">
              <div className="flex h-full items-end justify-between">
                <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-300">{listing.title}</span>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">{listing.condition}</span>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h1 className="text-3xl font-black text-white">{listing.title}</h1>
                <div className="mt-2 text-slate-400">{listing.seller} • {listing.city}</div>
              </div>
              <div className="text-2xl font-black text-cyan-300">{listing.price}</div>
            </div>

            <p className="mt-5 text-slate-300">{listing.description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</div>
                <div className="mt-2 text-white">{listing.status}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Availability</div>
                <div className="mt-2 text-white">{listing.availability}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Category</div>
                <div className="mt-2 text-white">{listing.category}</div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Actions</div>
            <div className="mt-4 space-y-3">
              {!isSignedIn ? (
                <>
                  <p className="text-sm text-slate-300">Sign in to request, save, or report this listing.</p>
                  <Link href={`/login?next=${encodeURIComponent(`/listing/${id}`)}`} className="block w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-center font-semibold text-slate-950">Sign in to continue</Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void performAction('request')}
                    disabled={actionBusy || requestSent || isOwner || (listing.status !== 'Approved' && listing.status !== 'Active')}
                    className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {requestSent ? 'Request sent' : isOwner ? 'Your listing' : listing.status === 'Approved' || listing.status === 'Active' ? 'Send request' : 'Not available for requests'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleSaved()}
                    disabled={actionBusy || (listing.status !== 'Approved' && listing.status !== 'Active')}
                    className={`w-full rounded-full border px-5 py-3 font-semibold disabled:opacity-50 ${saved ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-white'}`}
                  >
                    {saved ? 'Remove from saved' : 'Save listing'}
                  </button>
                  <label htmlFor="listing-report-reason" className="block text-sm text-slate-300">Report details (optional)</label>
                  <textarea
                    id="listing-report-reason"
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                    placeholder="Tell the Head why this listing should be reviewed"
                  />
                  <button
                    type="button"
                    onClick={() => void performAction('report')}
                    disabled={actionBusy || reportReason.length > 1000 || (listing.status !== 'Approved' && listing.status !== 'Active')}
                    className="w-full rounded-full border border-slate-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    Report listing
                  </button>
                  {actionMessage && <p role="status" className="text-sm text-cyan-200">{actionMessage}</p>}
                  {isOwner && currentUserId === listing.ownerId && <p className="text-xs text-slate-400">You own this listing; exchange requests are disabled.</p>}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
