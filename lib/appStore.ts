/*
  OPXE app store note:
  - Purpose: Local browser data layer for users, listings, requests, saved items, payments, and disputes.
  - Key behavior: manages empty initial collections, localStorage persistence, browser-local sign-in, user review flags, and marketplace workflows.
  - Change log: supports the interactive frontend without a shared backend and is used by login, marketplace, post-listing, and Head-console pages.
*/

export type UserRole = 'admin' | 'user' | 'premium';
export type AccountStatus = 'active' | 'blocked' | 'banned';

export function getRoleLabel(role: UserRole) {
  return role === 'admin' ? 'Head' : role;
}
export type ListingStatus = 'Approved' | 'Pending' | 'Rejected' | 'Active';
export type PaymentStatus = 'Cleared' | 'Pending' | 'Disputed';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  city: string;
  phone: string;
  college: string;
  course: string;
  classYear: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  verified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
};

export type AppListing = {
  id: string;
  ownerId?: string;
  title: string;
  type: string;
  city: string;
  price: string;
  description: string;
  condition: string;
  availability: string;
  category: string;
  images?: string[];
  seller: string;
  status: ListingStatus;
  reviewMethod?: 'admin';
  reviewStartedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  distance: string;
};

export type AppDigitalProduct = {
  id: string;
  title: string;
  description: string;
  category: string;
  image?: string;
  priceINR: number;
  createdAt: string;
  createdBy: string;
};

export type AppPayment = {
  id: string;
  buyer: string;
  seller: string;
  amount: number;
  type: string;
  status: PaymentStatus;
};

export type AppDispute = {
  id: string;
  user: string;
  reason: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Resolved';
};

export type AppRequest = {
  id: string;
  listingId: string;
  listingTitle: string;
  requester: string;
  requesterEmail: string;
  createdAt: string;
  status: 'Pending' | 'Accepted' | 'Declined';
};

export type AppDeliveryRequest = {
  id: string;
  userEmail: string;
  product: string;
  pickupAddress: string;
  deliveryAddress: string;
  distanceKm: number;
  preferredPartner: string;
  estimatedFee: number;
  status: 'Request saved - courier not booked';
  createdAt: string;
};

export type AppStore = {
  users: AppUser[];
  listings: AppListing[];
  digitalProducts: AppDigitalProduct[];
  payments: AppPayment[];
  disputes: AppDispute[];
  requests: AppRequest[];
  deliveryRequests: AppDeliveryRequest[];
  savedListingIds: string[];
  savedListingIdsByUser: Record<string, string[]>;
};

const STORAGE_KEY = 'opxe_store_v1';
const SESSION_KEY = 'opxe_session';

const defaultUsers: AppUser[] = [];

const starterListingIds = new Set([
  'desk-lamp',
  'study-table',
  'campus-bicycle',
  'gaming-laptop',
  'water-purifier',
  'dslr-camera',
  'college-books',
  'furniture-set',
]);
const starterPaymentIds = new Set(['OPXE-2041', 'OPXE-2042', 'OPXE-2043', 'OPXE-2044']);
const starterDisputeIds = new Set(['DSP-12', 'DSP-21', 'DSP-32']);

export function buildDefaultStore(): AppStore {
  return {
    users: defaultUsers,
    listings: [],
    digitalProducts: [],
    payments: [],
    disputes: [],
    requests: [],
    deliveryRequests: [],
    savedListingIds: [],
    savedListingIdsByUser: {},
  };
}

