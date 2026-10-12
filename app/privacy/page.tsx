/*
  OPXE privacy note:
  - Purpose: Privacy policy page for user trust and compliance messaging.
  - Key behavior: states that only necessary data is stored and personal data is not sold.
  - Change log: added to complete the legal page set and support a credible product experience.
*/

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-black text-white">Privacy policy</h1>
        <div className="mt-5 max-w-3xl space-y-4 text-slate-300">
          <p>This page is an interim privacy notice and has not been reviewed by a privacy professional. OPXE is a non-commercial beta; do not use it for sensitive personal information or urgent transactions.</p>
          <p>Clerk processes sign-in identity. OPXE stores account profile details, listings, exchange requests, notifications, and delivery request details in its PostgreSQL database. Delivery requests can include pickup and drop-off addresses. Listing photos are stored by the configured image provider. Authenticated APIs restrict account activity and delivery-address access to the signed-in account, but the full service has not completed an independent security or privacy review.</p>
          <p>OPXE does not currently process online payments or book couriers. Do not submit payment credentials, identity documents, passwords, or information that is not needed for an exchange or delivery request.</p>
        </div>
      </div>
    </main>
  );
}
