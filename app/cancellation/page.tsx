/*
  OPXE cancellation note:
  - Purpose: Refunds and cancellation policy page for transactions and service bookings.
  - Key behavior: explains that cancellations are evaluated before pickup/delivery confirmation and that refund outcomes depend on the transaction type.
  - Change log: added to complete the support and policy flow for the marketplace experience.
*/

export default function CancellationPage() {
  return (
    <main className="page-shell">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-black text-white">Cancellation and refund policy</h1>
        <p className="mt-5 text-slate-300">This app does not process payments, courier bookings, refunds, or real transactions. This information page is not a reviewed cancellation or refund policy; publish a legally reviewed policy before offering those services.</p>
      </div>
    </main>
  );
}