export function getAppStore(): AppStore {
  if (typeof window === 'undefined') {
    return buildDefaultStore();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const fresh = buildDefaultStore();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw) as AppStore;
    let legacySavedListingIdsByUser: Record<string, string[]> = {};
    if (!parsed.savedListingIdsByUser && parsed.savedListingIds?.length) {
      try {
        const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? 'null') as { email?: unknown } | null;
        if (typeof session?.email === 'string') {
          legacySavedListingIdsByUser[session.email.toLowerCase()] = parsed.savedListingIds;
        }
      } catch (error) {
        console.error('Unable to migrate saved listings for the active account.', error);
      }
    }
    const existingListings = parsed.listings ?? [];
    const listings = existingListings.filter((listing) => !starterListingIds.has(listing.id));
    const seedUsers = new Set(['admin-01', 'admin@opxe.in', 'user-01', 'aarav@opxe.in']);
    const store: AppStore = {
      users: (parsed.users ?? defaultUsers).filter((user) => !seedUsers.has(user.id.toLowerCase()) && !seedUsers.has(user.email.toLowerCase())).map((user) => {
        return {
          ...user,
          accountStatus: user.accountStatus === 'blocked' || user.accountStatus === 'banned' ? user.accountStatus : 'active',
          verified: user.verified ?? user.role === 'admin',
          phone: user.phone ?? '',
          college: user.college ?? '',
          course: user.course ?? '',
          classYear: user.classYear ?? '',
          emailVerified: user.emailVerified ?? false,
          phoneVerified: user.phoneVerified ?? false,
        };
      }),
      listings,
      digitalProducts: parsed.digitalProducts ?? [],
      payments: (parsed.payments ?? []).filter((payment) => !starterPaymentIds.has(payment.id)),
      disputes: (parsed.disputes ?? []).filter((dispute) => !starterDisputeIds.has(dispute.id)),
      requests: (parsed.requests ?? []).filter((request) => !starterListingIds.has(request.listingId)),
      deliveryRequests: (parsed.deliveryRequests ?? []).map((request) => ({
        ...request,
        status: 'Request saved - courier not booked',
      })),
      savedListingIds: (parsed.savedListingIdsByUser ? parsed.savedListingIds ?? [] : []).filter((id) => !starterListingIds.has(id)),
      savedListingIdsByUser: Object.fromEntries(
        Object.entries(parsed.savedListingIdsByUser ?? legacySavedListingIdsByUser)
          .map(([email, ids]) => [email, ids.filter((id) => !starterListingIds.has(id))]),
      ),
    };
    const removedStarterData = listings.length !== existingListings.length
      || store.payments.length !== (parsed.payments ?? []).length
      || store.disputes.length !== (parsed.disputes ?? []).length
      || store.requests.length !== (parsed.requests ?? []).length;
    const savedListingsChanged = JSON.stringify(store.savedListingIds) !== JSON.stringify(parsed.savedListingIds ?? [])
      || JSON.stringify(store.savedListingIdsByUser) !== JSON.stringify(parsed.savedListingIdsByUser ?? {});
    const deliveryRequestsChanged = JSON.stringify(store.deliveryRequests) !== JSON.stringify(parsed.deliveryRequests ?? []);
    const removedSeedUser = store.users.length !== (parsed.users ?? defaultUsers).length;
    if (removedStarterData || savedListingsChanged || deliveryRequestsChanged || removedSeedUser) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? 'null') as { email?: unknown } | null;
        if (typeof session?.email === 'string' && seedUsers.has(session.email.toLowerCase())) {
          window.localStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        console.error('Unable to clean starter content from browser storage.', error);
      }
    }
    return store;
  } catch {
    const fresh = buildDefaultStore();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

export function saveAppStore(store: AppStore) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AppUser | null;
    if (!session) return null;
    const savedUser = getAppStore().users.find((user) => user.email.toLowerCase() === session.email?.toLowerCase());
    if (!savedUser || savedUser.accountStatus === 'blocked' || savedUser.accountStatus === 'banned') return null;
    const user = savedUser;
    return {
      ...user,
      phone: user.phone ?? '',
      college: user.college ?? '',
      course: user.course ?? '',
      classYear: user.classYear ?? '',
      verified: user.verified ?? false,
      emailVerified: user.emailVerified ?? false,
      phoneVerified: user.phoneVerified ?? false,
    };
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AppUser | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function registerUser({
  name,
  email,
  password,
  city,
  phone,
  college,
  course,
  classYear,
}: {
  name: string;
  email: string;
  password: string;
  city: string;
  phone: string;
  college: string;
  course: string;
  classYear: string;
}) {
  const store = getAppStore();
  const existing = store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return { ok: false, error: 'Email already registered' };
  }

  const user: AppUser = {
    id: `user-${Date.now()}`,
    name,
    email: email.toLowerCase(),
    password,
    city,
    phone,
    college,
    course,
    classYear,
    role: 'user',
    accountStatus: 'active',
    verified: false,
    emailVerified: false,
    phoneVerified: false,
    createdAt: new Date().toISOString(),
  };

  const nextStore = { ...store, users: [...store.users, user] };
  saveAppStore(nextStore);
  setCurrentUser(user);
  return { ok: true, user };
}

