/*
  OPXE delivery note:
  - Purpose: Explains delivery terms and calculates an indicative delivery fee.
  - Key behavior: estimate is calculated locally; no courier booking or payment is processed.
*/

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SignInPrompt from '@/components/SignInPrompt';
import { createDeliveryRequest, getAppStore, getCurrentUser, type AppDeliveryRequest, type AppUser } from '@/lib/appStore';

export default function DeliveryPage() {
  const [distance, setDistance] = useState('5');
  const numericDistance = Number(distance);
  const fee = Number.isFinite(numericDistance) && numericDistance > 0 && numericDistance <= 100
    ? Math.max(80, Math.ceil(numericDistance * 12 + 40))
    : null;
  const [user, setUser] = useState<AppUser | null>(null);
  const [requests, setRequests] = useState<AppDeliveryRequest[]>([]);
  const [product, setProduct] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [preferredPartner, setPreferredPartner] = useState('No preference');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setRequests(getAppStore().deliveryRequests.filter((request) => request.userEmail === currentUser.email));
    }
  }, []);

  const submitDeliveryRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestError('');
    setRequestMessage('');
    const result = createDeliveryRequest({
      product,
      pickupAddress,
      deliveryAddress,
      distanceKm: numericDistance,
      preferredPartner,
    });
    if (!result.ok) {
      setRequestError(result.error);
      return;
    }

    setRequests((current) => [result.request, ...current]);
    setProduct('');
    setPickupAddress('');
    setDeliveryAddress('');
    setRequestMessage(`Request ${result.request.id} saved. Estimated fee: ₹${result.request.estimatedFee.toLocaleString('en-IN')}. No courier has been booked.`);
  };

  return (
    <main className="page-shell">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Delivery</div>
        <h1 className="mt-3 text-3xl font-black text-white">OPXE delivery service</h1>
        <p className="mt-2 text-sm text-slate-400">Delivery requests are limited to 100 km. A saved request does not dispatch a courier or charge a payment.</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="text-lg font-bold text-white">Delivery distance and estimate</div>
            <label htmlFor="delivery-distance" className="block text-sm text-slate-300">Approximate distance (km)</label>
            <input id="delivery-distance" type="number" min="0.1" step="0.1" value={distance} onChange={(event) => { setDistance(event.target.value); setRequestError(''); setRequestMessage(''); }} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" />
            {Number.isFinite(numericDistance) && numericDistance > 100 ? (
              <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <div className="font-semibold">Delivery above 100 km is not available for self-service.</div>
                <p className="mt-2">Please contact the Help Centre to check whether pickup and delivery can be arranged.</p>
                <div className="mt-3 flex flex-wrap gap-4">
                  <a href="mailto:omegaproblemxexchange@gmail.com?subject=Delivery%20over%20100%20km" className="font-semibold text-cyan-300 hover:underline">Email omegaproblemxexchange@gmail.com</a>
                  <a href="https://wa.me/919515197745" className="font-semibold text-cyan-300 hover:underline">WhatsApp +91 95151 97745</a>
                  <Link href="/help" className="font-semibold text-cyan-300 hover:underline">Open Help Centre</Link>
                </div>
              </div>
            ) : fee === null ? (
              <p role="alert" className="text-sm text-amber-300">Enter a distance greater than zero.</p>
            ) : (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <div className="text-sm text-slate-300">Estimated fee</div>
                <div className="mt-1 text-3xl font-black text-cyan-300">₹{fee.toLocaleString('en-IN')}</div>
                <div className="mt-1 text-xs text-slate-400">Formula: max(₹80 minimum, ₹40 base + ₹12/km)</div>
              </div>
            )}
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Self-service requests accept distances up to and including 100 km.</li>
              <li>Courier availability, final price, pickup, and drop-off must be confirmed by a real provider before launch.</li>
            </ul>
          </div>

          {Number.isFinite(numericDistance) && numericDistance > 0 && numericDistance <= 100 ? (
            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
              <div>
                <div className="text-lg font-bold text-white">Request a pickup and delivery</div>
                <p className="mt-2 text-sm text-slate-400">Choose a courier preference. Until a provider API is connected, this only saves a request in this browser.</p>
              </div>
              {!user ? (
                <SignInPrompt next="/delivery" title="Sign in to request delivery" description="A signed-in account is required to save a pickup and delivery request." />
              ) : (
                <form onSubmit={submitDeliveryRequest} className="space-y-4">
                  <label className="block text-sm text-slate-300">
                    Product
                    <input required maxLength={120} value={product} onChange={(event) => setProduct(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="What needs to be delivered?" />
                  </label>
                  <label className="block text-sm text-slate-300">
                    Pickup address
                    <textarea required maxLength={300} rows={2} value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Pickup location" />
                  </label>
                  <label className="block text-sm text-slate-300">
                    Delivery address
                    <textarea required maxLength={300} rows={2} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Drop-off location" />
                  </label>
                  <label className="block text-sm text-slate-300">
                    Preferred courier (preference only; not connected yet)
                    <select value={preferredPartner} onChange={(event) => setPreferredPartner(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400">
                      <option>No preference</option>
                      <option>Blue Dart</option>
                      <option>Delhivery</option>
                      <option>Shiprocket</option>
                    </select>
                  </label>
                  <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">Save delivery request</button>
                </form>
              )}
              {requestError && <p role="alert" className="text-sm text-red-300">{requestError}</p>}
              {requestMessage && <p role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">{requestMessage}</p>}
              {requests.length > 0 && (
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  <h2 className="font-semibold text-white">Your delivery requests on this device</h2>
                  {requests.map((request) => (
                    <article key={request.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
                      <div className="font-medium text-white">{request.product} · {request.distanceKm} km · ₹{request.estimatedFee.toLocaleString('en-IN')}</div>
                      <div className="mt-1 text-slate-400">{request.preferredPartner} preference · {request.status}</div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
              <div className="text-lg font-bold text-white">Courier partner connection</div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                {['Blue Dart', 'Delhivery', 'Shiprocket'].map((partner) => (
                  <span key={partner} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2">{partner}</span>
                ))}
              </div>
              <p className="text-sm text-slate-400">These are possible provider options, not active integrations. A provider account, server-side API credentials, and booking/tracking callbacks are needed to schedule pickup and confirm delivery.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
