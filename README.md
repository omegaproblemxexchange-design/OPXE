# OPXE — Omega ProblemX Exchange

OPXE is a responsive marketplace built with Next.js and deployed as a non-commercial beta at [opxe-website.vercel.app](https://opxe-website.vercel.app). Its source is in the [public GitHub repository](https://github.com/omegaproblemxexchange-design/OPXE), connected to the Vercel project `opxe-website`. Clerk production authentication, Neon PostgreSQL in Singapore, and Cloudinary are configured. The Clerk sign-up/sign-in UI and `/__clerk` proxy endpoints have been smoke-tested. Profile, dashboard, saved-listing, exchange-request, notification, and delivery-request flows use database APIs; those authenticated flows still need a production account-based end-to-end test. Head-console workflows and digital-store catalog management retain prototype behavior. A Capacitor Android project has been generated, but no APK/AAB or signing setup is available yet.

The website calls the privileged administrator account the **Head**. The underlying app uses the technical `admin` role and `/admin` route; those implementation identifiers are unchanged. Payments and courier fulfillment remain manual via WhatsApp.

**Beta limitations:** full authenticated end-to-end testing, remaining workflow migrations, production legal/privacy review, Android SDK/signing keys, and Play Console submission are outstanding. Do not use this build to process real payments or store sensitive customer information.

## Current launch status

| Surface | Current implementation | What is still required |
| --- | --- | --- |
| Website | Non-commercial beta deployed through Vercel; local production build passes. | Verify the current production domain after deployment and complete authenticated end-to-end workflows. |
| Authentication | Clerk production instance and Vercel proxy are configured; sign-up/sign-in widgets and Clerk proxy endpoints load successfully. | Complete a real sign-up with email verification, then verify login, redirects, and Head authorization. |
| Listings | Homepage/marketplace reads and new listing creation use PostgreSQL APIs; production Neon database is migrated and Cloudinary is configured for signed uploads. | Test authenticated listing creation, uploads, approval, and moderation against production services. |
| Account workflows | Profile editing, dashboard listings/requests, saved items, exchange decisions, notifications, and delivery requests use authenticated database APIs. | Exercise these flows end-to-end against production services; migrate remaining Head and digital-product tools. |
| Android | Capacitor project generated under `android/`; no APK or AAB exists. | Set `CAPACITOR_SERVER_URL` to the live HTTPS site, sync, test with Android tooling, and sign with a user-controlled release keystore. |
| Payments and delivery | No online payment processing or courier booking is planned; payments are coordinated manually by UPI/WhatsApp. | Make the manual-only status clear in the UI and verify request handling; do not add checkout or payment-provider dependencies. |

### Provider setup and deployment

The initial deployment is already configured:

- **GitHub:** `omegaproblemxexchange-design/OPXE`, `main` branch.
- **Vercel:** project `opxe-website`; the latest app-code deployment verified in this setup is commit `62d6aae`. Pushes to `main` are intended for production deployments; check the Deployments page after each push.
- **Database:** Neon production project in Singapore. The migrations `0001_initial.sql` and `0002_cloudinary_image_urls.sql` have been applied.
- **Authentication:** Clerk production instance. The production Vercel domain uses Clerk's `/__clerk` proxy, wired through `components/ClerkProviderBoundary.tsx` and `middleware.ts`.
- **Images:** Cloudinary credentials are configured as server-side Vercel environment variables.
- **Application:** `NEXT_PUBLIC_APP_URL` is set to the live HTTPS website URL.

The launch setup also removed the seeded demo Head credentials, added server-backed listing save/request/report actions, added the PostgreSQL migration runner and schema, and prepared the Capacitor Android scaffold. Clerk's Core 3 sign-in component incompatibility was fixed, then the production `/__clerk` proxy route was added after the live sign-up form failed to load Clerk. The corrected production sign-up and sign-in widgets and their Clerk proxy requests were verified in the browser. Public routes and APIs were smoke-tested. This does not mean a real email verification or every signed-in workflow has been end-to-end tested.

The provider credentials live in Vercel's Environment Variables settings and in a local ignored `.env.local` where needed. Do not copy secrets into source files, chat, screenshots, or Git commits. For local setup, use `.env.example` as a variable-name reference and obtain credentials directly from the provider dashboards. Never expose server credentials with a `NEXT_PUBLIC_` prefix.

For a new database schema change, add a new numbered SQL migration; never edit an already-applied migration. Review the change, back up production data where appropriate, test on a development database first, then apply migrations deliberately. Do not run the production migration command casually as part of a routine website push.

### Publishing future website changes

The Vercel project is connected to the GitHub `main` branch. A successful push to `main` should create a production deployment; verify it in the Vercel project before assuming the change is live.

1. Make and test the change locally. In PowerShell on Windows, use `npm.cmd` if the `npm` command is blocked by script execution policy:

   ```powershell
   npm.cmd run lint
   npm.cmd run build
   ```

2. Review exactly what will be committed. Stage only the intended source/documentation files; do not use `git add .` blindly, and never stage `.env.local`, database URLs, API keys, or other secrets.

   ```powershell
   git status
   git add path\to\changed-file.tsx
   git diff --cached
   git commit -m "Describe the change"
   ```

   For multiple intended files, give each path to `git add`. Check that `.env.local` is ignored and absent from the staged diff.

3. Push the commit to the production branch:

   ```powershell
   git push origin main
   ```

4. Open the Vercel project **opxe-website → Deployments** and confirm the deployment for the new commit reaches **Ready**. Then open [opxe-website.vercel.app](https://opxe-website.vercel.app) and test the changed page or workflow.
5. If no deployment appears, or the build fails, inspect the deployment status and logs in Vercel. Fix the reported issue and push another commit, or manually redeploy the intended latest `main` commit from Vercel. A successful Git push alone does not prove that the live deployment succeeded.

Production environment variables are managed separately in Vercel and are not included in Git pushes. If a change requires a new secret or setting, add it to the correct Vercel environment and redeploy; never commit the value.

The HTTPS website is live; the Android scaffold can use `https://opxe-website.vercel.app` as its site URL when Android development resumes. Android SDK setup, APK/AAB generation, release signing, and Play Console submission remain outstanding. Keep release signing keys private and backed up.

Provider secrets are stored in deployment settings and are not committed to this repository. Android SDK setup, release signing, and Play Console submission have not been performed.

The migration runner records each applied file and checksum in `public._opxe_schema_migrations`, serializes concurrent runs with a PostgreSQL advisory lock, and applies each file in a transaction. Applied migration files must not be edited; add a new numbered SQL migration for later schema changes.

## Contents

- [Product overview](#product-overview)
- [Technology and architecture](#technology-and-architecture)
- [Runtime commands](#runtime-commands)
- [Pages and routes](#pages-and-routes)
- [How the main workflows work](#how-the-main-workflows-work)
- [Head control center](#head-control-center)
- [Data model and persistence](#data-model-and-persistence)
- [Project file guide](#project-file-guide)
- [Database-backed features and remaining migration](#database-backed-features-and-remaining-migration)
- [Head access](#head-access)
- [Security, privacy, and production limitations](#security-privacy-and-production-limitations)
- [Production work still required](#production-work-still-required)

## Product overview

OPXE supports listings that represent an item someone has, wants, is selling/buying, can lend/borrow, wants to swap, or is giving away/donating. The intended flow is:

1. Browse the approved marketplace feed.
2. Search by words, listing type, city scope, and price range.
3. Open a listing to see its owner label, location, price, condition, availability, and description.
4. Sign in and send an exchange request, save the listing, or report it.
5. Review requests and listings from the personal dashboard.
6. Submit a new listing. New listings begin in `Pending` moderation and only appear in the public marketplace after approval.
7. The OPXE Head reviews users, listings, exchange and delivery requests, payments, and disputes in the hidden-from-navigation control center.

The interface uses a dark visual theme with listing/category shortcuts, horizontally scrollable mobile navigation and filters, and responsive layouts that reflow cards and forms for small screens. Wide Head tables stay inside their own horizontal scroll containers.

## Technology and architecture

| Area | Implementation |
| --- | --- |
| Web framework | Next.js 15 App Router |
| UI | React 18 and TypeScript |
| Styling | Tailwind CSS 3, global rules in `app/globals.css` |
| Routing | File-system routes under `app/` |
| Initial content | No sample listings, payments, or disputes |
| Current data | Public listings, listing creation/actions, profile, dashboard requests, notifications, and delivery requests use authenticated database APIs; Head console and digital-product workflows still need migration |
| Authentication | Clerk production UI and server identity integration; Clerk proxies through `/__clerk` on Vercel |
| Database | Neon PostgreSQL production database with the current migrations applied; selected listing APIs use it |
| Image storage | Signed Cloudinary listing upload integration; provider credentials are configured in Vercel |
| Android | Capacitor configuration and Android project scaffold generated; no APK/AAB or release signing |
| External services | Payments and courier booking are not connected; WhatsApp/manual handling only |

Most interactive routes are client components (`'use client'`) rendered through Next.js App Router. Account-owned profile, dashboard, saved-listing, notification, exchange-request, and delivery-request data is loaded and changed through authenticated server APIs. The Head console and digital-product workflows still include prototype/browser-local behavior.

### Runtime commands

Requirements: Node.js 18.18 or later and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is occupied, Next.js will report another local port; use the URL printed by the command.

Useful commands:

```bash
npm run build
npm run start
npm run lint
```

`npm run start` serves a previously generated production build; run `npm run build` first. On Windows where PowerShell blocks the `npm.ps1` shim, use `npm.cmd run dev`, `npm.cmd run build`, etc. The installed local Next.js executable can also be run as `node .\node_modules\next\dist\bin\next dev`.

## Pages and routes

| Route | Page | Purpose and behavior |
| --- | --- | --- |
| `/` | OPXE home page | Loads public approved listings and aggregate counts through server APIs when the database is configured. |
| `/marketplace` | Marketplace feed | Loads approved/active listings from PostgreSQL; search, listing-type, story, city, and price filters run in the browser. |
| `/digital-products` | OPXE Digital Store | Public catalog of available digital products, including product cover photos. Buyers provide an email and click Buy via WhatsApp to start an order with the product details and buyer email prefilled. Payment confirmation and download delivery must be handled manually; the app does not store downloadable product files, take payment, or automatically email downloads. |
| `/listing/[id]` | Listing detail | Loads public listing data and Cloudinary photos through the database API. Signed-in users can send a request, save/unsave the listing, or submit a report through authenticated database APIs. Sent requests, saved items, and owner decisions are available in the database-backed dashboard/profile; Head report moderation UI remains prototype/local. |
| `/login` | Sign-in | Uses Clerk when configured; otherwise displays provider setup guidance. |
| `/register` | Registration | Uses Clerk when configured; profile completion and redirect flows still require end-to-end verification. |
| `/post` | Create listing | Requires an authenticated account and configured services; uploads 3–5 photos to Cloudinary and creates a pending PostgreSQL listing. |
| `/dashboard` | Personal activity | Loads the signed-in user's listings, pending-approval count, sent requests, and incoming requests from PostgreSQL. Listing owners can accept or decline pending requests; the decision and requester notification are written transactionally. |
| `/profile` | Profile and activity | Loads profile details, saved listings/photos, owned listings, and sent-request activity from PostgreSQL. Name/city/phone/education fields can be edited through the authenticated profile API; email and role cannot be edited here. Saved listings can be removed through the listing action API. Email verification comes from Clerk; phone is not verified. |
| `/notifications` | Notification center | Requires sign-in. Loads notifications only for the signed-in account and stores read state in PostgreSQL. Supports mark-one and mark-all read. Exchange request creation and owner decisions generate durable notifications. Head messaging still needs migration; notifications are not real-time. |
| `/ai` | Smart matching | Tokenizes the text into unique alphanumeric words longer than two characters and ranks approved local listings by the proportion of words present in each listing's text. This is deterministic browser keyword matching, not an AI service. A match card opens its listing. |
| `/delivery` | Delivery estimate/request | Accepts positive distance up to and including 100 km and estimates `max(₹80, ₹40 + ₹12/km)`. Signed-in users can save a product, pickup/drop-off addresses, and courier preference in their account; these addresses are returned only to that account. Requests do not book a courier or charge payment. Above 100 km, the request form is replaced by support email, phone, and Help Centre links. |
| `/admin` | Head control center | Not linked in public navigation. The client UI checks the current browser user's internal admin role (displayed as Head) and shows access denied otherwise. It has clickable metric drill-downs, user/listing/payment/dispute filters and moderation controls, local password change/reset, full browser-data backup/restore, request actions, local private notifications, delivery request details, CSV export, and a digital product manager. Direct route and client checks are not security controls. See [Head details](#head-control-center). |
| `/help` | Help centre | Expandable, static guidance about listing, digital purchases, sending/responding to requests, delivery limit, account setup, and reports/disputes; OPXE support email and WhatsApp are listed. |
| `/about` | About | Static description of OPXE and its current database-backed user flows and prototype limitations. |
| `/contact` | Contact | Displays the OPXE sales/support email, WhatsApp number, and Bengaluru location; links open email or WhatsApp. |
| `/terms` | Terms | Static informational disclaimer, not a legal agreement. |
| `/privacy` | Privacy | Interim notice describing Clerk, PostgreSQL profile/request data, image hosting, and the beta's privacy limitations; it is not a reviewed privacy policy. |
| `/cancellation` | Cancellation | Explains that the app processes no real payment, booking, refund, or cancellation. |
| Not found | 404 | Next.js not-found experience with a route back to marketplace. |

### Shared shell

`app/layout.tsx` supplies global metadata, fonts/theme classes, header, navigation, session controls, mobile navigation, and footer. The Head console is deliberately omitted from both public navigation bars. `components/SessionActions.tsx` shows Login for a guest; when a browser session exists it shows the user profile shortcut and Logout.

The homepage's listing shortcuts, approved listing cards, category counts, and headline counts are loaded from the current browser store and refresh on a 30-second timer or when another tab changes the store. They are clickable and open listing details, category-filtered marketplace results, registration, or listing submission. Counts reflect only records in this browser; they are not global, cross-device, or server-realtime activity. The global footer includes company, help, legal, digital store, and contact links.

## How the main workflows work

### Account creation and sign-in

- Registration validates required fields in the browser, checks the browser's email/phone input formats and duplicate email, stores a new regular user, creates the local session, and redirects to a safe local `next` route or `/dashboard`.
- Sign-in compares the entered email/password with the locally stored user list and stores the selected user as the current browser session.
- The session is resolved against the local user record; Head sign-in redirects to `/admin`, while a regular account returns to a safe requested route or `/dashboard`.
- Logout removes the current browser session and the compatibility role key.
- The Head can change their own local password and set a new local password for another account; the Head cannot view existing passwords. There is no email-based self-service reset, email confirmation, phone OTP, or session expiry flow.
- These are local-browser conveniences; they are not server sessions or secure authentication.

### Listings and moderation

- New browser stores start without starter listings, sample payments, sample disputes, or sample notifications. When an older store is loaded, known starter listing/payment/dispute IDs and the old sample account are removed; saved references to those starter listings are also cleaned up. User-created records are retained.
- The listing form provides preset categories and requires a custom category/item name when `Other` is selected.
- User listings require at least three JPG, PNG, or WEBP photos (maximum five, 8 MB per original file). The browser compresses them before storing their data URLs with listing records in `opxe_store_v1`; this is browser storage, not durable image hosting.
- New user listings start as `Pending` and are not public while pending.
- Marketplace results only include `Approved` and `Active` records; rejected and pending records are not offered to regular users.
- The Head can inspect submitted listing photos and mark a listing `Approved`, `Pending`, or `Rejected`. Manual approval does **not** mean the product, seller, ownership, or identity has been independently verified.
- Listings remain pending until the Head reviews them. No timed or AI-based automatic approval is implemented.
- Listing fields include title, type, city, price, description, condition, availability, category, optional uploaded photo data, seller display name, optional stable owner ID, moderation status/review marker, creation time, and distance label. New listings have a stable local owner ID; existing legacy records may only have seller labels.
- Marketplace search is a case-insensitive substring across title, description, city, type, category, and price. Type buttons match the exact type. The city filter uses exact case-insensitive city equality and takes its default reference city from the signed-in profile (or Bengaluru); it does not calculate a radius. Price filtering extracts the first digit sequence from the price text, so text such as `Free` is treated as zero and a swap price uses its first amount. Category links seed the search box. `Deals` selects donation listings; the other story pills set a corresponding search term.
- Marketplace cards and listing details show uploaded photos when available. Listings without photos use a neutral visual placeholder. Listing matching is not personalized.

### Digital store and manual fulfillment

- The public catalog lives at `/digital-products`; it reads `digitalProducts` from `opxe_store_v1`. Product records contain title, description, category, compressed cover photo, INR price, creation time, and the Head account ID that published them.
- Head product creation requires one JPG, PNG, or WEBP cover photo (up to 8 MB before browser compression). The preview is visible in the Head console form and each cover appears on the public product card. This cover is separate from, and does not contain, the downloadable product file.
- The `/admin` Digital Store section is the only app UI for adding/removing products. Store helper functions require the current local account to have the internal `admin` role (displayed as Head). Regular users can browse and initiate purchase requests, but cannot publish products through the app.
- Buyers enter an email address (pre-filled from their local session when signed in). Buy via WhatsApp opens `https://wa.me/919515197745` with product ID/title/price, buyer email, and manual payment/delivery expectations in the message.
- Sales and support email is `omegaproblemxexchange@gmail.com`; the sales contact number is +91 95151 97745.
- Fulfillment must be handled manually: OPXE contacts the buyer in WhatsApp, verifies payment outside the app, then manually emails the digital download. The app does not contain or upload the downloadable file, accept payments, create a paid-order record, or send email/download links.
- Digital products and role checks are browser-local prototype data, not protected server-side. A production store requires server authorization, persistent storage, protected file hosting with expiring access, and a transactional email service. Payments remain manual UPI/WhatsApp; no payment provider or webhook is required.

### Exchange requests

- A signed-in user can request another user's listing. The app blocks a request if the user is not signed in, the item is missing, the requester is the listing owner, or they already have an active request for the same item.
- Requests are stored with listing ID/title, requester name/email, timestamp, and `Pending`/`Accepted`/`Declined` status.
- The requester sees their sent request in their dashboard. The owner sees incoming requests in their dashboard and can accept or decline. The Head can also moderate requests from `/admin`.
- Creating an exchange request writes a recipient-scoped database notification to the listing owner. Accept/decline from the owner dashboard writes a status notification to the requester in the same transaction. Older seed listings without a registered owner ID cannot receive owner notifications.
- Request state is account-owned in PostgreSQL, but acceptance is not a payment or completed transaction. There is no messaging or email negotiation service.
- Owner checks use the authenticated database owner ID; no seller-name fallback grants access.

### Saved items and reports

- Save and remove operations use authenticated listing APIs and account-owned `saved_listings` rows.
- Report adds an open dispute record with the listing reference and a reason.
- The dispute appears in the Head dispute center and can be marked resolved.
- Saved-listing ownership is enforced in PostgreSQL. Head dispute visibility and management still need a server-backed console.

### AI matching

- The match page splits the prompt into unique words longer than two characters.
- For each approved listing it counts matching words across title, description, category, type, and city.
- Score = matching words divided by prompt words, expressed as a percentage; highest scores appear first.
- This helps exercise the UI without external services. It is not generative AI, semantic search, location intelligence, or a trained recommendation engine.

### Delivery request

- The form validates the positive distance bound (the UI only exposes it through 100 km), product, pickup address, delivery address, and courier preference; the API enforces the same limits.
- The fee is rounded up to a whole rupee after applying `max(80, 40 + 12 × distanceKm)`.
- Requests are stored in PostgreSQL and visible only to the requesting account; they are marked as requested, not booked. Pickup/drop-off details are personal data.
- No live address lookup, road-distance calculation, provider serviceability query, booking, tracking, courier status, payment, or cancellation exists. Above 100 km, support contact links are shown and no request can be submitted.

## Head control center

### Visibility and current gate

- The `/admin` link has been removed from desktop and mobile public navigation.
- The Head console is still available at `/admin`; hiding a link does not make a URL secret. A regular browser session receives a “Head access only” page.
- Signing in with the local Head account redirects to `/admin`. The Head can also reach it through the Head-only shortcut on the dashboard.
- Head logout clears the browser session and returns to sign-in.
- The gate is client-side and uses data editable by the browser user. It is suitable only for demonstrating navigation and workflows—not for protecting real user data.

### Data and counts shown

The dashboard derives its headline totals from the current browser's saved store. Each headline metric is clickable and opens a drill-down:

- Total users and number of manually reviewed profiles.
- Total listings, approved/active listings, pending moderation, and rejected listings.
- Open disputes, total exchange requests, and total local delivery requests.
- Total payments and disputed payments.
- Head-console alerts for pending listings, open disputes, unanswered requests, and unverified profiles.

The users drill-down shows name, email, phone, city, college/school, course/program, class/year, profile-review flag, email/phone OTP state, role, account status, account creation date, and per-user listing/request counts. The administrator role is labeled **Head** in the website; internally it remains `admin`. Contact actions open an email, telephone, or WhatsApp handler using the contact details the user supplied; they do not send messages from OPXE servers. The private notification composer writes a recipient-email-targeted browser record that the matching account sees on `/notifications` in this browser. Exchange request creation and status changes also add notifications for the matching local account. These notifications are not secure or cross-device delivery. The user table shows name, email, role, profile review, account status, city, joined date, listing count, and management actions. It can filter by role, profile review, and account status. The Head can block an account (reversible), ban it (also reversible through Restore), restore either status, or permanently delete a non-owner account. Blocked/banned accounts cannot log in or use account-gated actions. The permanent-delete button requires a browser confirmation and exact email entry; it removes the account, its clearly-associated listings, related exchange/delivery requests, saved references, disputes linked by its unique name or deleted listing IDs, and inbox notifications from this browser. The owner Head and currently signed-in Head are protected. Passwords are never rendered in the Head console or CSV report.

The Head can change their own password after entering the current password, or set a new password for another account. Existing passwords are never displayed, and reset passwords are not emailed; the Head must share the new password privately. These are browser-only prototype controls, not secure production password management.

The full-data backup downloads the current browser's account and marketplace store plus notifications. Restore replaces current browser data and requires typing `RESTORE`. Passwords and active sessions are excluded; accounts already present in the destination browser keep their existing passwords, while accounts not present there must have their passwords reset by the Head. A backup contains personal profile, listing, and notification data; keep it private. This does not back up or change a PostgreSQL database.

The Head cannot change the production database connection from this prototype UI. The production Neon connection is configured in Vercel's server-side environment settings; changing it is an infrastructure operation, not a client-side setting. Never expose connection strings or credentials in client code or browser storage.

The listings drill-down shows each listing's ID, title, owner label, type, category, price, condition, city, distance, availability, date, full description, moderation status, and approve/reject/public-view actions. Selecting approved, pending, or rejected listing cards narrows this detail view to that status. Request, dispute, payment, and disputed-payment metrics link to their full detail panels further down the Head console.

The listing review area shows title, seller label, category, type, city, condition, availability, created date, price, description, moderation state, and submitted photos. The Head can approve, reject, or return a listing to pending review. The Head can permanently delete any listing in any status, including rejected/pending listings or completed/sold listings. Deletion removes the listing and its locally stored photos, related exchange requests and listing reports, plus saved-listing references from this browser; the UI asks for confirmation first.

Additional panels show request participants/status/time, any locally stored payment entries, and dispute reporter/reason/severity/status. No sample payment or dispute entries are preloaded. The Head can accept/decline requests, change a payment entry's local status, delete payment and dispute entries, and resolve a dispute. These controls only change this browser's records. Delivery request details include account email, product, both address texts, distance, estimate, courier preference, status, and time; this can contain sensitive data even though it is only stored locally. Export report downloads a CSV covering users (without passwords), listings, requests, payments, delivery requests, and disputes. CSV fields are quoted and formula-like cell values are prefixed to reduce spreadsheet formula injection risk. Keep exports private and delete them when no longer needed.

### User/profile verification meaning

`verified` is a Boolean **manual profile-review flag** on a user record. The Head can toggle it and filter users by reviewed/not reviewed. Separate `emailVerified` and `phoneVerified` fields stay false unless an OTP verification integration is built; the current app has no such integration. Nothing checks government ID, phone/email ownership, face matching, address, business registration, or any external authority. Listing moderation status, manual profile review, and real contact/identity verification are separate concepts.

## Data model and persistence

`lib/appStore.ts` defines and manages:

- `AppUser`: ID, name, email, browser-stored plaintext password, city, phone, college, course, class/year, role (`admin` internally, displayed as Head; `user`; `premium`), account status (`active`, `blocked`, `banned`), profile-review flag, email/phone OTP flags, and creation date. Existing records without account status migrate to `active`. The plaintext password must be replaced with password hashing or managed authentication before connecting real users.
- `AppListing`: ID, optional stable `ownerId`, title, exchange type, city, price text, description, condition, availability, category, seller display label, moderation status, creation date, and distance text. New listings set `ownerId`; old showcase records use a seller-name fallback for dashboard/profile ownership.
- `AppDigitalProduct`: ID, title, description, category, optional compressed cover-photo data URL, INR price, creation date, and publishing Head account ID. New products require a photo; optionality only preserves older records.
- `AppPayment`: ID, buyer/seller labels, amount, type, and status (`Cleared`, `Pending`, `Disputed`).
- `AppDispute`: ID, reporting user, reason, severity, and status (`Open`, `Resolved`).
- `AppRequest`: ID, listing ID/title, requester name/email, date, and status (`Pending`, `Accepted`, `Declined`).
- `AppDeliveryRequest`: ID, user email, product, pickup/drop-off address text, distance, preferred courier, estimated fee, `Request saved - courier not booked` status, and creation time.
- `savedListingIdsByUser`: listing IDs keyed by normalized account email in browser storage; `savedListingIds` remains as a legacy migration field.

The store is serialized in `localStorage` under `opxe_store_v1`; the current signed-in user is under `opxe_session`. Notifications and private Head messages use `opxe_notifications_v1`; no sample notifications are inserted. A compatibility key called `opxe_role` is also cleared on logout. A missing main store is initialized with empty collections and a local Head account, and older known starter records are removed during migration. Clearing browser site data removes local changes. Another browser or device has a separate store; there is no shared account data. The browser storage is not encrypted and should contain no sensitive data. Full-data backup/restore is available in the Head console; it intentionally excludes passwords and sessions.

## Project file guide

| Path | Responsibility |
| --- | --- |
| `app/layout.tsx` | Application shell, metadata, navigation, footer, global stylesheet import. |
| `app/globals.css` | Global styles, page-shell rules, shared visual tokens/utilities. |
| `app/page.tsx` | Home page and local marketplace discovery. |
| `app/marketplace/page.tsx` | Public listing discovery, local search and filters, listing cards. |
| `app/digital-products/page.tsx` | Public digital catalog and WhatsApp purchase hand-off. |
| `app/listing/[id]/page.tsx` | Listing details and request/save/report actions. |
| `app/login/page.tsx` | Clerk sign-in widget and post-login redirect. |
| `app/register/page.tsx` | Clerk sign-up widget and post-registration redirect. |
| `app/post/page.tsx` | New listing form; creates pending listings. |
| `app/dashboard/page.tsx` | Personal listings and sent/received request management. |
| `app/profile/page.tsx` | Profile editing and personal activity. |
| `app/notifications/page.tsx` | Signed-in user's notification list and private Head-message visibility/read state. |
| `lib/notifications.ts` | Validated browser-local notification storage and recipient-targeted notification helper shared by exchange requests, Head messaging, and the notification center. |
| `app/ai/page.tsx` | Local keyword-based listing ranking. |
| `app/delivery/page.tsx` | 100 km distance limit, quote, optional browser-local delivery request, and above-limit support links. |
| `app/admin/page.tsx` | Head UI gate, clickable counts/drill-downs, user management and local message composer, reversible block/ban/restore and confirmed permanent deletion, listing moderation, digital product manager, exchange/delivery request review, payment/dispute controls, safe CSV export. |
| `lib/digitalProducts.ts` | Official digital-store WhatsApp/email contact details and pre-filled purchase-message builder. |
| `app/help/page.tsx` | Expandable workflow/support guidance. |
| `app/about/page.tsx` | Product information. |
| `app/contact/page.tsx` | Contact information and email/telephone links. |
| `app/terms/page.tsx` | Terms information page. |
| `app/privacy/page.tsx` | Privacy information page. |
| `app/cancellation/page.tsx` | Cancellation information page. |
| `app/not-found.tsx` | Not-found route experience. |
| `components/SessionActions.tsx` | Header sign-in/profile/logout controls backed by Clerk when configured. |
| `components/SignInPrompt.tsx` | Shared account-required prompt with links back to the requested page after sign-in or registration. |
| `lib/appStore.ts` | Types, initial state, browser persistence, registration/sign-in, listing and Head-only digital product create/remove, request/report/save, and delivery-request functions. |
| `lib/notifications.ts` | Browser-local notification storage, record validation, and recipient notification helper. |
| `lib/server/db.ts` | Server-only PostgreSQL connection pool and transaction helper; does not expose credentials to browser code. |
| `database/migrations/0001_initial.sql` | Initial PostgreSQL schema for accounts/identities, listings/media, requests, digital items/orders, saved items, disputes, notifications, delivery, payments, and audit records; applied to the production Neon database. |
| `database/migrations/0002_cloudinary_image_urls.sql` | Adds Cloudinary image URL support; applied after the initial migration. |
| `package.json` | Project scripts and dependency versions. |
| `.env.example` | Documents the server-only PostgreSQL connection variable without credentials. |
| `next.config.mjs` | Next.js configuration. |
| `tailwind.config.ts` | Tailwind theme and content configuration. |
| `postcss.config.js` | PostCSS plugins used by the Tailwind build. |
| `tsconfig.json` | TypeScript compiler configuration and import aliases. |

## Database-backed features and remaining migration

The app uses a **mixed persistence model**, not a fully database-backed marketplace. Production Neon PostgreSQL is configured, its migrations are applied, Clerk provides authentication, and listing/profile/dashboard/saved-item/exchange-request/notification/delivery APIs use authenticated server routes. Cloudinary handles signed listing image uploads. A server-only `pg` pool helper is in `lib/server/db.ts`. The Head console, digital products/orders, disputes/payments management, and some informational/demo surfaces still rely on browser-local prototype data; migrate these through authorized server APIs rather than adding database calls directly into React components.

### 1. Production database setup already completed

1. The production PostgreSQL database is Neon, hosted in Singapore. `DATABASE_URL` is configured as a Vercel secret and in the ignored local `.env.local`; the actual connection value must never be placed in this README or Git.
2. The migration runner has applied `0001_initial.sql` and `0002_cloudinary_image_urls.sql` to production. The migrations define the schema but do not import legacy browser `localStorage` records.
3. For future schema work, use a separate development database, add a new numbered migration, test it there, and plan production backup/rollout. Do not edit migrations that have already been applied.
4. Continue building typed repositories under `lib/server/repositories/` on top of `lib/server/db.ts`. Neither the database client nor connection string may be imported into client components.
5. Do not rely on browser data or the local Head account as production data.

### 2. Schema included in the initial migration

The initial migration creates:

- `users` and `auth_identities`: normalized unique account email, app role/status, profile/review flags, and a provider/subject mapping. Clerk handles credentials; passwords and provider tokens are intentionally not stored in this app schema.
- `listings` and `listing_images`: listing owner/moderation data plus image object keys and metadata. Image bytes belong in object storage, not PostgreSQL or browser local storage. Database triggers require at least three registered images for approved/active listings and prevent removing photos below that minimum.
- `digital_products`, `digital_product_images`, `digital_product_assets`, and `digital_orders`: public product metadata/cover references, private downloadable-file references, and order/payment/fulfillment state. A WhatsApp hand-off is not proof of payment.
- `exchange_requests`, `saved_listings`, `disputes`, `notifications`, and `delivery_requests`: account-owned workflows with relational IDs, state, timestamps, and indexes.
- `payments` and `audit_logs`: payment references/status and administrative-action audit details. Application/database permissions must prevent unauthorized edits; the schema alone does not enforce Head authorization or append-only audit behavior.

The migration uses foreign keys, constraints, partial indexes for active exchange requests, and common owner/status/date indexes. App routes must still enforce server-side authorization and use transactions for multi-record state changes. Do not use email or display name as a relational key.

### 3. Add a server data-access layer and authenticated API

- **Create** domain repositories such as `lib/server/repositories/users.ts`, `listings.ts`, `requests.ts`, `notifications.ts`, and `delivery.ts`. These own database queries and return typed records.
- **Create** route handlers under `app/api/`, for example `app/api/auth/register/route.ts`, `login/route.ts`, `logout/route.ts`, and feature routes `app/api/listings/route.ts`, `app/api/listings/[id]/route.ts`, `app/api/requests/route.ts`, `app/api/profile/route.ts`, `app/api/notifications/route.ts`, and `app/api/admin/**/route.ts`. Validate request bodies on the server, return explicit status/errors, and authorize every read/write using the server session. Hiding UI controls is not authorization.
- **Create** a server authentication/session helper such as `lib/server/auth.ts`. Use a proven auth provider or secure password hashing, secure HTTP-only cookies, expiry/revocation, CSRF/origin protections as appropriate, and server role checks. The browser must never set its own admin role.
- Add pagination, filtering, rate limits, and safe error logging to list/search/admin endpoints. Admin endpoints must check admin authorization individually. Users can access only their own profile, saved listings, requests, notifications, and delivery requests unless an explicitly authorized admin action applies.

### 4. Replace browser-only calls feature by feature

Use `lib/appStore.ts` as the **migration reference**, not as the production database adapter. It currently owns data types, localStorage reads/writes, registration/login, and listing/request/save/report/delivery workflows. Remove browser writes of authoritative data once the matching API is ready.

| Feature | Existing UI/caller files to update | New server-side work |
| --- | --- | --- |
| Account and session | `app/register/page.tsx`, `app/login/page.tsx`, `components/SessionActions.tsx`, `components/SignInPrompt.tsx`, `lib/appStore.ts` | Auth routes, password hashing/provider, secure session and logout; redirect only after server-confirmed login. Keep `next` redirects restricted to safe same-site paths. |
| Profile | `app/profile/page.tsx` | `/api/profile` GET/PATCH; validate fields, check uniqueness/ownership, record verification state from a real verification process. |
| Browse/search listings | `app/marketplace/page.tsx`, `app/listing/[id]/page.tsx`, `app/ai/page.tsx`, `app/page.tsx` | Listing read/search routes; public responses must exclude private contact and moderation-only fields. Replace seed-only matching with approved database results. |
| Create/moderate listings | `app/post/page.tsx`, `app/admin/page.tsx` | Create endpoint assigns owner from session (never submitted seller ID); admin-only approve/reject endpoint and audit log. |
| Exchange requests/dashboard | `app/listing/[id]/page.tsx`, `app/dashboard/page.tsx` | Request creation and owner accept/decline use authenticated APIs and transactions; ownership and pending-state checks are server-side, and requesters are notified. |
| Saved items and reports | `app/profile/page.tsx`, `app/listing/[id]/page.tsx`, `app/admin/page.tsx` | Saved-item reads and changes and listing reports use user-owned database records; moderation visibility in the Head console still needs migration. |
| Notifications/admin messages | `app/notifications/page.tsx`, `app/admin/page.tsx` | Recipient-scoped list/read API and durable database notifications are active. Head messaging still needs a server endpoint that authorizes the sender and selects the recipient server-side; do not trust client-provided recipient email for access control. Add email/push delivery separately if wanted. |
| Delivery | `app/delivery/page.tsx`, `app/help/page.tsx` | Authenticated delivery requests are stored in PostgreSQL, with server-side 100 km validation and estimated fee. Courier choices are preferences only, not active partners. Add serviceability/quote, confirmed booking, cancellations, tracking webhooks, retries, and delivery audit history only after choosing a provider. |
| Payments/disputes/export | `app/admin/page.tsx`, `app/cancellation/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx` | Do not implement online checkout, payment-provider integrations, or webhooks; payments remain manual UPI/WhatsApp. Persist and authorize dispute reporting/resolution, Head access, and data exports on the server. Never trust browser-submitted payment status or totals. Review privacy, retention, cancellation, and payment terms before commercial use. |

For remaining features, switch UI from `getAppStore()`/`saveAppStore()` or notification localStorage helpers to authenticated APIs only after the API, migration, authorization, and tests are in place. Keep presentation state local; keep ownership, status, money, and permissions authoritative on the server.

### 5. Move every page and admin action to server-owned data

`app/admin/page.tsx` currently calculates totals, filters records, changes roles/listing/payment/dispute/request state, sends local notifications, and exports CSV in the browser. Replace each action with its own authenticated admin API; compute totals/filters from the database; audit role, moderation, payment, dispute, delivery, and export operations. Do not send the whole database or user passwords to the client. Update `app/dashboard/page.tsx` to query only the signed-in user's data.

Notifications now derive the recipient from the server session and support durable read state. The client-side gates in `app/admin/page.tsx`, `components/SignInPrompt.tsx`, and `components/SessionActions.tsx` are UX only; every protected API must repeat authorization on the server.

### 6. Add secrets, tests, and a safe rollout

- Keep `.env.local` untracked. The repository `.gitignore` now ignores `.env` and `.env.*`, while explicitly allowing the blank `.env.example` template. Store real values only in `.env.local` and the deployment secret manager.
- Add tests for migrations/repositories, unauthenticated and wrong-owner requests, non-admin access to every admin endpoint, profile privacy, notification recipient isolation, listing approval visibility, delivery at exactly 100 km versus above 100 km, and safe manual UPI/WhatsApp hand-off content. Payment-provider and webhook tests are out of scope unless online payments are explicitly added later.
- Use synthetic test data in a separate database. Never test with real user/customer/payment data in the current browser demo.
- Back up production data, document restore/retention/deletion procedures, and deploy migrations with a rollback plan.
- Keep the local version operable until the replacement API flow has passed tests; then remove obsolete localStorage writes so the app cannot accidentally present stale browser data as live database records.

## Head access

The production API grants the Head role only to the verified email configured as `OPXE_HEAD_EMAIL`; the browser cannot promote an account. The `/admin` page still contains prototype/local-storage workflows, so it must not be treated as a fully server-backed Head console. Do not deploy or rely on any prototype credentials embedded in the source.

## Security, privacy, and current limitations

The site is live as a **non-commercial beta**, but the full marketplace is **not production-ready**. Clerk-backed authentication and authorization-protected database endpoints exist for selected features, but many pages and Head-console actions still use local browser data and have not undergone full live-provider or end-to-end security testing. Do not put real personal, identity, payment, dispute, or customer information into those prototype workflows. Every new feature must enforce identity, ownership, role, and input validation on the server.

Other current limitations:

- Online payments are not enabled or planned. Buyers and sellers coordinate payment manually via UPI/WhatsApp; the website does not collect payment credentials or provide in-app payment/refund processing.
- Delivery fee is an estimate; local delivery requests and preferred courier selection do not book, track, insure, or fulfill a shipment. Distances above 100 km require contacting support.
- User/listing “verification” is a local boolean or moderation status only, with no document or content-validation service.
- Notifications, profile, saved items, dashboard activity, and delivery requests are stored per account in PostgreSQL, but are not real-time. The Head console and digital-product workflows still need full server-side migration.
- Browsing and filtering public marketplace listings does not require sign-in; posting, requesting an exchange, saving, and reporting are account actions and require a signed-in session. Login and registration return to the intended action page where applicable.
- AI Match is local keyword overlap, not AI.
- Static informational/legal copy needs product and legal review before launch.

## Production work still required

Before a real launch, finish and test the server-backed migration:

1. Finish migrating remaining browser-local workflows (digital products/orders and Head-console actions) to authorized database-backed APIs; add appropriate pagination and end-to-end tests for the database-backed profile, dashboard, saved items, exchange requests, notifications, and delivery requests.
2. Move every privileged Head-console read/write action behind authorized server APIs, validate all input server-side, and audit administrative changes. Never let the browser promote a user to Head.
3. Complete end-to-end tests for real sign-up/email verification, sign-in and redirects, listing ownership and moderation, image upload, and the selected database-backed actions.
4. Add and test moderation evidence and an auditable verification process; keep user/listing verification from being represented as a trusted identity check until a real process exists.
5. For delivery, keep current saved requests and estimates distinct from real bookings. No courier provider is connected; saved delivery requests are only requests for manual OPXE follow-up.
6. Payments stay manual via UPI/WhatsApp. Do not add online checkout, a payment provider, payment webhooks, or in-app payment-status controls.
7. Add rate limits, CSRF/origin protections where applicable, security logging, backups, privacy retention rules, and monitoring.
8. Replace local counts/notifications with actual database aggregations and live event delivery.
9. Add automated unit/integration/e2e tests for registration, listing approval, authorization, request transitions, reporting, and CSV exports.
10. Review legal pages, privacy requirements, operational policies, accessibility, and deployment settings before a commercial production launch.
11. Build and test the Android app with the Android SDK, create a release-signed APK/AAB, and submit it to Play Console if Android distribution is needed.