export function loginUser(email: string, password: string) {
  const store = getAppStore();
  const match = store.users.find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password,
  );

  if (!match) {
    return { ok: false, error: 'Invalid email or password' };
  }
  if (match.accountStatus === 'blocked') {
    return { ok: false, error: 'This account is blocked. Contact OPXE support for help.' };
  }
  if (match.accountStatus === 'banned') {
    return { ok: false, error: 'This account is banned and cannot sign in.' };
  }

  setCurrentUser(match);
  return { ok: true, user: match };
}

export function changeCurrentUserPassword(currentPassword: string, newPassword: string) {
  const currentUser = getCurrentUser();
  if (!currentUser) return { ok: false as const, error: 'Sign in again before changing your password.' };
  if (currentUser.password !== currentPassword) return { ok: false as const, error: 'Current password is incorrect.' };
  if (newPassword.length < 8) return { ok: false as const, error: 'Use a password with at least 8 characters.' };

  const store = getAppStore();
  const updatedUser = { ...currentUser, password: newPassword };
  saveAppStore({
    ...store,
    users: store.users.map((user) => user.id === currentUser.id ? updatedUser : user),
  });
  setCurrentUser(updatedUser);
  return { ok: true as const };
}

export function resetUserPasswordByHead(email: string, newPassword: string) {
  const head = getCurrentUser();
  if (head?.role !== 'admin') return { ok: false as const, error: 'Only the Head can reset another account password.' };
  if (email.toLowerCase() === head.email.toLowerCase()) {
    return { ok: false as const, error: 'Use the current-password form to change your own Head password.' };
  }
  if (newPassword.length < 8) return { ok: false as const, error: 'Use a password with at least 8 characters.' };

  const store = getAppStore();
  const target = store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (!target) return { ok: false as const, error: 'This account no longer exists. Refresh the Head panel.' };
  if (target.id === 'admin-01' || target.email.toLowerCase() === 'admin@opxe.in') {
    return { ok: false as const, error: 'Change the owner Head password using the current-password form.' };
  }

  saveAppStore({
    ...store,
    users: store.users.map((user) => user.id === target.id ? { ...user, password: newPassword } : user),
  });
  return { ok: true as const, user: target };
}

export function addListing(listing: Omit<AppListing, 'id' | 'createdAt' | 'seller' | 'ownerId' | 'status' | 'reviewMethod' | 'reviewStartedAt' | 'reviewedAt'>) {
  const user = getCurrentUser();
  if (!user) return { ok: false as const, error: 'Sign in to publish a listing.' };
  if (!listing.category.trim()) return { ok: false as const, error: 'Choose a category before publishing.' };
  if (!Array.isArray(listing.images) || listing.images.length < 3 || listing.images.length > 5) {
    return { ok: false as const, error: 'Add between 3 and 5 item photos before publishing.' };
  }

  const store = getAppStore();
  const newListing: AppListing = {
    ...listing,
    id: `listing-${Date.now()}`,
    ownerId: user.id,
    seller: user.name,
    createdAt: new Date().toISOString(),
    status: 'Pending',
  };

  const nextStore = { ...store, listings: [newListing, ...store.listings] };
  try {
    saveAppStore(nextStore);
  } catch (error) {
    console.error('Unable to save the new listing to browser storage.', error);
    return { ok: false as const, error: 'The listing could not be saved in this browser. Try fewer or smaller photos.' };
  }
  return { ok: true as const, listing: newListing };
}

