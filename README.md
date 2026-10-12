# OPXE — Omega ProblemX Exchange

OPXE is a responsive marketplace built with Next.js and is deployed as a non-commercial beta at [opxe-website.vercel.app](https://opxe-website.vercel.app). Clerk authentication, Neon PostgreSQL, and Cloudinary integration are configured. The Clerk sign-up/sign-in UI and proxy endpoints have been smoke-tested, and the public pages respond successfully; a real account-registration flow still needs a user-run email verification test. Most account activity, Head-console workflows, and digital-store behavior still use browser-local storage and are not production-ready. A Capacitor Android project has been generated, but no APK/AAB or signing setup is available yet.

The website calls the privileged administrator account the **Head**. The underlying app uses the technical `admin` role and `/admin` route; those implementation identifiers are unchanged. Payments and courier fulfillment remain manual via WhatsApp.

**Beta limitations:** full authenticated end-to-end testing, remaining workflow migrations, production legal/privacy review, Android SDK/signing keys, and Play Console submission are outstanding. Do not use this build to process real payments or store sensitive customer information.

## Current launch status

| Surface | Current implementation | What is still required |
| --- | --- | --- |
| Website | Live non-commercial beta at [opxe-website.vercel.app](https://opxe-website.vercel.app); production build passes and all public pages returned HTTP 200 in a smoke test. | Test on real mobile devices and complete authenticated end-to-end workflows. |
| Authentication | Clerk production instance and Vercel proxy are configured; sign-up/sign-in widgets and Clerk proxy endpoints load successfully. | Complete a real sign-up with email verification, then verify login, redirects, and Head authorization. |
| Listings | Homepage/marketplace reads and new listing creation use PostgreSQL APIs; production Neon database is migrated and Cloudinary is configured for signed uploads. | Test authenticated listing creation, uploads, approval, and moderation against production services. |
| Remaining data | Dashboard, saved items, profile editing UI, requests, notifications, delivery, disputes/payments, digital products, and most Head controls remain local prototype flows. | Migrate these workflows to authenticated server APIs before production use; do not treat their local data as shared/live. |
| Android | Capacitor project generated under `android/`; its bundled page is a setup placeholder until a hosted HTTPS URL is set. No APK or AAB exists. | Set `CAPACITOR_SERVER_URL` to the deployed HTTPS site, sync, test with Android tooling, and sign with a user-controlled release keystore. |
| Transactions | No payment or courier provider is connected. | Continue manual WhatsApp coordination only until service providers are selected and integrated. |

### Provider setup and deployment

1. Create a Neon PostgreSQL database and set `DATABASE_URL` in an ignored `.env.local` file for development and in the Vercel project secrets for deployment.
2. Run `npm run db:migrate` to apply `database/migrations/0001_initial.sql` and `database/migrations/0002_cloudinary_image_urls.sql` in order. These migrations have been applied to the production Neon database.
3. Create a Clerk application, configure the production domain and allowed redirect URLs, then set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and the verified `OPXE_HEAD_EMAIL`. For the Vercel `vercel.app` domain, Clerk uses the `/__clerk` proxy, which is wired through `ClerkProviderBoundary` and the middleware matcher. Never put server secrets in browser code.
4. Create a Cloudinary account and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` as server-side secrets.
5. Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS URL, deploy to Vercel, and test the web/API flows with provider test accounts and non-production data.
6. Only after a stable HTTPS site exists, set `CAPACITOR_SERVER_URL` to that exact URL and generate/test the Android project. Keep release signing keys private and backed up.

Provider secrets are stored in deployment settings and are not committed to this repository. Android SDK setup, release signing, and Play Console submission have not been performed.

The migration runner records each applied file and checksum in `public._opxe_schema_migrations`, serializes concurrent runs with a PostgreSQL advisory lock, and applies each file in a transaction. Applied migration files must not be edited; add a new numbered SQL migration for later schema changes.

## Contents

- [Product overview](#product-overview)
- [Technology and architecture](#technology-and-architecture)
- [Run locally](#run-locally)
- [Pages and routes](#pages-and-routes)
- [How the main workflows work](#how-the-main-workflows-work)
- [Head control center](#head-control-center)
- [Data model and persistence](#data-model-and-persistence)
- [Project file guide](#project-file-guide)
- [Real database integration change map](#real-database-integration-change-map)
- [Local Head access](#local-head-access)
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
| Current data | Mixed: homepage/marketplace and listing creation use APIs; many other workflows remain in `localStorage` |
| Authentication | Clerk UI and server identity integration; inactive until Clerk environment variables are configured |
| Database | PostgreSQL migrations and server routes exist; requires `DATABASE_URL` and has not been applied to a live database |
| Image storage | Signed Cloudinary listing uploads; requires Cloudinary credentials |
| Android | Capacitor configuration and Android project scaffold generated; no deploy URL, APK/AAB or release signing |
| External services | Payments and courier booking are not connected; WhatsApp/manual handling only |

Most interactive routes are client components (`'use client'`) rendered through Next.js App Router. Some features now call server APIs, but unsupported prototype workflows still use browser storage.

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
| `/listing/[id]` | Listing detail | Loads public listing data and Cloudinary photos through the database API. Signed-in users can send a request, save/unsave the listing, or submit a report through authenticated database APIs. The related dashboard, saved-items profile section, and Head report moderation UI still require migration before those records can be managed end-to-end. |
| `/login` | Sign-in | Uses Clerk when configured; otherwise displays provider setup guidance. |
| `/register` | Registration | Uses Clerk when configured; profile completion and redirect flows still require end-to-end verification. |
| `/post` | Create listing | Requires an authenticated account and configured services; uploads 3–5 photos to Cloudinary and creates a pending PostgreSQL listing. |
| `/dashboard` | Personal activity | Shows the signed-in user's listings, pending-approval count, sent requests, and incoming requests associated with owned listings. Listing owners can accept or decline incoming pending requests. Links open profile, marketplace, delivery, and, for the Head account, the Head console. |
| `/profile` | Profile and activity | Displays account details, including name, email/phone and their OTP flags, city, education, account role/status (administrator appears as Head), review state, and member-since date. Name/city/phone/education fields can be edited and stored locally; email and role cannot be edited here. Saved listings appear in a dedicated section with links to view or remove each saved item, including its photo preview when available. Also shows up to eight own-listing/sent-request activity records. |
| `/notifications` | Notification center | Requires sign-in. Shows private local notifications addressed to the signed-in account. New exchange requests notify the listing owner when the listing has a registered owner; accept/decline decisions notify the requester. Head messages use the same inbox. “Mark all read” changes visible records in browser storage. This is not server delivery or real-time messaging. |
| `/ai` | Smart matching | Tokenizes the text into unique alphanumeric words longer than two characters and ranks approved local listings by the proportion of words present in each listing's text. This is deterministic browser keyword matching, not an AI service. A match card opens its listing. |
| `/delivery` | Delivery estimate/request | Accepts positive distance up to and including 100 km and estimates `max(₹80, ₹40 + ₹12/km)`. Signed-in users can enter a product, pickup/drop-off text addresses, and courier preference; a browser-local request is shown in this page and the Head console. It does not book a courier or charge payment. Above 100 km, the request form is replaced by support email, phone, and Help Centre links. |
| `/admin` | Head control center | Not linked in public navigation. The client UI checks the current browser user's internal admin role (displayed as Head) and shows access denied otherwise. It has clickable metric drill-downs, user/listing/payment/dispute filters and moderation controls, local password change/reset, full browser-data backup/restore, request actions, local private notifications, delivery request details, CSV export, and a digital product manager. Direct route and client checks are not security controls. See [Head details](#head-control-center). |
| `/help` | Help centre | Expandable, static guidance about listing, digital purchases, sending/responding to requests, delivery limit, account setup, and reports/disputes; OPXE support email and WhatsApp are listed. |
| `/about` | About | Static description of OPXE and its current browser-only storage limitation. |
| `/contact` | Contact | Displays the OPXE sales/support email, WhatsApp number, and Bengaluru location; links open email or WhatsApp. |
| `/terms` | Terms | Static informational disclaimer, not a legal agreement. |
| `/privacy` | Privacy | Warns that browser profile data is accessible to users of that browser and the page is not a production privacy notice. |
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
- Digital products and role checks are browser-local prototype data, not protected server-side. A production store requires server authorization, persistent storage, payment-provider verification/webhooks, protected file hosting with expiring access, and a transactional email service.

### Exchange requests

- A signed-in user can request another user's listing. The app blocks a request if the user is not signed in, the item is missing, the requester is the listing owner, or they already have an active request for the same item.
- Requests are stored with listing ID/title, requester name/email, timestamp, and `Pending`/`Accepted`/`Declined` status.
- The requester sees their sent request in their dashboard. The owner sees incoming requests in their dashboard and can accept or decline. The Head can also moderate requests from `/admin`.
- Creating a request sends a recipient-scoped local notification to the registered owner of a newly created listing. Accept/decline from the owner dashboard or Head console sends a local status notification to the requester. Seed listings without a registered owner ID cannot receive an owner notification.
- This is an in-browser workflow only: there is no messaging, email, negotiation service, or transaction record created from acceptance.
- The owner check uses a stable `ownerId` for newly created listings. Legacy records without an owner ID continue to use a case-insensitive seller-name fallback, which cannot reliably distinguish two users who share a name.

### Saved items and reports

- Save toggles the listing ID in the local per-account `savedListingIdsByUser` collection.
- The legacy single-account `savedListingIds` field is migrated to the active account when the per-account field is missing; current saves are keyed by normalized account email.
- Report adds an open dispute record with the listing reference and a reason.
- The dispute appears in the Head dispute center and can be marked resolved.
- Account separation is only a browser UI behavior; there is no server-enforced ownership or cross-device synchronization. The notification center reads the same local notification store used by these actions.

### AI matching

- The match page splits the prompt into unique words longer than two characters.
- For each approved listing it counts matching words across title, description, category, type, and city.
- Score = matching words divided by prompt words, expressed as a percentage; highest scores appear first.
- This helps exercise the UI without external services. It is not generative AI, semantic search, location intelligence, or a trained recommendation engine.

### Delivery request

- The form validates the positive distance bound (the UI only exposes it through 100 km), product, pickup address, delivery address, and courier preference. `lib/appStore.ts` also enforces the 100 km maximum before saving.
- The fee is rounded up to a whole rupee after applying `max(80, 40 + 12 × distanceKm)`.
- A successful record is marked `Request saved - courier not booked`; the signed-in user sees their own saved requests on `/delivery`, and the Head can see all local records in the delivery metric drill-down and CSV export.
- No live address lookup, road-distance calculation, provider serviceability query, booking, tracking, courier status, payment, or cancellation exists. Above 100 km, support contact links are shown and no local request can be submitted.

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

The Head cannot edit a database connection from this prototype because PostgreSQL is not connected. Once a server backend is implemented, database selection should use server-configured connection profiles; connection strings and credentials must not be exposed in client code or browser storage.

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
| `app/login/page.tsx` | Local sign-in form and role redirect. |
| `app/register/page.tsx` | Local user registration and validation. |
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
| `components/SessionActions.tsx` | Header's browser-session-aware sign-in/profile/logout controls. |
| `components/SignInPrompt.tsx` | Shared account-required prompt with links back to the requested page after sign-in or registration. |
| `lib/appStore.ts` | Types, initial state, browser persistence, registration/sign-in, listing and Head-only digital product create/remove, request/report/save, and delivery-request functions. |
| `lib/notifications.ts` | Browser-local notification storage, record validation, and recipient notification helper. |
| `lib/server/db.ts` | Server-only PostgreSQL connection pool and transaction helper; does not expose credentials to browser code. |
| `database/migrations/0001_initial.sql` | PostgreSQL schema foundation for accounts/identities, listings/media, requests, digital items/orders, saved items, disputes, notifications, delivery, payments, and audit records; not yet applied or connected. |
| `package.json` | Project scripts and dependency versions. |
| `.env.example` | Documents the server-only PostgreSQL connection variable without credentials. |
| `next.config.mjs` | Next.js configuration. |
| `tailwind.config.ts` | Tailwind theme and content configuration. |
| `postcss.config.js` | PostCSS plugins used by the Tailwind build. |
| `tsconfig.json` | TypeScript compiler configuration and import aliases. |

## PostgreSQL and real database integration

The current app is **still browser-only**. PostgreSQL has been selected and an initial schema migration now exists at `database/migrations/0001_initial.sql`; a server-only `pg` pool helper is in `lib/server/db.ts`. The migration has not been run against a database, and no page or API reads or writes to it. There is no feature repository, secure authentication, or image-storage integration yet. Applying the migration alone will not make app data shared or secure. Replace browser persistence with server-side repositories and authorized APIs rather than adding database calls directly into React components.

### 1. Provision PostgreSQL and apply the initial migration

1. Create separate PostgreSQL development and production databases. Use a supported PostgreSQL release with `gen_random_uuid()`.
2. Set the server-only `DATABASE_URL` in ignored `.env.local` for local work and in the deployment secret manager for production. `.env.example` documents the variable name only. Never use `NEXT_PUBLIC_` for secrets or check in real connection strings.
3. Review and apply `database/migrations/0001_initial.sql` to the development database using a PostgreSQL migration runner or `psql` configured with `ON_ERROR_STOP`. Back up existing data first; this migration defines the new schema but intentionally does not import browser `localStorage` records.
4. Build typed repositories under `lib/server/repositories/` on top of `lib/server/db.ts`. Neither the database client nor connection string may be imported into client components.
5. Add subsequent numbered migrations for every schema change. Do not rely on browser data or the local Head account as production data.

### 2. Schema included in the initial migration

The initial migration creates:

- `users` and `auth_identities`: normalized unique account email, app role/status, profile/review flags, and a provider/subject mapping. Passwords and provider tokens are intentionally not stored in this app schema; the identity provider choice and integration are still outstanding.
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
| Exchange requests/dashboard | `app/listing/[id]/page.tsx`, `app/dashboard/page.tsx`, `app/admin/page.tsx` | Request create/status endpoints; enforce owner/requester rules on the server and notify the correct parties. |
| Saved items and reports | `app/listing/[id]/page.tsx`, `app/admin/page.tsx` | User-owned saved-listing endpoints and report/dispute endpoint; add server-side duplicate/rate/ownership checks. |
| Notifications/admin messages | `app/notifications/page.tsx`, `app/admin/page.tsx`, `lib/notifications.ts` | Recipient-ID-scoped notification API and durable DB records. Admin messaging must authorize the sender and server-select the recipient; do not trust a client-provided recipient email for access control. Add email/push delivery separately if wanted. |
| Delivery | `app/delivery/page.tsx`, `app/help/page.tsx`, `lib/appStore.ts` | `app/api/delivery/route.ts` (create), DB repository, and **create** `lib/delivery/providers/` adapter. Keep the 100 km rule enforced server-side; add serviceability/quote, confirmed booking, cancellations, tracking webhooks, retries, and delivery audit history. Courier options in the current UI are preferences only, not active partners. |
| Payments/disputes/export | `app/admin/page.tsx`, `app/cancellation/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx` | Provider integration, verified webhooks, server-side payment ledger/refund/dispute transitions, admin authorization, and export endpoint with audit trail. Never trust browser-submitted payment status or totals. Review privacy, retention, cancellation, and payment terms before taking real customer data or money. |

For each feature, switch its UI from `getAppStore()`/`saveAppStore()` or notification localStorage helpers to its authenticated API only after the API, migration, authorization, and tests are in place. Keep presentation state local; keep ownership, status, money, and permissions authoritative on the server.

### 5. Move every page and admin action to server-owned data

`app/admin/page.tsx` currently calculates totals, filters records, changes roles/listing/payment/dispute/request state, sends local notifications, and exports CSV in the browser. Replace each action with its own authenticated admin API; compute totals/filters from the database; audit role, moderation, payment, dispute, delivery, and export operations. Do not send the whole database or user passwords to the client. Update `app/dashboard/page.tsx` to query only the signed-in user's data.

The current `app/notifications/page.tsx` filters local notification records in the browser. Production notification queries must derive the recipient from the server session, not accept arbitrary user IDs/emails. Likewise, the client-side gates in `app/admin/page.tsx`, `components/SignInPrompt.tsx`, and `components/SessionActions.tsx` are UX only; every protected API must repeat authorization on the server.

### 6. Add secrets, tests, and a safe rollout

- Keep `.env.local` untracked. The repository `.gitignore` now ignores `.env` and `.env.*`, while explicitly allowing the blank `.env.example` template. Store real values only in `.env.local` and the deployment secret manager.
- Add tests for migrations/repositories, unauthenticated and wrong-owner requests, non-admin access to every admin endpoint, profile privacy, notification recipient isolation, listing approval visibility, delivery at exactly 100 km versus above 100 km, provider failure/webhook signature validation, and payment idempotency.
- Use synthetic test data in a separate database. Never test with real user/customer/payment data in the current browser demo.
- Back up production data, document restore/retention/deletion procedures, monitor provider failures, and deploy migrations with a rollback plan.
- Keep the local version operable until the replacement API flow has passed tests; then remove obsolete localStorage writes so the app cannot accidentally present stale browser data as live database records.

## Head access

The production API grants the Head role only to the verified email configured as `OPXE_HEAD_EMAIL`; the browser cannot promote an account. The `/admin` page still contains prototype/local-storage workflows, so it must not be treated as a fully server-backed Head console. Do not deploy or rely on any prototype credentials embedded in the source.

## Security, privacy, and current limitations

The app is **not production-ready**. Clerk-backed authentication and authorization-protected database endpoints exist for selected features, but many pages and Head-console actions still use local browser data and have not undergone live-provider or end-to-end security testing. Do not put real personal, identity, payment, dispute, or customer information into those prototype workflows. Every new feature must enforce identity, ownership, role, and input validation on the server.

Other current limitations:

- No payment provider is connected. Payment and refund workflows are not ready to handle money.
- Delivery fee is an estimate; local delivery requests and preferred courier selection do not book, track, insure, or fulfill a shipment. Distances above 100 km require contacting support.
- User/listing “verification” is a local boolean or moderation status only, with no document or content-validation service.
- Notifications and many account workflows are browser-local, not shared or real-time.
- Browsing and filtering public marketplace listings does not require sign-in; posting, requesting an exchange, saving, and reporting are account actions and require a signed-in session. Login and registration return to the intended action page where applicable. Saved listing state is separated by account within the local store.
- AI Match is local keyword overlap, not AI.
- Static informational/legal copy needs product and legal review before launch.

## Production work still required

Before a real launch, finish and test the server-backed migration:

1. Choose a database and design durable user, listing, request, payment, dispute, and audit tables.
2. Implement secure authentication, password hashing, session expiry/revocation, and server-side authorization.
3. Give Head accounts controlled provisioning and role assignment; never let the browser promote itself.
4. Move every privileged control-center read/write action behind authorized server APIs and validate all input server-side.
5. Add image storage, moderation evidence, listing ownership rules, per-user saved items, and an auditable verification process.
6. For delivery, implement authorized route handlers in `app/api/delivery/route.ts`, persist requests through a server/database repository (replace the browser-only helper in `lib/appStore.ts`), and isolate provider code in `lib/delivery/providers/`. Add provider secrets only to ignored `.env.local` for development and the deployment secret manager for production; never use `NEXT_PUBLIC_` credentials or commit them. Handle quotes, booking confirmation/failure, cancellation, tracking webhooks, retries, and serviceability/100 km checks.
7. Integrate a compliant payment provider; handle webhooks, refunds, disputes, and failure cases.
8. Add rate limits, CSRF/origin protections where applicable, security logging, backups, privacy retention rules, and monitoring.
9. Replace local counts/notifications with actual database aggregations and live event delivery.
10. Add automated unit/integration/e2e tests for registration, listing approval, authorization, request transitions, reporting, and CSV exports.
11. Review legal pages, privacy requirements, operational policies, accessibility, and deployment secrets before production.
