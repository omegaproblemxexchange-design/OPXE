'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Notification = {
  id: string;
  title: string;
  detail: string;
  notification_type: string;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
};

async function responseError(response: Response) {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error || 'Unable to update notifications.';
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotifications = async (signal?: AbortSignal) => {
    const response = await fetch('/api/notifications', { cache: 'no-store', signal });
    if (response.status === 401) {
      setSignedOut(true);
      setItems([]);
      return;
    }
    if (!response.ok) throw new Error(await responseError(response));
    const result = await response.json() as { notifications: Notification[] };
    setItems(result.notifications);
    setSignedOut(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    loadNotifications(controller.signal)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Unable to load OPXE notifications.', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load notifications.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const markRead = async (id?: string) => {
    setBusy(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { markAll: true }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      await loadNotifications();
    } catch (error) {
      console.error('Unable to update OPXE notification state.', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update notifications.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <main className="page-shell"><p className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-300">Loading your notifications…</p></main>;
  }

  if (signedOut) {
    return (
      <main className="page-shell">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Notifications</div>
          <h1 className="mt-2 text-3xl font-black text-white">Sign in to view your updates</h1>
          <p className="mt-3 text-slate-300">Private account messages are available only to the signed-in account.</p>
          <Link href={`/login?next=${encodeURIComponent('/notifications')}`} className="mt-6 inline-flex rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">Go to login</Link>
        </div>
      </main>
    );
  }

  const unreadCount = items.filter((item) => !item.read_at).length;
  return (
    <main className="page-shell">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Notifications</div>
          <h1 className="mt-2 text-3xl font-black text-white">Your updates</h1>
        </div>
        <button type="button" onClick={() => markRead()} disabled={busy || unreadCount === 0} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Mark all read</button>
      </div>
      {errorMessage && <div role="alert" className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>}
      <div className="space-y-4">
        {items.map((item) => (
          <article key={item.id} className={`rounded-3xl border p-5 ${!item.read_at ? 'border-cyan-400/40 bg-cyan-500/5' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-white">{item.title}</div>
                <div className="mt-2 text-sm text-slate-300">{item.detail}</div>
              </div>
              <time className="shrink-0 text-xs text-slate-400" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
            </div>
            {!item.read_at && <button type="button" disabled={busy} onClick={() => markRead(item.id)} className="mt-4 text-xs font-semibold text-cyan-300 hover:underline disabled:opacity-50">Mark as read</button>}
          </article>
        ))}
        {items.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">No notifications yet.</p>}
      </div>
    </main>
  );
}
