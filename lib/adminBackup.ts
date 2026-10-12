import { getAppStore, getCurrentUser, saveAppStore, type AppStore, type AppUser } from '@/lib/appStore';
import { NOTIFICATIONS_KEY, saveNotifications, type AppNotification } from '@/lib/notifications';

const BACKUP_FORMAT = 'opxe-browser-backup';
const BACKUP_VERSION = 1;

type BackupStore = Omit<AppStore, 'users'> & {
  users: Array<Omit<AppUser, 'password'>>;
};

type AppBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  store: BackupStore;
  notifications: AppNotification[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringFields(value: unknown, fields: string[]): value is Record<string, unknown> {
  return isRecord(value) && fields.every((field) => typeof value[field] === 'string');
}

function isUser(value: unknown): value is Omit<AppUser, 'password'> {
  return hasStringFields(value, [
    'id', 'name', 'email', 'city', 'phone', 'college', 'course', 'classYear', 'createdAt',
  ])
    && ['admin', 'user', 'premium'].includes(String(value.role))
    && (value.accountStatus === undefined || ['active', 'blocked', 'banned'].includes(String(value.accountStatus)))
    && typeof value.verified === 'boolean'
    && typeof value.emailVerified === 'boolean'
    && typeof value.phoneVerified === 'boolean';
}

function isListing(value: unknown) {
  return hasStringFields(value, [
    'id', 'title', 'type', 'city', 'price', 'description', 'condition',
    'availability', 'category', 'seller', 'createdAt', 'distance',
  ])
    && ['Approved', 'Pending', 'Rejected', 'Active'].includes(String(value.status))
    && (value.ownerId === undefined || typeof value.ownerId === 'string')
    && (value.images === undefined || (Array.isArray(value.images) && value.images.every((image) => typeof image === 'string')));
}

function isDigitalProduct(value: unknown) {
  return hasStringFields(value, ['id', 'title', 'description', 'category', 'createdAt', 'createdBy'])
    && typeof value.priceINR === 'number'
    && (value.image === undefined || typeof value.image === 'string');
}

function isPayment(value: unknown) {
  return hasStringFields(value, ['id', 'buyer', 'seller', 'type'])
    && typeof value.amount === 'number'
    && ['Cleared', 'Pending', 'Disputed'].includes(String(value.status));
}

function isDispute(value: unknown) {
  return hasStringFields(value, ['id', 'user', 'reason'])
    && ['High', 'Medium', 'Low'].includes(String(value.severity))
    && ['Open', 'Resolved'].includes(String(value.status));
}

function isRequest(value: unknown) {
  return hasStringFields(value, ['id', 'listingId', 'listingTitle', 'requester', 'requesterEmail', 'createdAt'])
    && ['Pending', 'Accepted', 'Declined'].includes(String(value.status));
}

function isDeliveryRequest(value: unknown) {
  return hasStringFields(value, [
    'id', 'userEmail', 'product', 'pickupAddress', 'deliveryAddress', 'preferredPartner', 'status', 'createdAt',
  ])
    && typeof value.distanceKm === 'number'
    && typeof value.estimatedFee === 'number';
}

function isNotification(value: unknown): value is AppNotification {
  return isRecord(value)
    && (typeof value.id === 'string' || typeof value.id === 'number')
    && typeof value.title === 'string'
    && typeof value.detail === 'string'
    && typeof value.time === 'string'
    && typeof value.unread === 'boolean'
    && (value.recipientEmail === undefined || typeof value.recipientEmail === 'string')
    && (value.senderLabel === undefined || typeof value.senderLabel === 'string')
    && (value.createdAt === undefined || typeof value.createdAt === 'string');
}

function isBackupStore(value: unknown): value is BackupStore {
  if (
    !isRecord(value)
    || !Array.isArray(value.users)
    || !Array.isArray(value.listings)
    || !Array.isArray(value.digitalProducts)
    || !Array.isArray(value.payments)
    || !Array.isArray(value.disputes)
    || !Array.isArray(value.requests)
    || !Array.isArray(value.deliveryRequests)
    || !Array.isArray(value.savedListingIds)
    || !isRecord(value.savedListingIdsByUser)
  ) return false;

  return value.users.every(isUser)
    && new Set(value.users.map((user) => user.email.toLowerCase())).size === value.users.length
    && new Set(value.users.map((user) => user.id)).size === value.users.length
    && value.listings.every(isListing)
    && new Set(value.listings.map((listing) => listing.id)).size === value.listings.length
    && value.digitalProducts.every(isDigitalProduct)
    && new Set(value.digitalProducts.map((product) => product.id)).size === value.digitalProducts.length
    && value.payments.every(isPayment)
    && new Set(value.payments.map((payment) => payment.id)).size === value.payments.length
    && value.disputes.every(isDispute)
    && new Set(value.disputes.map((dispute) => dispute.id)).size === value.disputes.length
    && value.requests.every(isRequest)
    && new Set(value.requests.map((request) => request.id)).size === value.requests.length
    && value.deliveryRequests.every(isDeliveryRequest)
    && new Set(value.deliveryRequests.map((request) => request.id)).size === value.deliveryRequests.length
    && value.savedListingIds.every((id) => typeof id === 'string')
    && Object.values(value.savedListingIdsByUser).every((ids) => Array.isArray(ids) && ids.every((id) => typeof id === 'string'));
}

export function createAppBackup(store: AppStore, notifications: AppNotification[]): string {
  const users = store.users.map((user) => {
    const copy = { ...user };
    delete (copy as Partial<AppUser>).password;
    return copy;
  });
  const backup: AppBackup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    store: { ...store, users },
    notifications,
  };
  return JSON.stringify(backup, null, 2);
}