export function addDigitalProduct(product: Omit<AppDigitalProduct, 'id' | 'createdAt' | 'createdBy'>) {
  const user = getCurrentUser();
  if (user?.role !== 'admin') return { ok: false as const, error: 'Only the OPXE Head can add digital products.' };
  if (!product.title.trim() || !product.description.trim() || !product.category.trim()) {
    return { ok: false as const, error: 'Enter a product title, description, and category.' };
  }
  if (!product.image?.startsWith('data:image/jpeg;base64,')) {
    return { ok: false as const, error: 'Add a product photo before publishing.' };
  }
  if (!Number.isFinite(product.priceINR) || product.priceINR <= 0) {
    return { ok: false as const, error: 'Enter a valid price greater than zero.' };
  }

  const store = getAppStore();
  const newProduct: AppDigitalProduct = {
    ...product,
    id: `digital-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: product.title.trim(),
    description: product.description.trim(),
    category: product.category.trim(),
    createdAt: new Date().toISOString(),
    createdBy: user.id,
  };

  try {
    saveAppStore({ ...store, digitalProducts: [newProduct, ...store.digitalProducts] });
  } catch (error) {
    console.error('Unable to save the digital product in browser storage.', error);
    return { ok: false as const, error: 'The product could not be saved. Please try again.' };
  }
  return { ok: true as const, product: newProduct };
}

export function removeDigitalProduct(id: string) {
  const user = getCurrentUser();
  if (user?.role !== 'admin') return { ok: false as const, error: 'Only the OPXE Head can remove digital products.' };

  const store = getAppStore();
  if (!store.digitalProducts.some((product) => product.id === id)) {
    return { ok: false as const, error: 'This digital product no longer exists. Refresh the page.' };
  }
  try {
    saveAppStore({ ...store, digitalProducts: store.digitalProducts.filter((product) => product.id !== id) });
  } catch (error) {
    console.error('Unable to remove the digital product from browser storage.', error);
    return { ok: false as const, error: 'The product could not be removed. Please try again.' };
  }
  return { ok: true as const };
}

export function getListingById(id: string) {
  const store = getAppStore();
  return store.listings.find((listing) => listing.id === id) ?? null;
}

export function deleteListing(id: string) {
  const user = getCurrentUser();
  if (user?.role !== 'admin') return { ok: false as const, error: 'Only the OPXE Head can delete listings.' };
  const store = getAppStore();
  const listing = store.listings.find((item) => item.id === id);
  if (!listing) return { ok: false as const, error: 'This listing no longer exists. Refresh the Head panel.' };

  const nextStore: AppStore = {
    ...store,
    listings: store.listings.filter((item) => item.id !== id),
    requests: store.requests.filter((request) => request.listingId !== id),
    disputes: store.disputes.filter((dispute) => !dispute.reason.includes(id)),
    savedListingIds: store.savedListingIds.filter((listingId) => listingId !== id),
    savedListingIdsByUser: Object.fromEntries(
      Object.entries(store.savedListingIdsByUser)
        .map(([email, listingIds]) => [email, listingIds.filter((listingId) => listingId !== id)]),
    ),
  };
  try {
    saveAppStore(nextStore);
  } catch (error) {
    console.error(`Unable to delete listing ${id} from browser storage.`, error);
    return { ok: false as const, error: 'The listing could not be deleted from this browser. Please try again.' };
  }
  return { ok: true as const, listing };
}

export function deletePayment(id: string) {
  if (getCurrentUser()?.role !== 'admin') return { ok: false as const, error: 'Only the OPXE Head can delete payment records.' };
  const store = getAppStore();
  const payment = store.payments.find((item) => item.id === id);
  if (!payment) return { ok: false as const, error: 'This payment record no longer exists. Refresh the Head panel.' };
  try {
    saveAppStore({ ...store, payments: store.payments.filter((item) => item.id !== id) });
  } catch (error) {
    console.error(`Unable to delete payment record ${id} from browser storage.`, error);
    return { ok: false as const, error: 'The payment record could not be deleted. Please try again.' };
  }
  return { ok: true as const, payment };
}

export function deleteDispute(id: string) {
  if (getCurrentUser()?.role !== 'admin') return { ok: false as const, error: 'Only the OPXE Head can delete disputes.' };
  const store = getAppStore();
  const dispute = store.disputes.find((item) => item.id === id);
  if (!dispute) return { ok: false as const, error: 'This dispute no longer exists. Refresh the Head panel.' };
  try {
    saveAppStore({ ...store, disputes: store.disputes.filter((item) => item.id !== id) });
  } catch (error) {
    console.error(`Unable to delete dispute ${id} from browser storage.`, error);
    return { ok: false as const, error: 'The dispute could not be deleted. Please try again.' };
  }
  return { ok: true as const, dispute };
}

export function listingBelongsToUser(listing: AppListing, user: AppUser) {
  return listing.ownerId
    ? listing.ownerId === user.id
    : listing.seller.toLowerCase() === user.name.toLowerCase();
}

export function deleteDemoAccount(email: string) {
  const store = getAppStore();
  const normalizedEmail = email.trim().toLowerCase();
  const target = store.users.find((user) => user.email.toLowerCase() === normalizedEmail);
  if (!target) return { ok: false as const, error: 'This account no longer exists. Refresh the Head panel.' };
  if (target.id === 'admin-01' || normalizedEmail === 'admin@opxe.in') {
    return { ok: false as const, error: 'The seeded owner Head account is protected.' };
  }
  if (getCurrentUser()?.id === target.id) {
    return { ok: false as const, error: 'You cannot permanently delete the Head account currently in use.' };
  }

  const sameNameAccounts = store.users.filter((user) => user.name.trim().toLowerCase() === target.name.trim().toLowerCase());
  const ownedListingIds = new Set(
    store.listings
      .filter((listing) => listing.ownerId === target.id
        || (!listing.ownerId && sameNameAccounts.length === 1 && listing.seller.trim().toLowerCase() === target.name.trim().toLowerCase()))
      .map((listing) => listing.id),
  );
  const nextStore: AppStore = {
    ...store,
    users: store.users.filter((user) => user.id !== target.id),
    listings: store.listings.filter((listing) => !ownedListingIds.has(listing.id)),
    requests: store.requests.filter((request) => request.requesterEmail.toLowerCase() !== normalizedEmail && !ownedListingIds.has(request.listingId)),
    deliveryRequests: store.deliveryRequests.filter((request) => request.userEmail.toLowerCase() !== normalizedEmail),
    disputes: store.disputes.filter((dispute) => !(sameNameAccounts.length === 1
      && dispute.user.trim().toLowerCase() === target.name.trim().toLowerCase())
      && !Array.from(ownedListingIds).some((listingId) => dispute.reason.includes(listingId))),
    savedListingIds: store.savedListingIds.filter((listingId) => !ownedListingIds.has(listingId)),
    savedListingIdsByUser: Object.fromEntries(
      Object.entries(store.savedListingIdsByUser)
        .filter(([savedEmail]) => savedEmail.toLowerCase() !== normalizedEmail)
        .map(([savedEmail, listingIds]) => [savedEmail, listingIds.filter((listingId) => !ownedListingIds.has(listingId))]),
    ),
  };
  saveAppStore(nextStore);
  return { ok: true as const, deletedListings: ownedListingIds.size };
}

export function createListingRequest(listingId: string) {
  const user = getCurrentUser();
  if (!user) return { ok: false as const, error: 'Sign in to send an exchange request.' };

  const store = getAppStore();
  const listing = store.listings.find((item) => item.id === listingId);
  if (!listing) return { ok: false as const, error: 'This listing is no longer available.' };
  if (listing.status !== 'Approved' && listing.status !== 'Active') {
    return { ok: false as const, error: 'This listing is not available for exchange requests.' };
  }
  if (listingBelongsToUser(listing, user)) {
    return { ok: false as const, error: 'You cannot request your own listing.' };
  }
  if (store.requests.some((request) => request.listingId === listingId && request.requesterEmail === user.email && request.status !== 'Declined')) {
    return { ok: false as const, error: 'You already have an active request for this listing.' };
  }

  const request: AppRequest = {
    id: `request-${Date.now()}`,
    listingId,
    listingTitle: listing.title,
    requester: user.name,
    requesterEmail: user.email,
    createdAt: new Date().toISOString(),
    status: 'Pending',
  };
  saveAppStore({ ...store, requests: [request, ...store.requests] });
  return { ok: true as const, request };
}

export function isListingSaved(listingId: string) {
  const user = getCurrentUser();
  if (!user) return false;
  const store = getAppStore();
  const userSavedIds = store.savedListingIdsByUser[user.email.toLowerCase()]
    ?? Object.entries(store.savedListingIdsByUser).find(([email]) => email.toLowerCase() === user.email.toLowerCase())?.[1]
    ?? [];
  return userSavedIds.includes(listingId);
}

export function toggleSavedListing(listingId: string) {
  const user = getCurrentUser();
  if (!user) return { ok: false as const, error: 'Sign in to save listings.' };
  const store = getAppStore();
  if (!store.listings.some((listing) => listing.id === listingId)) {
    return { ok: false as const, error: 'This listing is no longer available.' };
  }
  const normalizedEmail = user.email.toLowerCase();
  const userSavedIds = store.savedListingIdsByUser[normalizedEmail]
    ?? Object.entries(store.savedListingIdsByUser).find(([email]) => email.toLowerCase() === normalizedEmail)?.[1]
    ?? [];
  const saved = userSavedIds.includes(listingId);
  const savedListingIds = saved
    ? userSavedIds.filter((id) => id !== listingId)
    : [listingId, ...userSavedIds];
  saveAppStore({
    ...store,
    savedListingIds: [],
    savedListingIdsByUser: { ...store.savedListingIdsByUser, [normalizedEmail]: savedListingIds },
  });
  return { ok: true as const, saved: !saved };
}

export function reportListing(listingId: string, reason: string) {
  const user = getCurrentUser();
  if (!user) return { ok: false as const, error: 'Sign in to report a listing.' };
  const store = getAppStore();
  const listing = store.listings.find((item) => item.id === listingId);
  if (!listing) return { ok: false as const, error: 'This listing is no longer available.' };
  const dispute: AppDispute = {
    id: `DSP-${Date.now()}`,
    user: user.name,
    reason: `${reason}: ${listing.title} (${listing.id})`,
    severity: 'Medium',
    status: 'Open',
  };
  saveAppStore({ ...store, disputes: [dispute, ...store.disputes] });
  return { ok: true as const };
}

export function createDeliveryRequest(input: Omit<AppDeliveryRequest, 'id' | 'userEmail' | 'estimatedFee' | 'status' | 'createdAt'>) {
  const user = getCurrentUser();
  if (!user) return { ok: false as const, error: 'Sign in to request a delivery.' };
  if (!Number.isFinite(input.distanceKm) || input.distanceKm <= 0) {
    return { ok: false as const, error: 'Enter a delivery distance greater than zero.' };
  }
  if (input.distanceKm > 100) {
    return { ok: false as const, error: 'Deliveries above 100 km need manual support. Please contact the Help Centre.' };
  }
  if (!input.product.trim() || !input.pickupAddress.trim() || !input.deliveryAddress.trim() || !input.preferredPartner.trim()) {
    return { ok: false as const, error: 'Complete the product, pickup, delivery, and courier preference fields.' };
  }

  const store = getAppStore();
  const request: AppDeliveryRequest = {
    ...input,
    id: `delivery-${Date.now()}`,
    userEmail: user.email,
    product: input.product.trim(),
    pickupAddress: input.pickupAddress.trim(),
    deliveryAddress: input.deliveryAddress.trim(),
    preferredPartner: input.preferredPartner.trim(),
    estimatedFee: Math.max(80, Math.ceil(40 + input.distanceKm * 12)),
    status: 'Request saved - courier not booked',
    createdAt: new Date().toISOString(),
  };
  saveAppStore({ ...store, deliveryRequests: [request, ...store.deliveryRequests] });
  return { ok: true as const, request };
}
