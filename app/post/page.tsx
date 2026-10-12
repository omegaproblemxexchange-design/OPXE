/*
  OPXE post listing note:
  - Purpose: Listing creation form for users who want to publish a need, item, request, or exchange offer.
  - Key behavior: collects listing details, attaches current user identity when available, and saves a pending listing into the local store.
  - Change log: turned into a working local submission flow with status tracking and successful publish feedback.
*/

'use client';

import { type ChangeEvent, useEffect, useState } from 'react';
import ImagePreview from '@/components/ImagePreview';
import SignInPrompt from '@/components/SignInPrompt';
import { deleteCloudinaryImage, uploadImageToCloudinary, type UploadedCloudinaryImage } from '@/lib/client/uploadImageToCloudinary';

const LISTING_CATEGORIES = [
  'Electronics',
  'Books & Study',
  'Furniture',
  'Clothing & Accessories',
  'Sports & Fitness',
  'Home & Kitchen',
  'Vehicles',
  'Other',
];
const MAX_LISTING_PHOTOS = 5;
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;

export default function PostPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [type, setType] = useState('NEED');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [otherCategory, setOtherCategory] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [price, setPrice] = useState('₹0');
  const [photos, setPhotos] = useState<UploadedCloudinaryImage[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/profile')
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!active) return;
        setIsSignedIn(response.ok);
        if (!response.ok && response.status !== 401) {
          const message = result && typeof result === 'object' && 'error' in result ? String(result.error) : 'Account service is unavailable.';
          setError(message);
        }
      })
      .catch((profileError: unknown) => {
        console.error('Unable to check the signed-in account before listing.', profileError);
        if (active) setError('Unable to reach the account service. Please try again.');
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => { active = false; };
  }, []);

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    if (photos.length + selectedFiles.length > MAX_LISTING_PHOTOS) {
      setError(`You can add up to ${MAX_LISTING_PHOTOS} photos.`);
      return;
    }

    setProcessingPhotos(true);
    setError('');
    try {
      const uploadResults = await Promise.allSettled(selectedFiles.map(async (file) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error(`${file.name}: Choose a JPG, PNG, or WEBP image.`);
        }
        if (file.size > MAX_UPLOAD_SIZE) throw new Error(`${file.name}: Each photo must be 8 MB or smaller.`);
        return { fileName: file.name, image: await uploadImageToCloudinary(file, 'listing') };
      }));
      const successfulUploads = uploadResults.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      setPhotos((current) => [...current, ...successfulUploads.map((upload) => upload.image)]);
      const failedUploads = uploadResults.flatMap((result, index) => result.status === 'rejected'
        ? [`${selectedFiles[index].name}: ${result.reason instanceof Error ? result.reason.message : 'Upload failed.'}`]
        : []);
      if (failedUploads.length) setError(failedUploads.join(' '));
    } catch (photoError) {
      const message = photoError instanceof Error ? photoError.message : 'Unable to process the selected photos.';
      setError(message);
    } finally {
      setProcessingPhotos(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Please enter a title and description before publishing.');
      setSubmitted(false);
      return;
    }
    if (!category) {
      setError('Please choose a category.');
      setSubmitted(false);
      return;
    }
    if (category === 'Other' && !otherCategory.trim()) {
      setError('Please enter the item category or name for Other.');
      setSubmitted(false);
      return;
    }
    if (photos.length < 3) {
      setError('Add at least 3 photos of your item before publishing.');
      setSubmitted(false);
      return;
    }

    setSubmitting(true);
    const response = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
      title: title.trim(),
      type,
      city: city.trim() || 'Bengaluru',
      price: price.trim() || '₹0',
      description: description.trim(),
      condition: 'Good',
      availability: 'Available now',
      category: category === 'Other' ? otherCategory.trim() : category,
      images: photos.map((photo) => photo.publicId),
      }),
    }).catch((requestError: unknown) => {
      console.error('Unable to submit the listing to the server.', requestError);
      return null;
    });
    if (!response) {
      setError('The server could not be reached. Your uploaded photos are still in your account storage; try submitting again.');
      setSubmitted(false);
      setSubmitting(false);
      return;
    }
    const result: unknown = await response.json();
    if (!response.ok) {
      const message = result && typeof result === 'object' && 'error' in result ? String(result.error) : 'Unable to publish this listing.';
      setError(message);
      setSubmitted(false);
      setSubmitting(false);
      return;
    }

    setError('');
    setSubmitted(true);
    setTitle('');
    setDescription('');
    setPrice('₹0');
    setCategory('');
    setOtherCategory('');
    setPhotos([]);
    setSubmitting(false);
  };

  if (!authReady) {
    return <main className="page-shell"><div className="text-slate-300">Checking your account...</div></main>;
  }

  if (!isSignedIn) {
    return (
      <main className="page-shell">
        {error
          ? <div role="alert" className="mx-auto max-w-2xl rounded-3xl border border-amber-500/30 bg-slate-900/70 p-8 text-center text-amber-100">{error}</div>
          : <SignInPrompt next="/post" title="Sign in to post a listing" description="Sign in or create an account before publishing an item or exchange request." />}
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Post listing</div>
        <h1 className="mt-3 text-3xl font-black text-white">Share item details</h1>

        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Listing type</label>
            <select value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400">
              <option>NEED</option>
              <option>HAVE</option>
              <option>BUY</option>
              <option>SELL</option>
              <option>BORROW</option>
              <option>LEND</option>
              <option>GIVE AWAY</option>
              <option>DONATION</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Title</label>
            <input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Product title" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Category</label>
              <select required value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400">
                <option value="" disabled>Select a category</option>
                {LISTING_CATEGORIES.map((listingCategory) => <option key={listingCategory}>{listingCategory}</option>)}
              </select>
              {category === 'Other' && (
                <input required maxLength={60} value={otherCategory} onChange={(event) => setOtherCategory(event.target.value)} className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Enter the item category or name" />
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Price</label>
              <input value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="₹0" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">City</label>
            <input required value={city} onChange={(event) => setCity(event.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Bengaluru" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Description</label>
            <textarea required maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="Describe your item or request" />
          </div>
          <div>
            <label htmlFor="listing-photos" className="mb-2 block text-sm text-slate-300">Item photos <span className="text-cyan-300">(minimum 3, maximum 5)</span></label>
            <input id="listing-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelection} disabled={processingPhotos || photos.length >= MAX_LISTING_PHOTOS} className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-semibold file:text-slate-950 disabled:opacity-50" />
            <p className="mt-2 text-xs text-slate-400">JPG, PNG, or WEBP; up to 8 MB each. Images upload to OPXE&apos;s Cloudinary storage.</p>
            {processingPhotos && <p role="status" className="mt-2 text-sm text-cyan-300">Uploading photos securely...</p>}
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {photos.map((photo, index) => (
                  <div key={photo.publicId} className="relative">
                    <ImagePreview src={photo.secureUrl} alt={`Listing photo ${index + 1}`} width={320} height={240} thumbnailClassName="h-24 w-full rounded-xl object-cover" />
                    <button type="button" onClick={async () => {
                      try {
                        await deleteCloudinaryImage(photo.publicId);
                        setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
                        setError('');
                      } catch (photoError) {
                        console.error('Unable to remove the unused uploaded listing photo.', photoError);
                        setError(photoError instanceof Error ? photoError.message : 'Unable to remove this uploaded photo.');
                      }
                    }} className="absolute right-1 top-1 rounded-full bg-slate-950/90 px-2 py-1 text-xs text-white" aria-label={`Remove photo ${index + 1}`}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            <p className={`mt-2 text-sm ${photos.length >= 3 ? 'text-emerald-300' : 'text-amber-200'}`}>{photos.length} of {MAX_LISTING_PHOTOS} photos selected{photos.length < 3 ? ` (${3 - photos.length} more required)` : ''}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
            Listings remain pending until the OPXE Head reviews them. Add clear, accurate photos so the Head can review the item.
          </div>
          <button
            type="submit"
            disabled={processingPhotos || submitting}
            className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
          >
            {processingPhotos ? 'Uploading photos...' : submitting ? 'Submitting...' : submitted ? 'Submitted for review' : 'Submit for review'}
          </button>
        </form>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {submitted && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Your listing was submitted and will remain pending until the OPXE Head reviews it.
          </div>
        )}
      </div>
    </main>
  );
}
