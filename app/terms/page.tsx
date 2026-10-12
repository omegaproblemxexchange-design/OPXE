/*
  OPXE terms note:
  - Purpose: Basic terms and conditions page for platform use.
  - Key behavior: covers truthful listings, user accountability, and general platform standards.
  - Change log: added to complete the legal/brand page set of the site.
*/

export default function TermsPage() {
  return (
    <main className="page-shell">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-black text-white">Terms of use</h1>
        <p className="mt-5 text-slate-300">This terms page is informational only, not a reviewed legal agreement. The app has no transaction, payment, messaging, identity-verification, or delivery service. Do not use it to arrange a real transaction or submit sensitive information.</p>
      </div>
    </main>
  );
}
