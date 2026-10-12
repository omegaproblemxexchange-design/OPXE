/*
  OPXE app shell note:
  - Purpose: Global application wrapper for the OPXE marketplace, including header navigation, footer, and site-wide layout.
  - Key behavior: public navigation routes to Home, Marketplace, AI Match, Dashboard, Delivery, Profile, and Notifications; the Head console is intentionally omitted.
  - Change log: Updated with premium dark styling, brand shell, and reusable footer content for the full app experience.
*/

import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import SessionActions from '@/components/SessionActions';
import ClerkProviderBoundary from '@/components/ClerkProviderBoundary';

export const metadata: Metadata = {
  title: 'OPXE | Omega ProblemX Exchange',
  description: 'Marketplace for exchange, lending, buying, selling, local pickup, and campus communities.',
};

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Digital Store', href: '/digital-products' },
  { label: 'AI Match', href: '/ai' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Delivery', href: '/delivery' },
  { label: 'Profile', href: '/profile' },
  { label: 'Notifications', href: '/notifications' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <ClerkProviderBoundary>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(46,123,246,0.2),transparent_28%),radial-gradient(circle_at_top_left,_rgba(77,215,255,0.18),transparent_20%),#020817]">
          <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-black text-slate-950 shadow-glow">
                  Ω
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-black tracking-tight text-white">OPXE</div>
                  <div className="truncate text-[9px] uppercase tracking-[0.15em] text-slate-400 sm:text-[10px] sm:tracking-[0.28em]">Omega ProblemX Exchange</div>
                </div>
              </Link>

              <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="transition hover:text-cyan-300">
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="shrink-0">
                <Link href="/help" className="hidden rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 sm:inline-flex">
                  Help centre
                </Link>
                <SessionActions />
              </div>
            </div>
            <nav aria-label="Mobile navigation" className="mx-auto flex min-w-0 max-w-7xl flex-nowrap gap-2 overflow-x-auto px-4 pb-3 text-xs text-slate-300 md:hidden sm:px-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="shrink-0 whitespace-nowrap rounded-full border border-slate-800 bg-slate-900/70 px-3 py-2 transition hover:border-cyan-400 hover:text-cyan-300">
                  {item.label}
                </Link>
              ))}
              <Link href="/post" className="shrink-0 whitespace-nowrap rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200">Post item</Link>
            </nav>
          </header>

          {children}

          <footer className="border-t border-slate-800 bg-slate-950/60">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 font-black text-slate-950">Ω</div>
                  <div>
                    <div className="text-lg font-black">OPXE</div>
                  </div>
                </div>
                <p className="text-sm text-slate-400">A browser-based marketplace for local exchange, campus listings, and delivery requests.</p>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Company</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li><Link href="/about">About</Link></li>
                  <li><Link href="/digital-products">Digital Store</Link></li>
                  <li><Link href="/contact">Contact</Link></li>
                  <li><Link href="/help">Help centre</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Legal</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li><Link href="/terms">Terms</Link></li>
                  <li><Link href="/privacy">Privacy</Link></li>
                  <li><Link href="/cancellation">Cancellation</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Reach</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li><a href="mailto:omegaproblemxexchange@gmail.com" className="hover:text-cyan-300">omegaproblemxexchange@gmail.com</a></li>
                  <li><a href="tel:+919515197745" className="hover:text-cyan-300">+91 95151 97745</a></li>
                  <li>Bengaluru, India</li>
                </ul>
              </div>
            </div>
          </footer>
        </div>
        </ClerkProviderBoundary>
      </body>
    </html>
  );
}
