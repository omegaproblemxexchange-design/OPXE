/*
  OPXE help centre note:
  - Purpose: Support and onboarding page for common user questions.
  - Key behavior: lists major user tasks like listing an item, sending requests, delivery requests, trust/safety, and disputes.
  - Change log: added to create a more complete service experience and reduce user confusion.
*/

export default function HelpPage() {
  return (
    <main className="page-shell">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Help centre</div>
        <h1 className="mt-3 text-3xl font-black text-white">How can we help?</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { title: 'Listing an item', detail: 'Open Post a listing, complete the details, and publish. New posts stay pending until the OPXE Head reviews them.' },
            { title: 'Sending exchange requests', detail: 'Open an approved item and select Send request. Sign in first. You can see your request status on the dashboard.' },
            { title: 'Responding to requests', detail: 'If someone requests one of your listings, sign in and review it from your dashboard. Accept or decline pending requests there.' },
            { title: 'Exchange notifications', detail: 'Listing owners receive a local notification for requests on their own account listings. Requesters receive a local notification when the owner or OPXE Head accepts or declines. These are not email, push, or cross-device messages.' },
            { title: 'Delivery booking', detail: 'Delivery requests are limited to 100 km (including exactly 100 km). Above 100 km, contact omegaproblemxexchange@gmail.com or +91 95151 97745. Courier options are preferences only; no courier is booked until a provider integration is configured.' },
            { title: 'Trust and safety', detail: 'Use Report listing on an item to add a report to this browser’s OPXE Head dispute queue. This does not send a server alert. Avoid sharing private details publicly.' },
            { title: 'Account setup', detail: 'Register with your name, email, city, phone, college/school, course/program, class/year, and a password. Your account and activity are stored in this browser; email and phone are not OTP-verified.' },
            { title: 'Disputes and support', detail: 'The OPXE Head can review submitted listing reports in the dispute center. For general assistance, email omegaproblemxexchange@gmail.com or WhatsApp +91 95151 97745.' },
            { title: 'Digital store purchases', detail: 'Only the OPXE Head can publish digital products. Enter your email on the Digital Store page and use Buy via WhatsApp to send your order request. Payment is confirmed manually; after verification, the OPXE Head emails the download to you. The app does not take payments or send files automatically.' },
          ].map((item) => (
            <details key={item.title} className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <summary className="cursor-pointer list-none font-semibold text-slate-200 marker:hidden">
                {item.title}<span className="float-right text-cyan-300 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.detail}</p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
