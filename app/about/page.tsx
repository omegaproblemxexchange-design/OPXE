/*
  OPXE about note:
  - Purpose: Company overview page for the OPXE ecosystem.
  - Key behavior: explains the mission and focus on local exchange trust, peer-to-peer connection, and safer community trade.
  - Change log: added to give the app a credible brand story and product identity.
*/

export default function AboutPage() {
  return (
    <main className="page-shell">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">About</div>
        <h1 className="mt-3 text-3xl font-black text-white">Omega ProblemX Exchange is built for local exchange.</h1>
        <p className="mt-5 max-w-3xl text-slate-300">OPXE stands for Omega ProblemX Exchange. It is a browser-based community marketplace for discovering useful items and arranging possible local exchanges: buying, selling, swapping, lending, borrowing, or donating. Listings and accounts are stored in this browser only; identity checks, payments, messaging delivery, and courier bookings are not connected.</p>
      </div>
    </main>
  );
}
