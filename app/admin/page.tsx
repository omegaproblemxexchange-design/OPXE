/*
  OPXE admin panel note:
  - Purpose: Restricted admin area for platform oversight and management actions.
  - Key behavior: reads the current role from localStorage, blocks non-admin users in the client UI, and provides local admin workflows for users, listings, requests, delivery requests, payments, and disputes.
  - Change log: upgraded with premium control-center design, report export, approval/rejection controls, and dispute handling.
*/

'use client';

import Link from 'next/link';
import Image from 'next/image';
import ImagePreview from '@/components/ImagePreview';
import { Fragment, type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAppBackup, restoreAppBackup, parseAppBackup } from '@/lib/adminBackup';
import { addDigitalProduct, changeCurrentUserPassword, deleteDemoAccount, deleteDispute, deleteListing, deletePayment, getAppStore, getCurrentUser, getRoleLabel, listingBelongsToUser, removeDigitalProduct, resetUserPasswordByHead, saveAppStore, setCurrentUser, type AccountStatus, type AppDeliveryRequest, type AppDispute, type AppDigitalProduct, type AppListing, type AppPayment, type AppRequest, type AppUser } from '@/lib/appStore';
import { addRecipientNotification, getNotifications, NOTIFICATIONS_KEY, saveNotifications, type AppNotification } from '@/lib/notifications';
import { DIGITAL_STORE_EMAIL, DIGITAL_STORE_WHATSAPP_NUMBER } from '@/lib/digitalProducts';