export function parseAppBackup(contents: string): { store: BackupStore; notifications: AppNotification[] } {
  let backup: unknown;
  try {
    backup = JSON.parse(contents) as unknown;
  } catch (error) {
    console.error('Unable to parse the selected OPXE backup file.', error);
    throw new Error('This file is not valid JSON.');
  }

  if (!isRecord(backup) || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
    throw new Error('This is not a supported OPXE backup file.');
  }

  if (
    !isBackupStore(backup.store)
    || !Array.isArray(backup.notifications)
    || !backup.notifications.every(isNotification)
  ) {
    throw new Error('The backup contains invalid or incomplete records and was not imported.');
  }

  return {
    store: backup.store,
    notifications: backup.notifications,
  };
}

export function restoreAppBackup(contents: string) {
  const parsedBackup = parseAppBackup(contents);
  const currentUser = getCurrentUser();
  if (currentUser?.role !== 'admin') {
    throw new Error('Only the signed-in Head can restore an OPXE backup.');
  }

  const ownerAccount = parsedBackup.store.users.find((user) => (
    user.id === currentUser.id && user.email.toLowerCase() === currentUser.email.toLowerCase()
  ));
  if (!ownerAccount || ownerAccount.role !== 'admin' || (ownerAccount.accountStatus ?? 'active') !== 'active') {
    throw new Error('The backup must contain the active, currently signed-in Head account.');
  }

  const currentStore = getAppStore();
  const restoredStore: AppStore = {
    ...parsedBackup.store,
    users: parsedBackup.store.users.map((user) => {
      const existingUser = currentStore.users.find(
        (candidate) => candidate.id === user.id && candidate.email.toLowerCase() === user.email.toLowerCase(),
      );
      return { ...user, password: existingUser?.password ?? '' };
    }),
  };

  const previousStore = window.localStorage.getItem('opxe_store_v1');
  const previousNotifications = window.localStorage.getItem(NOTIFICATIONS_KEY);
  try {
    saveAppStore(restoredStore);
    saveNotifications(parsedBackup.notifications);
  } catch (error) {
    try {
      if (previousStore === null) window.localStorage.removeItem('opxe_store_v1');
      else window.localStorage.setItem('opxe_store_v1', previousStore);
      if (previousNotifications === null) window.localStorage.removeItem(NOTIFICATIONS_KEY);
      else window.localStorage.setItem(NOTIFICATIONS_KEY, previousNotifications);
    } catch (rollbackError) {
      console.error('Unable to roll back browser data after a failed backup restore.', rollbackError);
    }
    throw error;
  }

  return {
    users: restoredStore.users.length,
    listings: restoredStore.listings.length,
    digitalProducts: restoredStore.digitalProducts.length,
    notifications: parsedBackup.notifications.length,
  };
}
