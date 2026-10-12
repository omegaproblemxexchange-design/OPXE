/*
  OPXE profile note:
  - Purpose: View and edit the signed-in user's browser-local profile.
  - Key behavior: persists profile changes to the browser store and session.
*/

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ImagePreview from '@/components/ImagePreview';

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  city: string;
  phone: string;
  college: string;
  course: string;
  classYear: string;
  role: 'user' | 'premium' | 'admin';
  accountStatus: string;
  profileReviewed: boolean;
  emailVerified: boolean;
  createdAt: string;
};

type ProfileListing = {
  id: string;
  title: string;
  category: string;
  type: string;
  images: string[];
  city: string;
  price: string;
  status: string;
};

type ProfileResponse = {
  user: ProfileUser;
  ownListings: ProfileListing[];
  savedListings: ProfileListing[];
  requests: Array<{ id: string; listing_id: string; listing_title_snapshot: string; status: string }>;
};

async function responseError(response: Response) {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error || 'Unable to update your profile.';
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [classYear, setClassYear] = useState('');
  const [message, setMessage] = useState('');
  const [savedListings, setSavedListings] = useState<ProfileListing[]>([]);
  const [ownListings, setOwnListings] = useState<ProfileListing[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; title: string; value: string; href: string }>>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const applyProfile = (result: ProfileResponse) => {
    const currentUser = result.user;
    setUser(currentUser);
    setName(currentUser.name);
    setCity(currentUser.city);
    setPhone(currentUser.phone);
    setCollege(currentUser.college);
    setCourse(currentUser.course);
    setClassYear(currentUser.classYear);
    setOwnListings(result.ownListings);
    setSavedListings(result.savedListings);
    setActivity([
      ...result.ownListings.map((item) => ({ id: item.id, title: item.title, value: `Listing • ${item.status}`, href: `/listing/${encodeURIComponent(item.id)}` })),
      ...result.requests.map((item) => ({ id: item.id, title: item.listing_title_snapshot, value: `Request • ${item.status}`, href: '/dashboard' })),
    ].slice(0, 8));
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/profile', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setSignedOut(true);
          return;
        }
        if (!response.ok) throw new Error(await responseError(response));
        applyProfile(await response.json() as ProfileResponse);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Unable to load OPXE profile.', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load your profile.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const saveProfile = async () => {
    if (!user) return;
    if (!name.trim() || !city.trim() || !phone.trim() || !college.trim() || !course.trim() || !classYear.trim()) {
      setMessage('Please complete your name, city, phone, college, course, and class/year.');
      return;
    }
    setSaving(true);
    setMessage('');
    setErrorMessage('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim(),
          phone: phone.trim(),
          college: college.trim(),
          course: course.trim(),
          classYear: classYear.trim(),
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const refreshed = await fetch('/api/profile', { cache: 'no-store' });
      if (!refreshed.ok) throw new Error(await responseError(refreshed));
      applyProfile(await refreshed.json() as ProfileResponse);
      setEditing(false);
      setMessage('Profile saved to your OPXE account.');
    } catch (error) {
      console.error('Unable to save OPXE profile.', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const removeSavedListing = async (listingId: string) => {
    setErrorMessage('');
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(listingId)}/actions`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await responseError(response));
      setSavedListings((current) => current.filter((listing) => listing.id !== listingId));
      setMessage('Listing removed from your saved items.');
    } catch (error) {
      console.error('Unable to remove the saved OPXE listing.', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to remove the saved listing.');
    }
  };

  if (loading) {
    return <main className="page-shell"><p className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">Loading your profile…</p></main>;
  }

  if (signedOut || !user) {
    return (
      <main className="page-shell">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-black text-white">Sign in to view your profile</h1>
          <p className="mt-2 text-slate-300">{errorMessage || 'Your profile and activity are available after you sign in.'}</p>
          {signedOut && <Link href={`/login?next=${encodeURIComponent('/profile')}`} className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Sign in</Link>}
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-2xl font-black text-slate-950">
              {user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div className="text-2xl font-black text-white">{user.name}</div>
              <div className="text-sm text-slate-400">{user.email} • {user.role} • {user.profileReviewed ? 'Profile reviewed' : 'Profile not reviewed'}</div>
            </div>
          </div>

          {editing ? (
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300">
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="block text-sm text-slate-300">
                City
                <input value={city} onChange={(event) => setCity(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="block text-sm text-slate-300">
                Email address (login email; cannot be changed here)
                <input type="email" readOnly value={user.email} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-400" />
              </label>
              <label className="block text-sm text-slate-300">
                Phone number
                <input type="tel" pattern="[0-9+\s\(\)\-]{8,20}" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" />
              </label>
              <label className="block text-sm text-slate-300">
                College / school
                <input value={college} onChange={(event) => setCollege(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Course / program
                  <input value={course} onChange={(event) => setCourse(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" />
                </label>
                <label className="block text-sm text-slate-300">
                  Class / year
                  <input value={classYear} onChange={(event) => setClassYear(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" />
                </label>
              </div>
              <div className="flex gap-3">
                <button type="button" disabled={saving} onClick={saveProfile} className="flex-1 rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>
                <button type="button" onClick={() => { setEditing(false); setName(user.name); setCity(user.city); setPhone(user.phone); setCollege(user.college); setCourse(user.course); setClassYear(user.classYear); setMessage(''); }} className="rounded-full border border-slate-700 px-5 py-3 text-white">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <div><span className="text-slate-500">City:</span> {user.city}</div>
                <div><span className="text-slate-500">Email:</span> {user.email} <span className="text-xs text-amber-300">({user.emailVerified ? 'verified' : 'not verified'})</span></div>
                <div><span className="text-slate-500">Phone:</span> {user.phone || 'Not provided'} <span className="text-xs text-amber-300">(not verified)</span></div>
                <div><span className="text-slate-500">College / school:</span> {user.college || 'Not provided'}</div>
                <div><span className="text-slate-500">Course / program:</span> {user.course || 'Not provided'}</div>
                <div><span className="text-slate-500">Class / year:</span> {user.classYear || 'Not provided'}</div>
                <div><span className="text-slate-500">Account role:</span> {user.role}</div>
                <div><span className="text-slate-500">Account status:</span> {user.accountStatus}</div>
                <div><span className="text-slate-500">Profile review:</span> {user.profileReviewed ? 'Reviewed' : 'Not reviewed'}</div>
                <div><span className="text-slate-500">Member since:</span> {new Date(user.createdAt).toLocaleString()}</div>
                <p className="pt-2 text-xs text-slate-500">Phone ownership is not verified. No phone OTP service is connected.</p>
              </div>
              <button type="button" onClick={() => setEditing(true)} className="mt-6 w-full rounded-full border border-cyan-400 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-300">
                Edit profile
              </button>
            </>
          )}
          {errorMessage && <p role="alert" className="mt-4 text-sm text-red-300">{errorMessage}</p>}
          {message && <p role="status" className="mt-4 text-sm text-cyan-200">{message}</p>}
        </div>

        <div className="space-y-8">
        <section id="saved-items" className="scroll-mt-28 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Saved items</h2>
              <p className="mt-1 text-sm text-slate-400">Listings you saved from their detail pages.</p>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">{savedListings.length}</span>
          </div>
          {savedListings.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {savedListings.map((listing) => (
                <article key={listing.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
                  {listing.images?.[0] && <ImagePreview src={listing.images[0]} alt={`${listing.title} saved listing photo`} width={480} height={320} thumbnailClassName="h-40 w-full object-cover" />}
                  <div className="p-4">
                    <div className="text-xs uppercase tracking-[0.15em] text-cyan-300">{listing.category} · {listing.type}</div>
                    <h3 className="mt-2 font-semibold text-white">{listing.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{listing.city} · {listing.price}</p>
                    <div className="mt-4 flex gap-2">
                      <Link href={`/listing/${encodeURIComponent(listing.id)}`} className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950">View listing</Link>
                      <button type="button" onClick={() => removeSavedListing(listing.id)} className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200">Remove saved</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              No saved items yet. Open a listing and press Save to keep it here.
            </p>
          )}
          <Link href="/marketplace" className="mt-5 inline-flex text-sm font-medium text-cyan-300">Browse marketplace →</Link>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="mb-5 text-xl font-bold text-white">Your listings and requests</h2>
          <div className="space-y-3">
            {activity.length ? activity.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-400/50">
                <div className="font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-sm text-slate-400">{item.value}</div>
              </Link>
            )) : <p className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">No listing or request activity yet.</p>}
          </div>
          <div className="mt-4 text-xs text-slate-500">{ownListings.length} listings posted by this account</div>
          <Link href="/post" className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Post a listing</Link>
        </section>
        </div>
      </div>
    </main>
  );
}
