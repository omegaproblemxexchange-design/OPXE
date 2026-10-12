/*
  OPXE notifications note:
  - Purpose: Notification center for marketplace alerts, updates, and account actions.
  - Key behavior: displays item updates and supports a mark-all-read interaction for a cleaner user experience.
  - Change log: added as a lightweight real-time-style update feed for the app.
*/

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getCurrentUser, type AppUser } from '@/lib/appStore';
import { getNotifications, saveNotifications, type AppNotification } from '@/lib/notifications';

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setUser(getCurrentUser());
    try {
      setItems(getNotifications());
    } catch (error) {
      console.error('Unable to load saved notifications.', error);
      setErrorMessage('Notifications could not be loaded. Please refresh or contact support.');
    }
  }, []);

  const visibleItems = useMemo(() => {
    if (!user) return [];
    return items.filter((item) => !item.recipientEmail || item.recipientEmail.toLowerCase() === user.email.toLowerCase());
  }, [items, user]);

  const markAllRead = () => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    const updated = items.map((item) => visibleIds.has(item.id) ? { ...item, unread: false } : item);
    try {
      saveNotifications(updated);
      setItems(updated);
      setErrorMessage('');
    } catch (error) {
      console.error('Unable to update notification read state.', error);
      setErrorMessage('Notifications could not be marked as read. Please try again.');
    }
  };

  if (!user) {
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

  return (
    <main className="page-shell">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Notifications</div>
          <h1 className="mt-2 text-3xl font-black text-white">Your updates</h1>
        </div>
        <button type="button" onClick={markAllRead} disabled={!visibleItems.some((item) => item.unread)} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Mark all read</button>
      </div>

      {errorMessage && <div role="alert" className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>}
      <div className="space-y-4">
        {visibleItems.map((item) => (
          <div key={item.id} className={`rounded-3xl border p-5 ${item.unread ? 'border-cyan-400/40 bg-cyan-500/5' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-white">{item.title}</div>
                <div className="mt-2 text-sm text-slate-300">{item.detail}</div>
                {item.recipientEmail && <div className="mt-2 text-xs font-medium text-cyan-300">Private notification from {item.senderLabel ?? 'OPXE Head'}</div>}
              </div>
              <div className="text-xs text-slate-400">{item.time}</div>
            </div>
          </div>
        ))}
        {!errorMessage && visibleItems.length === 0 && <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">No notifications yet.</p>}
      </div>
    </main>
  );
}
