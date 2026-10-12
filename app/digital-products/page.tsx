/*
  OPXE digital products note:
  - Purpose: Public catalog of OPXE digital products.
  - Key behavior: buyers provide an email and start a WhatsApp order; payment confirmation and file delivery are handled manually.
*/

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ImagePreview from '@/components/ImagePreview';
import { getAppStore, getCurrentUser, type AppDigitalProduct } from '@/lib/appStore';
import { DIGITAL_STORE_EMAIL, getDigitalProductWhatsAppUrl } from '@/lib/digitalProducts';

export default function DigitalProductsPage() {
  const [products, setProducts] = useState<AppDigitalProduct[]>([]);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadProducts = () => setProducts(getAppStore().digitalProducts);
    loadProducts();
    setBuyerEmail(getCurrentUser()?.email ?? '');
    setReady(true);
    const refreshTimer = window.setInterval(loadProducts, 30_000);
    window.addEventListener('storage', loadProducts);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('storage', loadProducts);
    };
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))), [products]);
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim());

  return (
    <main className="page-shell">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">OPXE Digital Store</div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">Digital items</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Browse digital products available from OPXE. Users can request a purchase; user accounts cannot publish products for sale.</p>
          </div>
          <Link href="/contact" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">Contact OPXE</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-amber-100">
          <div className="font-semibold">How purchase and delivery work</div>
          <p className="mt-1">Choose Buy via WhatsApp and send your email with the order request. OPXE will confirm payment manually and then send the download to that email. Checkout, payment verification, and automatic email/file delivery are not connected.</p>
          <p className="mt-2">Sales contact: <a className="underline" href={`mailto:${DIGITAL_STORE_EMAIL}`}>{DIGITAL_STORE_EMAIL}</a></p>
        </div>

        <div className="mt-6 max-w-xl">
          <label htmlFor="digital-buyer-email" className="mb-2 block text-sm font-medium text-slate-200">Email address to receive your download</label>
          <input
            id="digital-buyer-email"
            type="email"
            autoComplete="email"
            required
            value={buyerEmail}
            onChange={(event) => setBuyerEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
          <p className="mt-2 text-xs text-slate-400">Check the email carefully. It will be included in your WhatsApp order message.</p>
        </div>

        {!ready ? (
          <p className="mt-8 text-slate-400">Loading products...</p>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-700 p-8 text-center">
            <div className="text-lg font-semibold text-white">The digital store is getting ready</div>
            <p className="mt-2 text-sm text-slate-400">New digital items will appear here.</p>
          </div>
        ) : (
          <>
            {categories.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <a key={category} href={`#digital-category-${encodeURIComponent(category)}`} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 hover:border-cyan-400 hover:text-cyan-200">{category}</a>
                ))}
              </div>
            )}

            <div className="mt-8 space-y-10">
              {categories.map((category) => (
                <section key={category} id={`digital-category-${encodeURIComponent(category)}`} className="scroll-mt-28">
                  <h2 className="mb-4 text-xl font-bold text-white">{category}</h2>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {products.filter((product) => product.category === category).map((product) => (
                      <article key={product.id} className="flex flex-col rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                        <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-900/40 to-violet-500/20 text-5xl">
                          {product.image
                            ? <ImagePreview src={product.image} alt={`${product.title} product photo`} width={640} height={480} sizes="(max-width: 768px) 100vw, 33vw" thumbnailClassName="h-48 w-full cursor-zoom-in rounded-2xl object-cover" />
                            : <span aria-label="No product photo">◈</span>}
                        </div>
                        <div className="mt-4 flex-1">
                          <div className="text-xs uppercase tracking-[0.18em] text-cyan-300">{product.category}</div>
                          <h3 className="mt-2 text-xl font-bold text-white">{product.title}</h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{product.description}</p>
                        </div>
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div className="text-2xl font-black text-cyan-300">₹{product.priceINR.toLocaleString('en-IN')}</div>
                          <a
                            href={emailIsValid ? getDigitalProductWhatsAppUrl(product, buyerEmail) : undefined}
                            target="_blank"
                            rel="noreferrer"
                            aria-disabled={!emailIsValid}
                            onClick={(event) => { if (!emailIsValid) event.preventDefault(); }}
                            className={`rounded-full px-4 py-2.5 text-sm font-semibold ${emailIsValid ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:brightness-110' : 'cursor-not-allowed bg-slate-700 text-slate-400'}`}
                          >
                            Buy via WhatsApp
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        <p className="mt-8 border-t border-slate-800 pt-5 text-xs leading-5 text-slate-500">
          This catalog is saved in this browser and is not a secure online store. No card, UPI, payment, order tracking, or automatic download delivery is processed on this website.
        </p>
      </section>
    </main>
  );
}
