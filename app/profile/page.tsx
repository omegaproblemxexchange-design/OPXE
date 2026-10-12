/*
  OPXE profile note:
  - Purpose: View and edit the signed-in user's browser-local profile.
  - Key behavior: persists profile changes to the browser store and session.
*/

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ImagePreview from '@/components/ImagePreview';
import { getAppStore, getCurrentUser, getRoleLabel, listingBelongsToUser, saveAppStore, setCurrentUser, toggleSavedListing, type AppListing, type AppUser } from '@/lib/appStore';

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [classYear, setClassYear] = useState('');
  const [message, setMessage] = useState('');
  const [savedListings, setSavedListings] = useState<AppListing[]>([]);
  const [ownListings, setOwnListings] = useState<AppListing[]>([]);
  const [activity, setActivity] = useState<Array<{ id: string; title: string; value: string; href: string }>>([]);

  const loadActivity = (currentUser: AppUser) => {
    const store = getAppStore();
    const own = store.listings.filter((item) => listingBelongsToUser(item, currentUser));
    const savedIds = store.savedListingIdsByUser[currentUser.email.toLowerCase()]
      ?? Object.entries(store.savedListingIdsByUser).find(([email]) => email.toLowerCase() === currentUser.email.toLowerCase())?.[1]
      ?? [];
    const saved = savedIds
      .map((id) => store.listings.find((item) => item.id === id))
      .filter((item): item is AppListing => Boolean(item));
    const requests = store.requests
      .filter((item) => item.requesterEmail.toLowerCase() === currentUser.email.toLowerCase())
      .map((item) => ({ id: item.id, title: item.listingTitle, value: `Request • ${item.status}`, href: '/dashboard' }));

    setOwnListings(own);
    setSavedListings(saved);
    setActivity([
      ...own.map((item) => ({ id: item.id, title: item.title, value: `Listing • ${item.status}`, href: `/listing/${encodeURIComponent(item.id)}` })),
      ...requests,
    ].slice(0, 8));
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setName(currentUser?.name ?? '');
    setCity(currentUser?.city ?? '');
    setPhone(currentUser?.phone ?? '');
    setCollege(currentUser?.college ?? '');
    setCourse(currentUser?.course ?? '');
    setClassYear(currentUser?.classYear ?? '');
    if (currentUser) loadActivity(currentUser);
  }, []);

  const saveProfile = () => {
    if (!user) return;
    if (!name.trim() || !city.trim() || !phone.trim() || !college.trim() || !course.trim() || !classYear.trim()) {
      setMessage('Please complete your name, city, phone, college, course, and class/year.');
      return;
    }
    const updatedUser = {
      ...user,
      name: name.trim(),
      city: city.trim(),
      phone: phone.trim(),
      college: college.trim(),
      course: course.trim(),
      classYear: classYear.trim(),
    };
    const store = getAppStore();
    saveAppStore({
      ...store,
      users: store.users.map((item) => item.email === user.email ? updatedUser : item),
      listings: store.listings.map((item) => listingBelongsToUser(item, user) ? { ...item, seller: updatedUser.name } : item),
    });
    setCurrentUser(updatedUser);
    setUser(updatedUser);
    loadActivity(updatedUser);
    setEditing(false);
    setMessage('Profile saved on this device.');
  };

  const removeSavedListing = (listingId: string) => {
    const result = toggleSavedListing(listingId);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    if (user) loadActivity(user);
    setMessage('Listing removed from your saved items.');
  };

  if (!user) {
    return (
      <main className="page-shell">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <h1 className="text-2xl font-black text-white">Sign in to view your profile</h1>
          <p className="mt-2 text-slate-300">Your profile and activity are saved in this browser only.</p>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Sign in</Link>
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
              <div className="text-sm text-slate-400">{user.email} • {getRoleLabel(user.role)} • {user.verified ? 'Profile reviewed' : 'Profile not reviewed'}</div>
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
                <button type="button" onClick={saveProfile} className="flex-1 rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Save profile</button>
                <button type="button" onClick={() => { setEditing(false); setName(user.name); setCity(user.city); setPhone(user.phone); setCollege(user.college); setCourse(user.course); setClassYear(user.classYear); setMessage(''); }} className="rounded-full border border-slate-700 px-5 py-3 text-white">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <div><span className="text-slate-500">City:</span> {user.city}</div>
                <div><span className="text-slate-500">Email:</span> {user.email} <span className="text-xs text-amber-300">({user.emailVerified ? 'verified' : 'not OTP-verified'})</span></div>
                <div><span className="text-slate-500">Phone:</span> {user.phone || 'Not provided'} <span className="text-xs text-amber-300">({user.phoneVerified ? 'verified' : 'not OTP-verified'})</span></div>
                <div><span className="text-slate-500">College / school:</span> {user.college || 'Not provided'}</div>
                <div><span className="text-slate-500">Course / program:</span> {user.course || 'Not provided'}</div>
                <div><span className="text-slate-500">Class / year:</span> {user.classYear || 'Not provided'}</div>
                <div><span className="text-slate-500">Account role:</span> {getRoleLabel(user.role)}</div>
                <div><span className="text-slate-500">Account status:</span> {user.accountStatus ?? 'active'}</div>
                <div><span className="text-slate-500">Profile review:</span> {user.verified ? 'Reviewed' : 'Not reviewed'}</div>
                <div><span className="text-slate-500">Member since:</span> {new Date(user.createdAt).toLocaleString()}</div>
                <p className="pt-2 text-xs text-slate-500">Email and phone ownership are not verified. An OTP service is not connected.</p>
              </div>
              <button type="button" onClick={() => setEditing(true)} className="mt-6 w-full rounded-full border border-cyan-400 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-300">
                Edit profile
              </button>
            </>
          )}
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
