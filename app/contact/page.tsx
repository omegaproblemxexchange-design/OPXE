/*
  OPXE contact note:
  - Purpose: Support and communication page with business contact information.
  - Key behavior: shows the main email, phone number, and service location for user support.
  - Change log: included as a basic professional contact experience for the app.
*/

export default function ContactPage() {
  return (
    <main className="page-shell">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Contact</div>
        <h1 className="mt-3 text-3xl font-black text-white">Support and sales</h1>
        <div className="mt-6 space-y-3 text-slate-300">
          <div>Email: <a href="mailto:omegaproblemxexchange@gmail.com" className="break-all text-cyan-300 hover:underline">omegaproblemxexchange@gmail.com</a></div>
          <div>WhatsApp / Phone: <a href="https://wa.me/919515197745" className="text-cyan-300 hover:underline">+91 95151 97745</a></div>
          <div>Location: Bengaluru, India</div>
        </div>
      </div>
    </main>
  );
}
