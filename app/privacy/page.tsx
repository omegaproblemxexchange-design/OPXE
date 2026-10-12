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
        <p className="mt-5 text-slate-300">This privacy page is informational only and is not a reviewed privacy notice. Profile and marketplace data are stored in this browser&apos;s local storage, which anyone with access to this browser profile may inspect. There is no central database or privacy/retention service. Do not enter real passwords, sensitive personal data, or private addresses.</p>
      </div>
    </main>
  );
}
