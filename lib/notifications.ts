/*
  OPXE notification storage note:
  - Purpose: Shared browser-local notification records for the notification center and Head messages.
  - Key behavior: Supports public demo updates and email-targeted messages, preserving recipient privacy in the UI.
  - Limitation: Browser storage is not a server-side delivery system and is not shared between devices.
*/

export type AppNotification = {
  id: string | number;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
  recipientEmail?: string;
  senderLabel?: string;
  createdAt?: string;
};

export const NOTIFICATIONS_KEY = 'opxe_notifications_v1';

export function getNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  const stored = window.localStorage.getItem(NOTIFICATIONS_KEY);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || parsed.some((item) => (
    !item
    || (typeof item.id !== 'string' && typeof item.id !== 'number')
    || typeof item.title !== 'string'
    || typeof item.detail !== 'string'
    || typeof item.time !== 'string'
    || typeof item.unread !== 'boolean'
    || (item.recipientEmail !== undefined && typeof item.recipientEmail !== 'string')
    || (item.senderLabel !== undefined && typeof item.senderLabel !== 'string')
  ))) {
    throw new Error('Saved notifications have an invalid format.');
  }
  const notifications = parsed.filter((item) => typeof item.id !== 'number') as AppNotification[];
  if (notifications.length !== parsed.length) {
    saveNotifications(notifications);
  }
  return notifications;
}

export function saveNotifications(notifications: AppNotification[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function addRecipientNotification({
  recipientEmail,
  senderLabel,
  title,
  detail,
}: {
  recipientEmail: string;
  senderLabel: string;
  title: string;
  detail: string;
}) {
  const normalizedEmail = recipientEmail.trim().toLowerCase();
  if (!normalizedEmail || !senderLabel.trim() || !title.trim() || !detail.trim()) {
    throw new Error('A notification recipient, sender, title, and message are required.');
  }

  const notification: AppNotification = {
    id: crypto.randomUUID(),
    title: title.trim(),
    detail: detail.trim(),
    time: new Date().toLocaleString(),
    unread: true,
    recipientEmail: normalizedEmail,
    senderLabel: senderLabel.trim(),
    createdAt: new Date().toISOString(),
  };
  saveNotifications([notification, ...getNotifications()]);
}
