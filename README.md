# STRYKE — Football & Sportswear Store

A production-oriented e-commerce site for STRYKE: a dark, premium storefront for football jerseys, boots, sportswear and equipment, with guest Cash-on-Delivery checkout across Lebanon and a private admin dashboard. Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4** on **Firebase** (Firestore, Storage, Authentication, Cloud Functions, App Check, App Hosting).

- Customers browse, search, filter, save items and check out **without an account**.
- The store owner signs in at **`/admin`** to manage products, stock, orders, clubs/brands/categories/collections, the homepage and store settings.
- Prices, delivery fees and stock are **always recalculated on the server** inside a Firestore transaction. The browser's numbers are never trusted, and the last unit of a size can't be sold twice.

---

## Contents

1. [What's included](#whats-included)
2. [Architecture](#architecture)
3. [Project structure](#project-structure)
4. [Run it locally](#run-it-locally)
5. [Tests](#tests)
6. [Deploy to Firebase](#deploy-to-firebase)
7. [Adding the first administrator](#adding-the-first-administrator)
8. [Costs](#costs)
9. [Day-to-day: publishing a product](#day-to-day-publishing-a-product)
10. [Security model](#security-model)
11. [Data model](#data-model)
12. [Known limits and next steps](#known-limits-and-next-steps)

---

## What's included

**Storefront**
- Homepage: cinematic hero (admin-managed slides, separate phone crop, focal point, parallax), category tiles, shop by brand, popular clubs, best sellers, new arrivals (newest in Firestore), promotional banners, featured products and collections, recently viewed. Section order and visibility are set in the admin.
- Sticky header with HOME / FOOTBALL / SPORTSWEAR / FOOTWEAR / EQUIPMENT / CLUBS / BRANDS / COLLECTIONS (category menu labels are editable), search, bag and currency. No account/login buttons.
- Shop, category, club, brand and collection pages with filters (category, club, brand, size, price, in stock, on sale, new), sorting and "load more".
- Product page: gallery with hover zoom and full-screen view, swipe gallery on phones, size/colour selection with live stock, "only N left" based on real inventory, name & number printing (when enabled per product), quantity, size guide, delivery info, related products, structured data.
- Instant search overlay (⌘K / Ctrl+K) with suggestions and recent searches; full results at `/shop?q=`.
- Local bag (persists between visits), bag drawer, bag page, saved items (local wishlist), quick view.
- Guest checkout: Lebanese phone validation, governorate-based delivery fees, free-delivery threshold, order summary, honeypot, idempotent submission (double taps never create two orders). Confirmation page with order number and an optional "Confirm on WhatsApp" link.
- Mobile-first: bottom tab bar, sticky add-to-bag bar on product pages, bottom-sheet filters, safe-area handling, skeletons.
- SEO: per-page metadata, Open Graph, Product + BreadcrumbList + Store structured data, `sitemap.xml`, `robots.txt`, web manifest, canonical URLs. Custom 404.

**Admin (`/admin`)**
- Overview: total/pending/confirmed/delivered/cancelled orders, total sales, completed revenue (delivered orders only), active products, low-stock and out-of-stock, recent orders, 30-day sales chart — all from real data.
- Orders: live list with status tabs, date range, search by order number/phone/name, CSV export; order page with status pipeline, cancel (with or without restocking), internal notes, call/WhatsApp customer, print view.
- Products: search and filters, add/edit form (photos with upload progress, ordering, alt text; sizes with presets; colours; stock per size × colour; price and sale price; labels; printing options; tags; URL), publish/unpublish, duplicate, archive or delete.
- Inventory: stock per size, low/sold-out views, adjustments with a reason, movement history.
- Categories, brands, clubs, collections (rule-based: tag, category, brand, club, on sale, new, limited, best seller).
- Homepage editor with **draft → publish**.
- Store settings: contact, social links, currency, delivery fees per governorate, free-delivery threshold, COD on/off, low-stock threshold, per-order quantity limit, policy pages.
- Analytics: sales per day, top products by sales and units, by brand/club/governorate/size, status breakdown.
- Activity log of admin actions.

**Brand**: your logo was cut into the S-mark and wordmark (`public/brand/`), the "strike cut" angled corner from the S is used on buttons and cards, and the palette follows the brief (#050505, #111111, #D6001C, #FFFFFF, #C0C0C0, #858585). Fonts (Barlow Condensed + Barlow) are self-hosted.

---

## Architecture

```
Browser ──► Next.js on Firebase App Hosting (Cloud Run)
            ├─ Storefront pages: server-rendered from Firestore via the Admin SDK,
            │  cached per tag (products, taxonomy, settings, homepage…)
            ├─ /api/quote      read-only price & stock check for the bag/checkout
            ├─ /api/search     compact catalogue index for instant search
            └─ /api/revalidate refresh cached data (secret or admin ID token)

Browser ──► Cloud Functions (callable, europe-west1)
            ├─ placeOrder          public · App Check · rate-limited · transaction
            └─ saveProduct, setProductStatus, duplicateProduct, deleteProduct,
               adjustStock, updateOrderStatus, addOrderNote   (admin claim only)
            Events: rename sync for brands/categories/clubs; daily purge job

Admin browser ──► Firestore (rules: admin claim) for reading orders/products,
                  editing taxonomy, homepage and settings
               └► Storage (rules: admin claim, images < 8 MB) for photo uploads
```

- **Why server-rendered reads with the Admin SDK?** Storefront HTML is generated on the server for SEO and speed; only published data is ever queried, and admin-only fields are stripped before anything reaches the browser.
- **"Publish → live immediately"**: after any product save, the Cloud Function calls `/api/revalidate` with a shared secret; admin edits to content call it with the admin's ID token. Cached pages refresh on the next request — no rebuild.
- **Stock safety**: `placeOrder` reads products, prices the cart (`shared/pricing.ts`) and decrements stock in one Firestore transaction. Admin stock edits are applied as *deltas* against the value the admin loaded, so an order placed while the product form is open is never overwritten. Cancelling restores stock once.
- **Money** is stored as integers in minor units (cents). No exchange rate is hard-coded anywhere.
- **Payments** are modelled as `payment.method` + `payment.status` on the order, with COD the only enabled method; adding a Lebanese provider means adding a method to `PAYMENT_METHODS`, a branch in `placeOrder`, and a webhook function — the checkout and order model already carry the fields.

---

## Project structure

```
src/app/(store)/        Storefront routes (home, shop, category, clubs, brands, collections,
                        product, cart, checkout, wishlist, info pages, 404)
src/app/admin/          Admin login + dashboard routes (client-side, guarded by the admin claim)
src/app/api/            revalidate, quote, search, products/[slug]
src/components/         ui/ (shared primitives), layout/, home/, product/, catalog/, cart/,
                        checkout/, admin/
src/lib/server/         Admin SDK init, cached catalogue queries, cart quotes (server-only)
src/lib/firebase/       Web SDK init, emulators, App Check, callable helper
src/lib/store/          Zustand stores: bag, saved/recently viewed, UI; quote hook
src/lib/admin/          Admin auth context, live data hooks, callable API, uploads, CSV
shared/                 Domain code used by the web app AND Cloud Functions: types, Zod schemas,
                        pricing, catalogue filtering/search, phone handling, defaults
functions/              Cloud Functions (TypeScript, bundled with esbuild) + their tests
firestore.rules, storage.rules, firestore.indexes.json, firebase.json, apphosting.yaml
scripts/                seed.mts (taxonomy/defaults/samples), grant-admin.mjs, e2e/run.mts
tests/                  Unit tests (shared domain) and security-rules tests (need emulators)
```

---

## Run it locally

Requirements: **Node.js 24.12+**, Java 21+ (for the Firestore/Storage emulators), and the Firebase CLI (installed as a dev dependency).

```bash
npm install
npm --prefix functions install
cp .env.example .env.local            # defaults point at the emulators
cp functions/.secret.local.example functions/.secret.local   # lets functions refresh the site cache

# Terminal 1 — emulators (Auth, Firestore, Storage, Functions) with the UI on :4000.
# Data is saved to .emulator-data on exit; next time use `npm run emulators:resume`.
npm run emulators

# Terminal 2 — starting data: categories, brands, the 12 clubs, collections,
# default homepage and settings, plus clearly-labelled SAMPLE products
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed -- --samples

# Make yourself an admin in the Auth emulator (prints a temporary password)
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/grant-admin.mjs you@example.com --create --project demo-stryke

# Terminal 3 — the site
npm run dev                           # http://localhost:3000  ·  admin: /admin
```

Sample products are named "… [Sample]", tagged `sample`, show a "Sample" badge and are excluded from the sitemap. Delete them from **Admin → Products** before launch (the seed refuses to write samples to a real project).

---

## Tests

| Command | What it covers | Needs |
|---|---|---|
| `npm test` | Shared domain (pricing, delivery, phone numbers, validation, search/filter, status rules) **and** Cloud Functions against an in-memory Firestore: checkout pricing, server-side totals, sold-out/over-stock rejection, idempotency, rate limiting, honeypot, **concurrent checkouts for the last unit**, product create/update with stock-delta merging, conflict detection, duplicate/delete, stock adjustments, order status pipeline, restock-once on cancel, admin-claim enforcement | nothing |
| `npm run e2e` | Builds the site (emulator mode), serves it with the real Cloud Functions handlers, and drives Chromium through the whole flow: admin publishes a Real Madrid jersey → it is live immediately → a customer picks size M on a phone → bag → guest checkout → order confirmation → admin moves it to delivered. Also checks tampered prices are ignored and unauthenticated admin calls fail. Saves screenshots to `.e2e/screenshots/`. | Chromium is provided by `@sparticuz/chromium` |
| `npm run test:rules` | Firestore and Storage security rules (public vs customer vs admin access, order privacy, shape checks, image-only uploads) | Java + Firebase emulators |
| `npm run typecheck`, `npm run lint` | TypeScript and ESLint | — |

---

## Deploy to Firebase

1. **Create the project** in the [Firebase console](https://console.firebase.google.com). Choose a Firestore location close to Lebanon (for example `eur3` or `europe-west1`) — keep Functions in the same region (default `europe-west1`, set by `FUNCTIONS_REGION` and `NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION`).
2. **Upgrade to the Blaze (pay-as-you-go) plan** — required for Cloud Functions, App Hosting and Secret Manager. Set a budget alert (see [Costs](#costs)).
3. Enable **Authentication → Email/Password**, **Firestore** (production mode), **Storage**.
4. Add a **Web app** and copy its config into `apphosting.yaml` (and `.env.local` for local use against the real project).
5. **App Check**: create a reCAPTCHA Enterprise key for your domain, register it under App Check for the web app, put the site key in `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`. Once you see verified requests in the App Check dashboard, set `ENFORCE_APP_CHECK=true` for functions.
6. Link the CLI:
   ```bash
   npx firebase login
   cp .firebaserc.example .firebaserc   # put your project id in it
   ```
7. **Secrets** — the same random value for both sides:
   ```bash
   openssl rand -hex 32                                  # copy the output
   npx firebase functions:secrets:set REVALIDATE_SECRET
   npx firebase apphosting:secrets:set REVALIDATE_SECRET
   ```
8. **Functions parameters**: copy `functions/.env.example` to `functions/.env.<project-id>` and set `STOREFRONT_URL` to your site URL.
9. **Deploy rules, indexes (incl. TTL policies) and functions**:
   ```bash
   npx firebase deploy --only firestore,storage,functions
   ```
10. **Deploy the website with App Hosting**: Firebase console → App Hosting → *Create backend* → connect the GitHub repository (root directory `/`, live branch `main`). Every push to `main` deploys. App Hosting reads `apphosting.yaml`.
11. **Starting data** (taxonomy + default content, never samples):
    ```bash
    GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed -- --project <id> --production
    ```
    (Or use `gcloud auth application-default login` instead of a key file. Never commit key files — they're git-ignored.)
12. Add your custom domain in App Hosting, then update `NEXT_PUBLIC_SITE_URL`, `STOREFRONT_URL` and the reCAPTCHA key's allowed domains.

---

## Adding the first administrator

There is no public sign-up. Admin access is a custom claim only server credentials can set.

1. Firebase console → **Authentication → Users → Add user** (store owner's email + strong password).
2. With credentials for the project (`gcloud auth application-default login`, or a service-account key that you delete afterwards):
   ```bash
   node scripts/grant-admin.mjs owner@yourstore.com --project <project-id>
   ```
3. Sign in at `https://your-domain/admin/login`.

Revoke with `--revoke`. The script also signs the user out of existing sessions so changes apply immediately.

---

## Costs

Nothing here is free by assumption. On the **Blaze plan** you pay for usage above Google's free quotas:

- **App Hosting** (Cloud Run, Cloud Build, Artifact Registry) — compute per request/instance time and build minutes. `minInstances: 0` keeps idle cost near zero; set it to 1 if you want to avoid cold starts (always-on cost).
- **Cloud Functions** — invocations, compute time, outbound networking. The daily purge job uses Cloud Scheduler.
- **Firestore** — document reads/writes/deletes and storage. The storefront caches catalogue reads; a new order costs a handful of writes.
- **Cloud Storage** — stored images and download bandwidth (product photos are served through Next.js image optimisation).
- **Secret Manager** — the `REVALIDATE_SECRET` secret versions and accesses.
- **reCAPTCHA Enterprise (App Check)** — assessments above its free tier.

A small store typically stays low, but check the current prices at [firebase.google.com/pricing](https://firebase.google.com/pricing) and **set a budget alert** in Google Cloud Billing before launch.

---

## Day-to-day: publishing a product

1. **Admin → Products → Add product**.
2. Name ("Real Madrid 26/27 Home Jersey"), category (sizes are pre-filled from it), brand, club, season, SKU, description.
3. Drop in photos — the first is the cover; add alt text.
4. Price (and sale price if any), stock for each size, optional name & number printing.
5. **Publish**. The product page, club page, search and listings update straight away.

Orders appear live under **Orders** (the sidebar shows a pending count). Open an order to confirm it, mark it preparing/shipped/delivered, add notes or print it. Delivered orders are marked paid and count toward completed revenue.

---

## Security model

- **Firestore rules** (`firestore.rules`): public reads only for published products and visible taxonomy/content; orders, customer details, inventory logs and audit logs are admin-only reads; **no client can write products, stock or orders** — only Cloud Functions. Admin writes to taxonomy/settings/homepage are shape-checked and stamped with `updatedBy`/`updatedAt`.
- **Storage rules**: public read of image folders; uploads/deletes by admins only, images ≤ 8 MB, no other content types.
- **Checkout** (`placeOrder`): Zod validation, honeypot, per-phone and per-IP rate limits (hashed, never stored raw), idempotency key, App Check enforcement (param), server-side pricing and stock in a transaction. The customer receives only their own receipt.
- **Admin functions** require the `admin` custom claim and write an audit log entry.
- **Data minimisation**: no analytics events with personal data; rate-limit and idempotency records expire automatically (TTL on `expireAt` + daily purge). Decide how long to keep order addresses and document it in your privacy policy; exporting and deleting old orders is done from the Firebase console.
- Security headers, `noindex` on `/admin`, no credentials in client code (the web config is public by design).

---

## Data model

| Collection | Purpose |
|---|---|
| `products/{id}` | Catalogue item: names denormalised for brand/category/club, `variants[]` (size, colour, sku, stock), `totalStock`, `minVariantStock`, flags, `status` (draft/published/archived), printing options, `imagePaths` |
| `categories`, `brands`, `clubs`, `collections` | Taxonomy; doc id = slug. Collections hold a `rule` |
| `orders/{STK-XXXXXX}` | Server-made snapshot of items, unit prices, delivery fee, totals, customer, address, status history, internal notes, payment |
| `storeSettings/main` | Contact, delivery zones and fees, COD, policies, thresholds |
| `homepageContent/draft`, `/published` | Homepage editor (draft) and what the store shows (published) |
| `inventoryMovements` | Every stock change: order, cancellation, adjustment, edit |
| `adminAuditLogs` | Who changed what |
| `rateLimits`, `orderRequests` | Server-only, auto-expiring |

Indexes are in `firestore.indexes.json` (including TTL policies and exemptions for large fields).

---

## Known limits and next steps

- **Catalogue size**: listing pages filter an in-memory, cached list of published products. That's fast and cheap up to a few thousand products; beyond that, add a search service (e.g. the Algolia or Typesense Firebase extension) behind `getProductSummaries`/`/api/search`.
- **LBP**: settings, formatting and order snapshots carry the currency, but prices are entered in USD today. Switching to LBP needs prices re-entered and the storefront `Price` component fed the store currency.
- **Customer notifications**: order confirmations go via the WhatsApp link; email/SMS sending (e.g. the Trigger Email extension) isn't wired in.
- **Admin UI in the browser** was type-checked, linted, built and its server operations tested, but its Firestore screens need the emulator suite to run, so do one pass through the dashboard locally (`npm run emulators`) before launch.
- **Brand and club logos**: upload only artwork you're permitted to use. Without a crest, clubs show a neutral shield in club colours.