function csvCell(value: unknown) {
  const text = String(value);
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function statusStyles(status: string) {
  if (status === 'Verified' || status === 'Approved' || status === 'Cleared' || status === 'Resolved') {
    return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
  if (status === 'Blocked') {
    return 'border border-amber-500/30 bg-amber-500/10 text-amber-200';
  }
  if (status === 'Banned') {
    return 'border border-red-500/30 bg-red-500/10 text-red-200';
  }
  if (status === 'Premium' || status === 'Active' || status === 'Pending' || status === 'Open') {
    return 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-200';
  }
  if (status === 'Flagged' || status === 'Rejected' || status === 'High' || status === 'Disputed') {
    return 'border border-red-500/30 bg-red-500/10 text-red-200';
  }
  if (status === 'Suspended' || status === 'Low') {
    return 'border border-amber-500/30 bg-amber-500/10 text-amber-200';
  }
  return 'border border-slate-700 bg-slate-800 text-slate-200';
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [userFilter, setUserFilter] = useState('All');
  const [accountStatusFilter, setAccountStatusFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [listingFilter, setListingFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [disputeFilter, setDisputeFilter] = useState('All');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [listings, setListings] = useState<AppListing[]>([]);
  const [payments, setPayments] = useState<AppPayment[]>([]);
  const [disputes, setDisputes] = useState<AppDispute[]>([]);
  const [requests, setRequests] = useState<AppRequest[]>([]);
  const [deliveryRequests, setDeliveryRequests] = useState<AppDeliveryRequest[]>([]);
  const [digitalProducts, setDigitalProducts] = useState<AppDigitalProduct[]>([]);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedOverview, setSelectedOverview] = useState<string | null>(null);
  const [messageRecipientId, setMessageRecipientId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [digitalTitle, setDigitalTitle] = useState('');
  const [digitalDescription, setDigitalDescription] = useState('');
  const [digitalCategory, setDigitalCategory] = useState('Templates & Study');
  const [digitalOtherCategory, setDigitalOtherCategory] = useState('');
  const [digitalPrice, setDigitalPrice] = useState('');
  const [digitalImage, setDigitalImage] = useState('');
  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);
  const [passwordResetDraft, setPasswordResetDraft] = useState('');
  const [passwordResetConfirmation, setPasswordResetConfirmation] = useState('');
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState('');
  const [newHeadPasswordDraft, setNewHeadPasswordDraft] = useState('');
  const [newHeadPasswordConfirmation, setNewHeadPasswordConfirmation] = useState('');
  const [pendingBackup, setPendingBackup] = useState<{ contents: string; users: number; listings: number; notifications: number } | null>(null);
  const [backupConfirmation, setBackupConfirmation] = useState('');
  const backupFileInput = useRef<HTMLInputElement>(null);

  const loadStore = useCallback(() => {
    const store = getAppStore();
    setUsers(store.users);
    setListings(store.listings);
    setPayments(store.payments);
    setDisputes(store.disputes);
    setRequests(store.requests);
    setDeliveryRequests(store.deliveryRequests);
    setDigitalProducts(store.digitalProducts);
  }, []);

  useEffect(() => {
    setIsAdmin(getCurrentUser()?.role === 'admin');
    loadStore();
    setReady(true);
    const reviewTimer = window.setInterval(loadStore, 30_000);
    return () => window.clearInterval(reviewTimer);
  }, [loadStore]);

  useEffect(() => {
    if (selectedOverview) {
      document.getElementById('admin-overview-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedOverview]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = userFilter === 'All' || user.role === (userFilter === 'Head' ? 'admin' : userFilter.toLowerCase());
      const matchesVerification = verificationFilter === 'All' || user.verified === (verificationFilter === 'Verified');
      const matchesAccountStatus = accountStatusFilter === 'All' || (user.accountStatus ?? 'active') === accountStatusFilter.toLowerCase();
      return matchesRole && matchesVerification && matchesAccountStatus;
    });
  }, [userFilter, verificationFilter, accountStatusFilter, users]);

  const filteredListings = useMemo(() => {
    if (listingFilter === 'All') return listings;
    return listings.filter((listing) => listing.status === listingFilter);
  }, [listingFilter, listings]);

  const filteredPayments = useMemo(() => {
    if (paymentFilter === 'All') return payments;
    return payments.filter((payment) => payment.status === paymentFilter);
  }, [paymentFilter, payments]);

  const filteredDisputes = useMemo(() => {
    if (disputeFilter === 'All') return disputes;
    return disputes.filter((dispute) => dispute.status === disputeFilter);
  }, [disputeFilter, disputes]);

  const logout = () => {
    window.localStorage.removeItem('opxe_role');
    setCurrentUser(null);
    window.location.assign('/login');
  };

  const handleHeadPasswordChange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newHeadPasswordDraft !== newHeadPasswordConfirmation) {
      setActionMessage('The new password and confirmation do not match.');
      return;
    }
    const result = changeCurrentUserPassword(currentPasswordDraft, newHeadPasswordDraft);
    if (!result.ok) {
      setActionMessage(result.error);
      return;
    }
    setCurrentPasswordDraft('');
    setNewHeadPasswordDraft('');
    setNewHeadPasswordConfirmation('');
    setActionMessage('Head password changed in this browser. Keep it private and store a backup safely.');
  };

  const handleUserPasswordReset = (event: FormEvent<HTMLFormElement>, user: AppUser) => {
    event.preventDefault();
    if (passwordResetDraft !== passwordResetConfirmation) {
      setActionMessage('The new password and confirmation do not match.');
      return;
    }
    const result = resetUserPasswordByHead(user.email, passwordResetDraft);
    if (!result.ok) {
      setActionMessage(result.error);
      return;
    }
    setPasswordResetUserId(null);
    setPasswordResetDraft('');
    setPasswordResetConfirmation('');
    setActionMessage(`Password reset for ${user.name}. Share the new password privately; OPXE will not display or email it.`);
  };

  const handleBackupExport = () => {
    try {
      const backup = createAppBackup(getAppStore(), getNotifications());
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `opxe-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setActionMessage('Full browser-data backup downloaded. Passwords and sign-in sessions are excluded.');
    } catch (error) {
      console.error('Unable to export the OPXE browser backup.', error);
      setActionMessage(error instanceof Error ? `Backup export failed: ${error.message}` : 'Backup export failed.');
    }
  };

  const handleBackupImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const contents = await file.text();
      const backup = parseAppBackup(contents);
      setPendingBackup({
        contents,
        users: backup.store.users.length,
        listings: backup.store.listings.length,
        notifications: backup.notifications.length,
      });
      setBackupConfirmation('');
      setActionMessage('Backup file validated. Review the replacement details and confirm below.');
    } catch (error) {
      console.error('Unable to restore the OPXE browser backup.', error);
      setActionMessage(error instanceof Error ? `Backup restore failed: ${error.message}` : 'Backup restore failed.');
    }
  };

  const confirmBackupRestore = () => {
    if (!pendingBackup) return;
    if (backupConfirmation !== 'RESTORE') {
      setActionMessage('Type RESTORE exactly to confirm replacing current browser data.');
      return;
    }
    try {
      const restored = restoreAppBackup(pendingBackup.contents);
      setPendingBackup(null);
      setBackupConfirmation('');
      loadStore();
      setActionMessage(`Backup restored: ${restored.users} accounts, ${restored.listings} listings, ${restored.digitalProducts} digital products, ${restored.notifications} notifications. Accounts not present in this browser need password resets.`);
    } catch (error) {
      console.error('Unable to restore the OPXE browser backup.', error);
      setActionMessage(error instanceof Error ? `Backup restore failed: ${error.message}` : 'Backup restore failed.');
    }
  };

  const handleUserAction = (email: string, nextRole: 'admin' | 'user' | 'premium') => {
    const store = getAppStore();
    const targetUser = store.users.find((user) => user.email === email);
    if (targetUser?.id === 'admin-01' || email.toLowerCase() === 'admin@opxe.in') {
      setActionMessage('The owner Head role is protected.');
      return;
    }
    if (email === getCurrentUser()?.email && nextRole !== 'admin') {
      setActionMessage('Your Head role cannot be removed during the active session.');
      return;
    }
    const nextUsers = store.users.map((user) => (user.email === email ? { ...user, role: nextRole } : user));
    saveAppStore({ ...store, users: nextUsers });
    const currentUser = getCurrentUser();
    if (currentUser?.email === email) setCurrentUser({ ...currentUser, role: nextRole });
    setUsers(nextUsers);
    setActionMessage(`${email} role updated to ${getRoleLabel(nextRole)}.`);
  };

  const handleUserVerification = (email: string, verified: boolean) => {
    const store = getAppStore();
    if (store.users.some((user) => user.email === email && user.id === 'admin-01')) {
      setActionMessage('The owner Head review flag is protected.');
      return;
    }
    const nextUsers = store.users.map((user) => user.email === email ? { ...user, verified } : user);
    saveAppStore({ ...store, users: nextUsers });
    setUsers(nextUsers);
    setActionMessage(`${email} marked ${verified ? 'reviewed' : 'not reviewed'}.`);
  };

  const handleAccountStatus = (email: string, accountStatus: AccountStatus) => {
    const store = getAppStore();
    const target = store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
    if (!target) {
      setActionMessage('This account no longer exists. Refresh the Head panel.');
      return;
    }
    if (target.id === 'admin-01' || target.email.toLowerCase() === 'admin@opxe.in') {
      setActionMessage('The owner Head account is protected.');
      return;
    }
    if (target.email.toLowerCase() === getCurrentUser()?.email.toLowerCase()) {
      setActionMessage('You cannot change the status of the Head account currently in use.');
      return;
    }
    if ((target.accountStatus ?? 'active') === accountStatus) {
      setActionMessage(`${target.name} is already ${accountStatus}.`);
      return;
    }

    const nextUsers = store.users.map((user) => user.id === target.id ? { ...user, accountStatus } : user);
    saveAppStore({ ...store, users: nextUsers });
    setUsers(nextUsers);
    setActionMessage(`${target.name}'s account is now ${accountStatus}. ${accountStatus === 'active' ? 'They can sign in again.' : 'They cannot sign in or use account-only actions.'}`);
  };

  const handlePermanentDelete = (user: AppUser) => {
    if (user.id === 'admin-01' || user.email.toLowerCase() === 'admin@opxe.in') {
      setActionMessage('The owner Head account is protected.');
      return;
    }
    if (user.email.toLowerCase() === getCurrentUser()?.email.toLowerCase()) {
      setActionMessage('You cannot permanently delete the Head account currently in use.');
      return;
    }
    if (!window.confirm(`Permanently delete ${user.name} (${user.email}) and this browser's associated listings, requests, deliveries, saved items, and dispute reports? This cannot be undone.`)) return;
    if (window.prompt(`To confirm, type this account email exactly:\n${user.email}`) !== user.email) {
      setActionMessage('Account deletion cancelled because the email did not match.');
      return;
    }

    const result = deleteDemoAccount(user.email);
    if (!result.ok) {
      setActionMessage(result.error);
      return;
    }

    setUsers((current) => current.filter((item) => item.id !== user.id));
    loadStore();
    setMessageRecipientId((current) => current === user.id ? null : current);
    try {
      const remainingNotifications = JSON.parse(window.localStorage.getItem(NOTIFICATIONS_KEY) ?? '[]') as AppNotification[];
      saveNotifications(remainingNotifications.filter((notification) => notification.recipientEmail?.toLowerCase() !== user.email.toLowerCase()));
      setActionMessage(`Permanently deleted ${user.name} and associated browser activity. ${result.deletedListings} listing(s) removed.`);
    } catch (error) {
      console.error('The account was deleted, but its inbox notifications could not be removed.', error);
      setActionMessage(`The account and associated activity were deleted, but inbox cleanup failed. Remove notifications for ${user.email} from this browser.`);
    }
  };

  const handleSendUserMessage = (event: React.FormEvent<HTMLFormElement>, user: AppUser) => {
    event.preventDefault();
    const detail = messageDraft.trim();
    if (!detail) {
      setActionMessage('Write a message before sending it.');
      return;
    }

    try {
      addRecipientNotification({
        recipientEmail: user.email,
        senderLabel: 'OPXE Head',
        title: 'Message from OPXE Head',
        detail,
      });
      setMessageDraft('');
      setMessageRecipientId(null);
      setActionMessage(`Private notification sent to ${user.name}.`);
    } catch (error) {
      console.error('Unable to send the admin notification.', error);
      setActionMessage('The message could not be saved. Please try again.');
    }
  };

  const handleListingAction = (id: string, nextStatus: 'Approved' | 'Pending' | 'Rejected' | 'Active') => {
    const store = getAppStore();
    const nextListings = store.listings.map((listing) => (
      listing.id === id
        ? {
            ...listing,
            status: nextStatus,
            reviewMethod: nextStatus === 'Approved' || nextStatus === 'Rejected' ? 'admin' as const : undefined,
            reviewStartedAt: nextStatus === 'Pending' ? new Date().toISOString() : undefined,
            reviewedAt: nextStatus === 'Approved' || nextStatus === 'Rejected' ? new Date().toISOString() : undefined,
          }
        : listing
    ));
    saveAppStore({ ...store, listings: nextListings });
    setListings(nextListings);
    setActionMessage(`Listing marked ${nextStatus.toLowerCase()}.`);
  };

  const handleListingDeletion = (listing: AppListing) => {
    const confirmed = window.confirm(
      `Permanently delete "${listing.title}" (${listing.status}) and remove its photos from this browser? Related requests, reports, and saved-item references will also be deleted.`,
    );
    if (!confirmed) return;
    const result = deleteListing(listing.id);
    if (!result.ok) {
      setActionMessage(result.error);
      return;
    }
    loadStore();
    setActionMessage(`"${result.listing.title}" and its stored photos were permanently deleted from this browser.`);
  };

  const handleDigitalProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = addDigitalProduct({
      title: digitalTitle,
      description: digitalDescription,
      category: digitalCategory === 'Other' ? digitalOtherCategory : digitalCategory,
      image: digitalImage,
      priceINR: Number(digitalPrice),
    });
    if (!result.ok) {
      setActionMessage(result.error);
      return;
    }
    setDigitalTitle('');
    setDigitalDescription('');
    setDigitalPrice('');
    setDigitalOtherCategory('');
    setDigitalImage('');
    loadStore();
    setActionMessage(`Digital product "${result.product.title}" added to the public digital store.`);
  };

  const handleDigitalImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setActionMessage('Choose a JPG, PNG, or WEBP product photo.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setActionMessage('The product photo must be 8 MB or smaller.');
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      try {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)) * (0.82 ** attempt);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('This browser could not process the product photo.');
          context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          const compressedImage = canvas.toDataURL('image/jpeg', Math.max(0.48, 0.78 - attempt * 0.08));
          if (compressedImage.length <= 320 * 1024) {
            setDigitalImage(compressedImage);
            setActionMessage('Digital product photo is ready.');
            return;
          }
        }
      } finally {
        bitmap.close();
      }
      throw new Error('This photo could not be compressed. Choose a smaller image.');
    } catch (error) {
      console.error('Unable to prepare the digital product photo.', error);
      setActionMessage(error instanceof Error ? error.message : 'Unable to prepare the product photo.');
    }
  };

  const handleDigitalProductRemoval = (product: AppDigitalProduct) => {
    if (!window.confirm(`Remove "${product.title}" from the digital store?`)) return;
    const result = removeDigitalProduct(product.id);
    if (!result.ok) {
      setActionMessage(result.error);
      return;
    }
    loadStore();
    setActionMessage(`Digital product "${product.title}" removed.`);
  };

  const handlePaymentStatus = (id: string, nextStatus: 'Cleared' | 'Pending' | 'Disputed') => {
    const store = getAppStore();
    const nextPayments = store.payments.map((payment) => (payment.id === id ? { ...payment, status: nextStatus } : payment));
    saveAppStore({ ...store, payments: nextPayments });
    setPayments(nextPayments);
    setActionMessage(`Payment ${id} marked ${nextStatus.toLowerCase()}.`);
  };

  const handleDisputeStatus = (id: string) => {
    const store = getAppStore();
    const nextDisputes: AppDispute[] = store.disputes.map((dispute) =>
      dispute.id === id ? { ...dispute, status: 'Resolved' as const } : dispute,
    );
    saveAppStore({ ...store, disputes: nextDisputes });
    setDisputes(nextDisputes);
    setActionMessage(`Dispute ${id} resolved.`);
  };

  const handlePaymentDeletion = (payment: AppPayment) => {
    if (!window.confirm(`Permanently delete payment record ${payment.id} (${payment.status})?`)) return;
    const result = deletePayment(payment.id);
    if (!result.ok) {
      setActionMessage(result.error);
      return;
    }
    loadStore();
    setActionMessage(`Payment record ${result.payment.id} was permanently deleted.`);
  };

  const handleDisputeDeletion = (dispute: AppDispute) => {
    if (!window.confirm(`Permanently delete dispute ${dispute.id}? This cannot be undone.`)) return;
    const result = deleteDispute(dispute.id);
    if (!result.ok) {
      setActionMessage(result.error);
      return;
    }
    loadStore();
    setActionMessage(`Dispute ${result.dispute.id} was permanently deleted.`);
  };

  const handleRequestStatus = (id: string, status: AppRequest['status']) => {
    const store = getAppStore();
    const target = store.requests.find((request) => request.id === id);
    if (!target || target.status !== 'Pending') {
      setActionMessage('This exchange request is no longer pending.');
      return;
    }
    const nextRequests = store.requests.map((request) => request.id === id ? { ...request, status } : request);
    saveAppStore({ ...store, requests: nextRequests });
    setRequests(nextRequests);
    try {
      addRecipientNotification({
        recipientEmail: target.requesterEmail,
        senderLabel: 'OPXE Head',
        title: `Exchange request ${status.toLowerCase()}`,
        detail: `Your request for "${target.listingTitle}" was ${status.toLowerCase()} by the OPXE Head.`,
      });
      setActionMessage(`Exchange request ${id} ${status.toLowerCase()}. The requester has a notification.`);
    } catch (error) {
      console.error('The Head updated the request, but the requester notification could not be saved.', error);
      setActionMessage(`Exchange request ${id} was updated, but the requester notification could not be saved.`);
    }
  };

  const exportReport = () => {
    const rows = [
      ['Type', 'Name/ID', 'Status', 'Email/Price/Amount', 'City/Category', 'Owner/Counterparty', 'Details'],
      ...users.map((user) => ['User', user.name, `${getRoleLabel(user.role)} / ${user.accountStatus ?? 'active'}`, user.email, user.city, user.phone, `College: ${user.college}; course: ${user.course}; class/year: ${user.classYear}; profile review: ${user.verified ? 'reviewed' : 'not reviewed'}; email OTP: ${user.emailVerified ? 'verified' : 'not verified'}; phone OTP: ${user.phoneVerified ? 'verified' : 'not verified'}; joined: ${user.createdAt}`]),
      ...listings.map((listing) => ['Listing', listing.title, listing.status, listing.price, `${listing.city} / ${listing.category}`, listing.seller, `${listing.type}; ${listing.condition}; ${listing.availability}; ${listing.description}`]),
      ...payments.map((payment) => ['Payment', payment.id, payment.status, `₹${payment.amount.toLocaleString()}`, payment.type, `${payment.buyer} -> ${payment.seller}`, '']),
      ...requests.map((request) => ['Request', request.listingTitle, request.status, request.requesterEmail, '', request.requester, `Listing ${request.listingId}; ${request.createdAt}`]),
      ...deliveryRequests.map((request) => ['Delivery request', request.id, request.status, request.userEmail, `${request.distanceKm} km`, request.preferredPartner, `${request.product}; ${request.pickupAddress} -> ${request.deliveryAddress}; estimate ₹${request.estimatedFee}; ${request.createdAt}`]),
      ...disputes.map((dispute) => ['Dispute', dispute.id, dispute.status, '', dispute.severity, dispute.user, dispute.reason]),
    ];

    const csv = rows
      .map((row) => row.map(csvCell).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'opxe-head-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    setActionMessage('Head report exported.');
  };

  const approvedListings = listings.filter((listing) => listing.status === 'Approved' || listing.status === 'Active').length;
  const pendingListings = listings.filter((listing) => listing.status === 'Pending').length;
  const rejectedListings = listings.filter((listing) => listing.status === 'Rejected').length;
  const verifiedUsers = users.filter((user) => user.verified).length;
  const openDisputes = disputes.filter((dispute) => dispute.status === 'Open').length;
  const overviewRows = [
    { id: 'users', label: 'Total users', value: String(users.length) },
    { id: 'verifiedUsers', label: 'Profiles reviewed', value: `${verifiedUsers} / ${users.length}` },
    { id: 'listings', label: 'Total listings', value: String(listings.length) },
    { id: 'approvedListings', label: 'Approved listings', value: String(approvedListings) },
    { id: 'pendingListings', label: 'Pending review', value: String(pendingListings) },
    { id: 'rejectedListings', label: 'Rejected listings', value: String(rejectedListings) },
    { id: 'openDisputes', label: 'Open disputes', value: String(openDisputes) },
    { id: 'requests', label: 'Total requests', value: String(requests.length) },
    { id: 'deliveryRequests', label: 'Delivery requests', value: String(deliveryRequests.length) },
    { id: 'payments', label: 'Total payments', value: String(payments.length) },
    { id: 'disputedPayments', label: 'Disputed payments', value: String(payments.filter((payment) => payment.status === 'Disputed').length) },
  ];
  const overviewUsers = selectedOverview === 'verifiedUsers'
    ? users.filter((user) => user.verified)
    : users;
  const overviewListings = selectedOverview === 'approvedListings'
    ? listings.filter((listing) => listing.status === 'Approved' || listing.status === 'Active')
    : selectedOverview === 'pendingListings'
      ? listings.filter((listing) => listing.status === 'Pending')
      : selectedOverview === 'rejectedListings'
        ? listings.filter((listing) => listing.status === 'Rejected')
        : listings;
  const selectedOverviewTitle = overviewRows.find((row) => row.id === selectedOverview)?.label;

  if (!ready) {
    return (
      <main className="page-shell">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-10 text-center text-slate-300">
          Checking access...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="page-shell">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <div className="text-sm uppercase tracking-[0.25em] text-red-300">Access denied</div>
          <h1 className="mt-3 text-3xl font-black text-white">Head access only</h1>
          <p className="mt-3 text-slate-300">
            This panel is available only to a browser session with the local Head role. It does not connect to or protect platform-wide data.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">
              Go to login
            </Link>
            <Link href="/" className="rounded-full border border-slate-700 px-5 py-3 font-semibold text-white">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Head control</div>
          <h1 className="mt-2 text-3xl font-black text-white">Head control center</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Head session
          </div>
          <button onClick={logout} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-red-400 hover:text-red-300">
            Logout
          </button>
        </div>
      </div>
      {actionMessage && <div role="status" className="mb-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{actionMessage}</div>}
      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
        Local control center: counts and actions reflect this browser&apos;s saved data only. Profile review and listing approval are manual records, not real identity, email, phone, or product verification.
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {overviewRows.map((metric) => (
          <button type="button" key={metric.id} onClick={() => setSelectedOverview(metric.id)} aria-pressed={selectedOverview === metric.id} className={`rounded-3xl border bg-gradient-to-br from-slate-900/75 to-slate-950/95 p-6 text-left shadow-[0_15px_40px_rgba(14,165,233,0.12)] transition-colors hover:border-cyan-400 ${selectedOverview === metric.id ? 'border-cyan-400' : 'border-slate-800'}`}>
            <div className="text-3xl font-black text-white">{metric.value}</div>
            <div className="mt-2 text-sm text-slate-400">{metric.label}</div>
            <div className="mt-3 text-xs text-cyan-300">Click to inspect →</div>
          </button>
        ))}
      </div>

      {selectedOverview && (
        <section id="admin-overview-details" aria-live="polite" className="mt-6 scroll-mt-6 rounded-3xl border border-cyan-500/30 bg-slate-900/80 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Head drill-down</div>
              <h2 className="mt-1 text-2xl font-bold text-white">{selectedOverviewTitle}</h2>
            </div>
            <button type="button" onClick={() => setSelectedOverview(null)} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">Close details</button>
          </div>

          {(selectedOverview === 'users' || selectedOverview === 'verifiedUsers') && (
            <div className="grid gap-4 lg:grid-cols-2">
              {overviewUsers.length ? overviewUsers.map((user) => {
                const userListings = listings.filter((listing) => listingBelongsToUser(listing, user));
                const userListingIds = new Set(userListings.map((listing) => listing.id));
                const userRequests = requests.filter((request) => request.requesterEmail.toLowerCase() === user.email.toLowerCase());
                const incomingRequests = requests.filter((request) => userListingIds.has(request.listingId));
                const userDeliveryRequests = deliveryRequests.filter((request) => request.userEmail.toLowerCase() === user.email.toLowerCase());
                const savedIds = Object.entries(getAppStore().savedListingIdsByUser)
                  .find(([email]) => email.toLowerCase() === user.email.toLowerCase())?.[1] ?? [];
                const savedListings = savedIds
                  .map((id) => listings.find((listing) => listing.id === id))
                  .filter((listing): listing is AppListing => Boolean(listing));
                const phoneDigits = user.phone.replace(/\D/g, '');
                return (
                  <article key={user.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{user.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                        <p className="mt-1 text-xs text-slate-500">Account ID: {user.id}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${statusStyles(user.verified ? 'Verified' : 'Unverified')}`}>
                        {user.verified ? 'Profile reviewed' : 'Not reviewed'}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs uppercase text-slate-500">Account status</dt><dd className="mt-1 text-slate-200">{user.accountStatus ?? 'active'}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Password</dt><dd className="mt-1 text-slate-200">Protected; use Reset password to set a new one</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Phone</dt><dd className="mt-1 text-slate-200">{user.phone || 'Not provided'}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">City</dt><dd className="mt-1 text-slate-200">{user.city || 'Not provided'}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">College / school</dt><dd className="mt-1 text-slate-200">{user.college || 'Not provided'}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Course / program</dt><dd className="mt-1 text-slate-200">{user.course || 'Not provided'}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Class / year</dt><dd className="mt-1 text-slate-200">{user.classYear || 'Not provided'}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Email verification</dt><dd className="mt-1 text-amber-200">{user.emailVerified ? 'OTP verified' : 'Not OTP-verified'}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Phone verification</dt><dd className="mt-1 text-amber-200">{user.phoneVerified ? 'OTP verified' : 'Not OTP-verified'}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Role</dt><dd className="mt-1 text-slate-200">{getRoleLabel(user.role)}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Joined</dt><dd className="mt-1 text-slate-200">{new Date(user.createdAt).toLocaleString()}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Listings / sent requests</dt><dd className="mt-1 text-slate-200">{userListings.length} / {userRequests.length}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Requests received</dt><dd className="mt-1 text-slate-200">{incomingRequests.length}</dd></div>
                      <div><dt className="text-xs uppercase text-slate-500">Saved listings / delivery requests</dt><dd className="mt-1 text-slate-200">{savedListings.length} / {userDeliveryRequests.length}</dd></div>
                    </dl>
                    {(userListings.length > 0 || userRequests.length > 0 || incomingRequests.length > 0 || savedListings.length > 0 || userDeliveryRequests.length > 0) && (
                      <div className="mt-5 space-y-4 border-t border-slate-800 pt-4">
                        {userListings.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Listings posted</h4>
                            <ul className="mt-2 space-y-1 text-sm text-slate-200">
                              {userListings.map((listing) => <li key={listing.id}>{listing.title} · {listing.status}</li>)}
                            </ul>
                          </div>
                        )}
                        {savedListings.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Saved listings</h4>
                            <ul className="mt-2 space-y-1 text-sm text-slate-200">
                              {savedListings.map((listing) => <li key={listing.id}>{listing.title} · {listing.status}</li>)}
                            </ul>
                          </div>
                        )}
                        {(userRequests.length > 0 || incomingRequests.length > 0) && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Exchange activity</h4>
                            <ul className="mt-2 space-y-1 text-sm text-slate-200">
                              {userRequests.map((request) => <li key={`sent-${request.id}`}>Sent: {request.listingTitle} · {request.status} · {new Date(request.createdAt).toLocaleString()}</li>)}
                              {incomingRequests.map((request) => <li key={`received-${request.id}`}>Received: {request.listingTitle} from {request.requester} · {request.status} · {new Date(request.createdAt).toLocaleString()}</li>)}
                            </ul>
                          </div>
                        )}
                        {userDeliveryRequests.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Delivery requests and submitted addresses</h4>
                            <ul className="mt-2 space-y-2 text-sm text-slate-200">
                              {userDeliveryRequests.map((request) => (
                                <li key={request.id} className="rounded-xl bg-slate-900 p-3">
                                  {request.product} · {request.status} · {request.distanceKm} km · ₹{request.estimatedFee.toLocaleString('en-IN')}
                                  <div className="mt-1 text-xs text-slate-400">Pickup: {request.pickupAddress}</div>
                                  <div className="text-xs text-slate-400">Delivery: {request.deliveryAddress}</div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setMessageRecipientId(user.id); setMessageDraft(''); }} className="rounded-full border border-cyan-500/40 px-4 py-2 text-xs font-semibold text-cyan-200">Send private message</button>
                      <a href={`mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent('OPXE account details review')}`} className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950">Message by email</a>
                      {user.phone && <a href={`tel:${user.phone.replace(/[^\d+]/g, '')}`} className="rounded-full border border-slate-700 px-4 py-2 text-xs text-white">Call phone</a>}
                      {user.phone && phoneDigits.length >= 8 && <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hello ${user.name}, I am contacting you about your OPXE account details.`)}`} target="_blank" rel="noreferrer" className="rounded-full border border-emerald-500/40 px-4 py-2 text-xs text-emerald-200">Open WhatsApp</a>}
                    </div>
                    {messageRecipientId === user.id && (
                      <form onSubmit={(event) => handleSendUserMessage(event, user)} className="mt-4 space-y-3 rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-4">
                        <label htmlFor={`admin-message-${user.id}`} className="block text-sm font-medium text-slate-200">Private notification for {user.name}</label>
                        <textarea id={`admin-message-${user.id}`} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} required maxLength={1000} rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400" placeholder="Ask the user to review or correct their account details." />
                        <div className="flex flex-wrap gap-2">
                          <button type="submit" className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950">Send notification</button>
                          <button type="button" onClick={() => { setMessageRecipientId(null); setMessageDraft(''); }} className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200">Cancel</button>
                        </div>
                        <p className="text-xs text-slate-400">Only this account will see the message after signing in on this browser.</p>
                      </form>
                    )}
                  </article>
                );
              }) : <p className="text-sm text-slate-400">No users match this count.</p>}
            </div>
          )}

          {['listings', 'approvedListings', 'pendingListings', 'rejectedListings'].includes(selectedOverview) && (
            <div className="space-y-4">
              {overviewListings.length ? overviewListings.map((listing) => (
                <article key={listing.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{listing.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">Listing ID: {listing.id} • Owner: {listing.seller}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${statusStyles(listing.status)}`}>{listing.status}</span>
                  </div>
                  <dl className="mt-4 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-xs uppercase text-slate-500">Type / category</dt><dd className="mt-1 text-slate-200">{listing.type} / {listing.category}</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">Price / condition</dt><dd className="mt-1 text-slate-200">{listing.price} / {listing.condition}</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">City / distance</dt><dd className="mt-1 text-slate-200">{listing.city} / {listing.distance}</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">Availability</dt><dd className="mt-1 text-slate-200">{listing.availability}</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">Posted</dt><dd className="mt-1 text-slate-200">{new Date(listing.createdAt).toLocaleString()}</dd></div>
                    <div className="sm:col-span-2 lg:col-span-3"><dt className="text-xs uppercase text-slate-500">Full description</dt><dd className="mt-1 whitespace-pre-wrap text-slate-200">{listing.description || 'No description provided'}</dd></div>
                  </dl>
                  <div className="mt-4">
                    <div className="mb-2 text-xs uppercase text-slate-500">Submitted photos ({listing.images?.length ?? 0})</div>
                    {listing.images?.length ? (
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                        {listing.images.map((image, index) => <Image key={`${index}-${image.length}`} src={image} alt={`${listing.title} photo ${index + 1}`} width={320} height={240} unoptimized className="h-28 w-full rounded-xl object-cover" />)}
                      </div>
                    ) : <p className="text-sm text-slate-400">No photos attached to this listing.</p>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleListingAction(listing.id, 'Approved')} className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">Approve</button>
                    <button type="button" onClick={() => handleListingAction(listing.id, 'Rejected')} className="rounded-full bg-red-500/15 px-3 py-2 text-xs text-red-200">Reject</button>
                    <Link href={`/listing/${listing.id}`} className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200">Open public listing</Link>
                    <button type="button" onClick={() => handleListingDeletion(listing)} className="rounded-full border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">Delete listing permanently</button>
                  </div>
                </article>
              )) : <p className="text-sm text-slate-400">No listings match this count.</p>}
            </div>
          )}

          {selectedOverview === 'requests' && <p className="text-sm text-slate-300">Request records and their statuses are shown in the Exchange requests section below.</p>}
          {selectedOverview === 'deliveryRequests' && (
            <div className="grid gap-4 md:grid-cols-2">
              {deliveryRequests.length ? deliveryRequests.map((request) => (
                <article key={request.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <h3 className="font-bold text-white">{request.product}</h3>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs uppercase text-slate-500">Request ID / account</dt><dd className="mt-1 text-slate-200">{request.id} / {request.userEmail}</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">Distance / estimate</dt><dd className="mt-1 text-slate-200">{request.distanceKm} km / ₹{request.estimatedFee.toLocaleString('en-IN')}</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">Courier preference</dt><dd className="mt-1 text-slate-200">{request.preferredPartner} (not booked)</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">Status / created</dt><dd className="mt-1 text-slate-200">{request.status} • {new Date(request.createdAt).toLocaleString()}</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">Pickup</dt><dd className="mt-1 whitespace-pre-wrap text-slate-200">{request.pickupAddress}</dd></div>
                    <div><dt className="text-xs uppercase text-slate-500">Delivery</dt><dd className="mt-1 whitespace-pre-wrap text-slate-200">{request.deliveryAddress}</dd></div>
                  </dl>
                </article>
              )) : <p className="text-sm text-slate-400">No delivery requests have been submitted yet.</p>}
            </div>
          )}
          {selectedOverview === 'openDisputes' && <p className="text-sm text-slate-300">Open dispute records and user-reported reasons are shown in the Dispute center below.</p>}
          {(selectedOverview === 'payments' || selectedOverview === 'disputedPayments') && <p className="text-sm text-slate-300">Payment parties, amount, type, and status are shown in Payments &amp; disputes below. These browser records do not represent actual transactions.</p>}
        </section>
      )}

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-bold text-white">Full data backup</h2>
          <p className="mt-2 text-sm text-slate-300">
            Export or restore this browser&apos;s listings, accounts, digital products, requests, payments, disputes, saved items, and notifications. Passwords and sign-in sessions are never included.
          </p>
          <input ref={backupFileInput} type="file" accept=".json,application/json" onChange={handleBackupImport} className="hidden" />
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={handleBackupExport} className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">
              Download full backup
            </button>
            <button type="button" onClick={() => backupFileInput.current?.click()} className="rounded-full border border-amber-500/40 bg-amber-500/10 px-5 py-3 font-semibold text-amber-100">
              Restore backup
            </button>
          </div>
          {pendingBackup && (
            <div className="mt-5 space-y-3 rounded-2xl border border-red-500/40 bg-red-950/30 p-4">
              <p className="text-sm font-semibold text-red-100">
                This will replace the current browser data with {pendingBackup.users} accounts, {pendingBackup.listings} listings, and {pendingBackup.notifications} notifications.
              </p>
              <label htmlFor="backup-restore-confirmation" className="block text-xs text-slate-300">Type RESTORE to continue</label>
              <input id="backup-restore-confirmation" value={backupConfirmation} onChange={(event) => setBackupConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-red-400" autoComplete="off" />
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={backupConfirmation !== 'RESTORE'} onClick={confirmBackupRestore} className="rounded-full bg-red-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Replace browser data</button>
                <button type="button" onClick={() => { setPendingBackup(null); setBackupConfirmation(''); setActionMessage('Backup restore cancelled.'); }} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">Cancel restore</button>
              </div>
              <p className="text-xs text-amber-200">Passwords and sessions are excluded. Accounts not present on this browser will need a Head-initiated password reset.</p>
            </div>
          )}
          <p className="mt-4 text-xs text-amber-200">
            Restore replaces current browser data after confirmation. Store backup files privately; they may contain personal account and listing information.
          </p>
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            Database connection changes are not available here yet. This app still uses browser storage; once a server backend exists, the Head panel can safely select from server-configured database profiles without exposing connection secrets in the browser.
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-bold text-white">Change Head password</h2>
          <p className="mt-2 text-sm text-slate-300">Enter the current password and choose a new one. Existing passwords are never shown.</p>
          <form onSubmit={handleHeadPasswordChange} className="mt-4 grid gap-3">
            <input type="password" required autoComplete="current-password" minLength={8} value={currentPasswordDraft} onChange={(event) => setCurrentPasswordDraft(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Current Head password" />
            <input type="password" required autoComplete="new-password" minLength={8} value={newHeadPasswordDraft} onChange={(event) => setNewHeadPasswordDraft(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="New password (8+ characters)" />
            <input type="password" required autoComplete="new-password" minLength={8} value={newHeadPasswordConfirmation} onChange={(event) => setNewHeadPasswordConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Confirm new password" />
            <button type="submit" className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Change Head password</button>
          </form>
          <p className="mt-4 text-xs text-amber-200">This prototype saves credentials in this browser and is not secure for production use.</p>
        </div>
      </section>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_15px_40px_rgba(2,6,23,0.45)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-300">Operations</div>
            <h2 className="mt-2 text-xl font-bold text-white">Management filters</h2>
          </div>
          <button onClick={exportReport} className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">
            Export report
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">User role</label>
            <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-white outline-none focus:border-cyan-400">
              <option>All</option>
              <option>Head</option>
              <option>user</option>
              <option>premium</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Profile verification</label>
            <select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-white outline-none focus:border-cyan-400">
              <option>All</option>
              <option>Verified</option>
              <option>Unverified</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Account status</label>
            <select value={accountStatusFilter} onChange={(event) => setAccountStatusFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-white outline-none focus:border-cyan-400">
              <option>All</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Listing moderation</label>
            <select value={listingFilter} onChange={(event) => setListingFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-white outline-none focus:border-cyan-400">
              <option>All</option>
              <option>Approved</option>
              <option>Pending</option>
              <option>Rejected</option>
              <option>Active</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Payment status</label>
            <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-white outline-none focus:border-cyan-400">
              <option>All</option>
              <option>Cleared</option>
              <option>Pending</option>
              <option>Disputed</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Dispute status</label>
            <select value={disputeFilter} onChange={(event) => setDisputeFilter(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-white outline-none focus:border-cyan-400">
              <option>All</option>
              <option>Open</option>
              <option>Resolved</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">User management</h2>
            <span className="text-sm text-cyan-300">{filteredUsers.length} profiles</span>
          </div>
          <p className="mb-4 text-xs text-slate-400">The profile review flag is a manual record. Email and phone OTP checks are not implemented.</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Profile review</th>
                  <th className="px-4 py-3 font-medium">Account status</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Listings</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const protectedAccount = user.id === 'admin-01'
                    || user.email.toLowerCase() === 'admin@opxe.in'
                    || user.email.toLowerCase() === getCurrentUser()?.email.toLowerCase();
                  return (
                  <Fragment key={user.email}>
                  <tr className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusStyles(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusStyles(user.verified ? 'Verified' : 'Unverified')}`}>
                        {user.verified ? 'Reviewed' : 'Not reviewed'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusStyles((user.accountStatus ?? 'active').replace(/^./, (letter) => letter.toUpperCase()))}`}>
                        {user.accountStatus ?? 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user.city}</td>
                    <td className="px-4 py-3">{listings.filter((listing) => listingBelongsToUser(listing, user)).length}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button disabled={protectedAccount} onClick={() => handleUserAction(user.email, 'user')} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40">User</button>
                        <button disabled={protectedAccount} onClick={() => handleUserAction(user.email, 'premium')} className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">Premium</button>
                        <button disabled={protectedAccount} onClick={() => handleUserAction(user.email, 'admin')} className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-200 disabled:cursor-not-allowed disabled:opacity-40">Head</button>
                        <button disabled={protectedAccount} onClick={() => handleUserVerification(user.email, !user.verified)} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">{user.verified ? 'Mark not reviewed' : 'Mark reviewed'}</button>
                        {!protectedAccount && (user.accountStatus ?? 'active') !== 'blocked' && <button type="button" onClick={() => handleAccountStatus(user.email, 'blocked')} className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-200">Block</button>}
                        {!protectedAccount && (user.accountStatus ?? 'active') !== 'banned' && <button type="button" onClick={() => handleAccountStatus(user.email, 'banned')} className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-red-200">Ban</button>}
                        {!protectedAccount && (user.accountStatus ?? 'active') !== 'active' && <button type="button" onClick={() => handleAccountStatus(user.email, 'active')} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200">Restore</button>}
                        {!protectedAccount && <button type="button" onClick={() => {
                          setPasswordResetUserId(user.id);
                          setPasswordResetDraft('');
                          setPasswordResetConfirmation('');
                        }} className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-violet-200">Reset password</button>}
                        {!protectedAccount && <button type="button" onClick={() => handlePermanentDelete(user)} className="rounded-full border border-red-500/40 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-red-200">Delete permanently</button>}
                      </div>
                    </td>
                  </tr>
                  {!protectedAccount && passwordResetUserId === user.id && (
                    <tr className="border-t border-slate-800 bg-slate-950/50">
                      <td colSpan={8} className="px-4 py-4">
                        <form onSubmit={(event) => handleUserPasswordReset(event, user)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                          <input type="password" required autoComplete="new-password" minLength={8} value={passwordResetDraft} onChange={(event) => setPasswordResetDraft(event.target.value)} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400" placeholder={`New password for ${user.name}`} />
                          <input type="password" required autoComplete="new-password" minLength={8} value={passwordResetConfirmation} onChange={(event) => setPasswordResetConfirmation(event.target.value)} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400" placeholder="Confirm password" />
                          <button type="submit" className="rounded-full bg-violet-400 px-4 py-2 text-sm font-semibold text-slate-950">Set password</button>
                          <button type="button" onClick={() => setPasswordResetUserId(null)} className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">Cancel</button>
                          <p className="text-xs text-amber-200 sm:col-span-4">The current password cannot be viewed. Tell the user their new password privately; this app does not send password emails.</p>
                        </form>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-bold text-white">System alerts</h2>
          <div className="mt-4 space-y-3">
            {[
              `${pendingListings} listings waiting for moderation`,
              `${openDisputes} open disputes need review`,
              `${requests.filter((request) => request.status === 'Pending').length} exchange requests pending response`,
              `${users.length - verifiedUsers} user profiles are not reviewed`,
            ].map((alert) => (
              <div key={alert} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <div className="text-sm text-slate-300">{alert}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-200">
            <div className="font-semibold">Platform health</div>
            <div className="mt-2 flex items-center justify-between">
              <span>Total listings</span>
              <span>{approvedListings} approved / {listings.length} total</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>Open disputes</span>
              <span>{openDisputes} open / {disputes.length} total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Exchange requests</h2>
          <span className="text-sm text-cyan-300">{requests.filter((request) => request.status === 'Pending').length} awaiting review</span>
        </div>
        {requests.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{request.listingTitle}</div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusStyles(request.status)}`}>{request.status}</span>
                </div>
                <div className="mt-2 text-sm text-slate-300">{request.requester} • {request.requesterEmail}</div>
                <div className="mt-1 text-xs text-slate-500">{new Date(request.createdAt).toLocaleString()}</div>
                {request.status === 'Pending' && (
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => handleRequestStatus(request.id, 'Accepted')} className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200">Accept</button>
                    <button type="button" onClick={() => handleRequestStatus(request.id, 'Declined')} className="rounded-full bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200">Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">No exchange requests have been submitted yet.</p>}
      </div>

      <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Listing approvals</h2>
            <span className="text-sm text-cyan-300">{filteredListings.length} records</span>
          </div>
          <div className="space-y-3">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-white">{listing.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{listing.seller} • {listing.category} • {listing.type}</div>
                    <div className="mt-1 text-xs text-slate-500">{listing.city} • {listing.condition} • {listing.availability} • Posted {new Date(listing.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusStyles(listing.status)}`}>{listing.status === 'Approved' || listing.status === 'Active' ? 'Approved' : listing.status === 'Pending' ? 'Pending review' : 'Rejected'}</span>
                    <div className="text-lg font-black text-cyan-300">{listing.price}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{listing.description}</p>
                {listing.images?.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {listing.images.map((image, index) => <Image key={`${index}-${image.length}`} src={image} alt={`${listing.title} photo ${index + 1}`} width={320} height={240} unoptimized className="h-24 w-full rounded-xl object-cover" />)}
                  </div>
                ) : <p className="mt-3 text-xs text-slate-500">No item photos attached.</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => handleListingAction(listing.id, 'Approved')} className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200">Approve</button>
                  <button onClick={() => handleListingAction(listing.id, 'Rejected')} className="rounded-full bg-red-500/15 px-3 py-2 text-xs font-medium text-red-200">Reject</button>
                  <button onClick={() => handleListingAction(listing.id, 'Pending')} className="rounded-full border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200">Pending</button>
                  <button type="button" onClick={() => handleListingDeletion(listing)} className="rounded-full border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">Delete listing permanently</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-bold text-white">Payments & disputes</h2>
          <div className="mt-4 space-y-3">
            {filteredPayments.length ? filteredPayments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="font-medium text-white">{payment.id}</span>
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${statusStyles(payment.status)}`}>{payment.status}</span>
                </div>
                <div className="mt-2 text-sm text-slate-400">{payment.buyer} → {payment.seller}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-cyan-300 font-semibold">₹{payment.amount.toLocaleString()}</span>
                  <span className="text-xs text-slate-400">{payment.type}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handlePaymentStatus(payment.id, 'Cleared')} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200">Clear</button>
                  <button onClick={() => handlePaymentStatus(payment.id, 'Disputed')} className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-red-200">Dispute</button>
                  <button type="button" onClick={() => handlePaymentDeletion(payment)} className="rounded-full border border-red-500/50 bg-red-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-red-200">Delete</button>
                </div>
              </div>
            )) : <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No payment records.</p>}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Dispute center</h2>
          <span className="text-sm text-cyan-300">{filteredDisputes.length} active cases</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDisputes.length ? filteredDisputes.map((dispute) => (
            <div key={dispute.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-white">{dispute.id}</div>
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${statusStyles(dispute.severity)}`}>{dispute.severity}</span>
              </div>
              <div className="mt-2 text-sm text-slate-300">{dispute.user}</div>
              <div className="mt-2 text-sm text-slate-400">{dispute.reason}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${statusStyles(dispute.status)}`}>{dispute.status}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleDisputeStatus(dispute.id)} className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-200">Resolve</button>
                  <button type="button" onClick={() => handleDisputeDeletion(dispute)} className="rounded-full border border-red-500/50 bg-red-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-red-200">Delete</button>
                </div>
              </div>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400 md:col-span-2 xl:col-span-3">No disputes.</p>}
        </div>
      </div>

      <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">OPXE digital store</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Only the OPXE Head can publish or remove products. Buyers contact OPXE through WhatsApp; confirm payment yourself and manually email the download file.</p>
          </div>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">{digitalProducts.length} products</span>
        </div>
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
          Manual fulfillment only: this page does not upload/store the downloadable file, collect payment, or send email automatically. Use the buyer&apos;s WhatsApp order and manually deliver the file to <a href={`mailto:${DIGITAL_STORE_EMAIL}`} className="font-semibold underline">{DIGITAL_STORE_EMAIL}</a>. WhatsApp: +{DIGITAL_STORE_WHATSAPP_NUMBER}.
        </div>

        <form onSubmit={handleDigitalProductSubmit} className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 md:grid-cols-2">
          <div>
            <label htmlFor="digital-product-title" className="mb-2 block text-sm text-slate-300">Product title</label>
            <input id="digital-product-title" required maxLength={100} value={digitalTitle} onChange={(event) => setDigitalTitle(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Study guide, template, e-book..." />
          </div>
          <div>
            <label htmlFor="digital-product-category" className="mb-2 block text-sm text-slate-300">Category</label>
            <select id="digital-product-category" value={digitalCategory} onChange={(event) => setDigitalCategory(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400">
              <option>Templates & Study</option>
              <option>E-books</option>
              <option>Design & Creative</option>
              <option>Software & Tools</option>
              <option>Other</option>
            </select>
            {digitalCategory === 'Other' && <input required maxLength={60} value={digitalOtherCategory} onChange={(event) => setDigitalOtherCategory(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Enter category" />}
          </div>
          <div>
            <label htmlFor="digital-product-price" className="mb-2 block text-sm text-slate-300">Price (INR)</label>
            <input id="digital-product-price" type="number" required min="1" max="10000000" step="1" value={digitalPrice} onChange={(event) => setDigitalPrice(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="499" />
          </div>
          <div>
            <label htmlFor="digital-product-image" className="mb-2 block text-sm text-slate-300">Product cover photo <span className="text-cyan-300">(required)</span></label>
            <input id="digital-product-image" type="file" accept="image/jpeg,image/png,image/webp" required={!digitalImage} onChange={handleDigitalImageSelection} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950" />
            <p className="mt-2 text-xs text-slate-400">JPG, PNG, or WEBP; max 8 MB. Compressed and saved in this browser.</p>
            {digitalImage && (
              <div className="mt-3 flex items-start gap-3">
                <ImagePreview src={digitalImage} alt="Digital product cover preview" width={240} height={160} thumbnailClassName="h-24 w-36 rounded-xl object-cover" />
                <button type="button" onClick={() => setDigitalImage('')} className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200">Remove photo</button>
              </div>
            )}
          </div>
          <div className="md:row-span-2">
            <label htmlFor="digital-product-description" className="mb-2 block text-sm text-slate-300">Product description</label>
            <textarea id="digital-product-description" required maxLength={1500} rows={5} value={digitalDescription} onChange={(event) => setDigitalDescription(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="What is included and what the buyer will receive after payment?" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950">Publish digital product</button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Published digital products</h3>
          {digitalProducts.length ? digitalProducts.map((product) => (
            <article key={product.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                {product.image && <ImagePreview src={product.image} alt={`${product.title} cover`} width={240} height={160} thumbnailClassName="h-20 w-28 shrink-0 rounded-xl object-cover" />}
                <div>
                  <div className="font-semibold text-white">{product.title}</div>
                  <div className="mt-1 text-xs text-slate-400">{product.category} · ₹{product.priceINR.toLocaleString('en-IN')} · Added {new Date(product.createdAt).toLocaleString()}</div>
                  <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-slate-300">{product.description}</p>
                </div>
              </div>
              <button type="button" onClick={() => handleDigitalProductRemoval(product)} className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10">Remove product</button>
            </article>
          )) : <p className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">No digital products yet. Add one above to display it in the public store.</p>}
        </div>
      </section>
    </main>
  );
}
