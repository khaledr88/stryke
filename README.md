# STRYKE — Football & Sportswear Store

A production-oriented e-commerce site for STRYKE: a dark, premium storefront for football jerseys, boots, sportswear and equipment, with guest Cash-on-Delivery checkout across Lebanon and a private admin dashboard.

**Runs on free plans, no credit card needed:**

| Part | Service | Plan |
|---|---|---|
| Website, server logic (checkout, admin actions), daily clean-up job | **Vercel** | Hobby (free) |
| Database | **Firebase Firestore** | Spark (free) |
| Admin sign-in | **Firebase Authentication** | Spark (free) |
| Product photos | **Vercel Blob** | Hobby allowance |

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**, Firebase Admin/Web SDKs, Zustand, React Hook Form + Zod, Motion and Recharts.

- Customers browse, search, filter, save items and check out **without an account**.
- The store owner signs in at **`/admin`** to manage products, stock, orders, clubs/brands/categories/collections, the homepage and store settings.
- Prices, delivery fees and stock are **always recalculated on the server** inside a Firestore transaction. The browser's numbers are never trusted, and the last unit of a size can't be sold twice.

> **Free-plan limits.** Vercel's Hobby plan is for personal, non-commercial use, and Firestore's free tier has daily read/write caps. That's fine for building, testing and showing the store. When STRYKE takes real orders, move to Vercel Pro (and Firebase Blaze if you outgrow the free quotas). No code changes are needed.

---

## Contents

1. [Deploy for free (step by step)](#deploy-for-free-step-by-step)
2. [Adding the first administrator](#adding-the-first-administrator)
3. [Run it on your computer](#run-it-on-your-computer)
4. [Tests](#tests)
5. [What's included](#whats-included)
6. [Architecture](#architecture)
7. [Project structure](#project-structure)
8. [Security model](#security-model)
9. [Data model](#data-model)
10. [Known limits and next steps](#known-limits-and-next-steps)

---

## Deploy for free (step by step)

You need: a GitHub account with this code pushed, a Google account, and **Node.js 24** on your computer (nodejs.org).

### 1. Firebase (database + admin login)

1. Go to **console.firebase.google.com** → **Create a project** (Analytics can stay off). Stay on the free **Spark** plan.
2. **Build → Firestore Database → Create database** → location **eur3 (Europe)** → **Start in production mode**.
3. **Build → Authentication → Get started → Email/Password → Enable → Save**.
4. **Project settings (gear) → General → Your apps → Web (`</>`)** → register an app called `stryke-web` (no Hosting). Keep the `firebaseConfig` values for step 3.
5. **Project settings → Service accounts → Generate new private key**. Save the file as `key.json` in the project folder (it's git-ignored — never commit it).
6. On your computer, in the project folder (PowerShell on Windows):
   ```powershell
   npm install
   npx firebase login
   npx firebase use --add                 # choose your project, alias: default
   npx firebase deploy --only firestore   # security rules + indexes
   ```
7. Load the starting data (categories, brands, the 12 clubs, collections, default homepage and settings):
   - **Windows PowerShell**
     ```powershell
     $env:GOOGLE_APPLICATION_CREDENTIALS = "$PWD\key.json"
     npm run seed -- --project YOUR-PROJECT-ID --production
     ```
   - **Mac/Linux**
     ```bash
     GOOGLE_APPLICATION_CREDENTIALS=./key.json npm run seed -- --project YOUR-PROJECT-ID --production
     ```

### 2. Vercel project

1. Go to **vercel.com**, sign up with GitHub → **Add New → Project** → import your `stryke` repository. Don't deploy yet if it offers; open **Environment Variables** first (or deploy, add variables, then redeploy).
2. **Settings → Build and Deployment → Node.js Version → 24.x**.

### 3. Environment variables (Vercel → Settings → Environment Variables)

| Name | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from `firebaseConfig` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from `firebaseConfig` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | from `firebaseConfig` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | from `firebaseConfig` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from `firebaseConfig` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | from `firebaseConfig` |
| `NEXT_PUBLIC_SITE_URL` | your Vercel address, e.g. `https://stryke-xyz.vercel.app` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | open `key.json` in Notepad, copy **everything**, paste |
| `REVALIDATE_SECRET` | any long random text |
| `CRON_SECRET` | another long random text |

### 4. Photo storage (Vercel Blob)

Vercel → your project → **Storage → Create → Blob** → create it and **connect it to the project**. This adds `BLOB_READ_WRITE_TOKEN` automatically.

### 5. Deploy

**Deployments → Redeploy** (or push to GitHub — every push to `main` deploys). When it's done Vercel shows your link.

### 6. Allow your Vercel address to sign in

Firebase → **Authentication → Settings → Authorized domains → Add domain** → your `xxx.vercel.app` address. Then create your admin (next section).

---

## Adding the first administrator

There is no public sign-up. Admin access is a custom claim only server credentials can set.

1. Firebase → **Authentication → Users → Add user** (your email + a strong password).
2. In the project folder, with `key.json` there:
   - **Windows PowerShell**
     ```powershell
     $env:GOOGLE_APPLICATION_CREDENTIALS = "$PWD\key.json"
     node scripts/grant-admin.mjs you@example.com --project YOUR-PROJECT-ID
     ```
   - **Mac/Linux**
     ```bash
     GOOGLE_APPLICATION_CREDENTIALS=./key.json node scripts/grant-admin.mjs you@example.com --project YOUR-PROJECT-ID
     ```
3. Sign in at `https://your-site.vercel.app/admin/login`.
4. Fill in **Store settings** first: WhatsApp number and **delivery fees per governorate** (checkout only offers governorates that have a fee), then add products.

Revoke with `--revoke`.

---

## Run it on your computer

```bash
npm install
cp .env.example .env.local     # fill in your Firebase values, key JSON, Blob token
npm run dev                    # http://localhost:3000   ·   admin: /admin
```

Or fully offline against the Firebase Emulator Suite (needs Java 21+): uncomment the emulator lines in `.env.local`, then

```bash
npm run emulators                                             # terminal 1 (UI on :4000)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed -- --samples   # terminal 2
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/grant-admin.mjs you@example.com --create --project demo-stryke
npm run dev                                                   # terminal 3
```

`--samples` adds clearly-labelled "[Sample]" products for testing (emulator only; the seed refuses to write them to a real project). Photo uploads need a `BLOB_READ_WRITE_TOKEN` even locally.

---

## Tests

| Command | What it covers |
|---|---|
| `npm test` | Shared domain (pricing, delivery, phone numbers, validation, search/filter, status rules) and the server operations against an in-memory Firestore: server-side totals, sold-out/over-stock rejection, idempotency, rate limiting, honeypot, **concurrent checkouts for the last unit**, product create/update with stock-delta merging, conflict detection, duplicate/delete, stock adjustments, order status pipeline, restock-once on cancel, admin-claim enforcement. |
| `npm run e2e` | Builds the site and drives Chromium through the whole flow: admin publishes a Real Madrid jersey → live immediately → a customer picks size M on a phone → bag → guest checkout → confirmation → admin moves it to delivered. Also checks tampered prices are ignored and that admin/upload/cache endpoints reject unauthenticated calls. Screenshots in `.e2e/screenshots/`. |
| `npm run test:rules` | Firestore security rules (needs Java + emulators). |
| `npm run typecheck`, `npm run lint` | TypeScript and ESLint. |

---

## What's included

**Storefront**
- Homepage: cinematic hero (admin-managed slides, separate phone crop, focal point, parallax), category tiles, shop by brand, popular clubs, best sellers, new arrivals, promotional banners, featured products and collections, recently viewed. Section order and visibility are set in the admin.
- Sticky header with HOME / FOOTBALL / SPORTSWEAR / FOOTWEAR / EQUIPMENT / CLUBS / BRANDS / COLLECTIONS, search, bag and currency. No account/login buttons.
- Shop, category, club, brand and collection pages with filters (category, club, brand, size, price, in stock, on sale, new), sorting and "load more".
- Product page: gallery with hover zoom and full-screen view, swipe gallery on phones, size/colour selection with live stock, "only N left", name & number printing, size guide, delivery info, related products, structured data.
- Instant search (⌘K / Ctrl+K) with suggestions and recent searches.
- Local bag, bag drawer, saved items (local wishlist), quick view.
- Guest checkout: Lebanese phone validation, governorate delivery fees, free-delivery threshold, honeypot, idempotent submission, order confirmation with optional "Confirm on WhatsApp".
- Mobile-first: bottom tab bar, sticky add-to-bag bar, bottom-sheet filters, safe-area handling, skeletons.
- SEO: metadata, Open Graph, Product/Breadcrumb/Store structured data, sitemap, robots, manifest, custom 404.

**Admin (`/admin`)**
- Overview (orders by status, total sales, completed revenue from delivered orders, active/low/out-of-stock products, recent orders, 30-day chart), live orders with search/filters/CSV export/print/notes/status pipeline, products (photos, sizes × colours stock, pricing, labels, printing, publish/duplicate/archive/delete), inventory with adjustments and history, categories/brands/clubs/collections, homepage editor with draft → publish, store settings, analytics, activity log.

---

## Architecture

```
Browser ──► Next.js on Vercel
            ├─ Storefront pages: rendered on the server from Firestore (Admin SDK),
            │  cached per tag and refreshed the moment the admin saves
            ├─ /api/checkout          public · optional App Check · rate-limited · transaction
            ├─ /api/admin/[action]    saveProduct, setProductStatus, duplicateProduct,
            │                         deleteProduct, adjustStock, updateOrderStatus,
            │                         addOrderNote, syncTaxonomyName  (admin claim required)
            ├─ /api/admin/upload      Vercel Blob upload tokens (admins only, images ≤ 8 MB)
            ├─ /api/quote, /api/search, /api/products/[slug], /api/revalidate
            └─ /api/cron/purge        daily clean-up (Vercel Cron)

Admin browser ──► Firestore (rules: admin claim) to read orders/products and edit
                  taxonomy, homepage and settings
```

- **Business logic lives in `core/`** (plain TypeScript + Firebase Admin), so it's independent of the hosting platform and fully unit-tested. Moving it to Cloud Functions later is a thin wrapper.
- **Stock safety**: checkout reads products, prices the cart (`shared/pricing.ts`) and decrements stock in one Firestore transaction. Admin stock edits are applied as *deltas* against the value the admin loaded, so an order placed while the form is open is never overwritten. Cancelling restores stock once.
- **Money** is stored as integers in minor units (cents). No exchange rate is hard-coded.
- **Payments** are modelled as `payment.method` + `payment.status`; COD is the only enabled method. Adding a Lebanese provider means a new method in `PAYMENT_METHODS`, a branch in checkout and a webhook route.

---

## Project structure

```
src/app/(store)/     Storefront routes
src/app/admin/       Admin login + dashboard (client-side, guarded by the admin claim)
src/app/api/         checkout, admin/[action], admin/upload, quote, search, revalidate, cron
src/components/      ui/, layout/, home/, product/, catalog/, cart/, checkout/, admin/
src/lib/server/      Admin SDK, cached catalogue queries, cart quotes, API helpers
src/lib/firebase/    Web SDK (auth, Firestore, App Check) + API client
src/lib/store/       Bag, saved/recently viewed, UI state
src/lib/admin/       Admin auth, live data hooks, admin API, uploads, CSV
core/                Server business logic: orders, products, inventory, rate limits, audit
shared/              Types, Zod schemas, pricing, catalogue search/filter, phone, defaults
scripts/             seed.mts, grant-admin.mjs, e2e/run.mts
tests/               Unit tests, core tests, security-rules tests
firestore.rules, firestore.indexes.json, firebase.json, vercel.json
```

---

## Security model

- **Firestore rules**: the public can read only published products and visible taxonomy/content; orders, customer details, inventory logs and audit logs are admin-only; **no browser can write products, stock or orders** — only the server (Admin SDK). Admin edits to taxonomy/settings/homepage are shape-checked and stamped with who made them.
- **Checkout**: Zod validation, honeypot, per-phone and per-IP rate limits (hashed, never stored raw), idempotency key, optional App Check (reCAPTCHA v3, free), server-side pricing and stock.
- **Admin API**: every call verifies the Firebase ID token (revocation-checked) and the `admin` claim, and writes an audit log entry. Photo uploads get short-lived tokens only for admins, images only, ≤ 8 MB.
- **Secrets** (`FIREBASE_SERVICE_ACCOUNT_JSON`, `BLOB_READ_WRITE_TOKEN`, `REVALIDATE_SECRET`, `CRON_SECRET`) live only in Vercel environment variables. `key.json` and `.env*` are git-ignored.
- **Data minimisation**: no personal data in analytics; rate-limit and idempotency records expire and are purged daily. Decide how long to keep order addresses and state it in your privacy policy.

---

## Data model

| Collection | Purpose |
|---|---|
| `products/{id}` | Catalogue item: denormalised brand/category/club names, `variants[]` (size, colour, sku, stock), `totalStock`, `minVariantStock`, flags, `status`, printing options, `imagePaths` |
| `categories`, `brands`, `clubs`, `collections` | Taxonomy; doc id = slug. Collections hold a `rule` |
| `orders/{STK-XXXXXX}` | Server-made snapshot of items, unit prices, delivery fee, totals, customer, address, status history, notes, payment |
| `storeSettings/main` | Contact, delivery zones and fees, COD, policies, thresholds |
| `homepageContent/draft`, `/published` | Homepage editor draft and what the store shows |
| `inventoryMovements`, `adminAuditLogs` | Every stock change; who changed what |
| `rateLimits`, `orderRequests` | Server-only, expiring |

---

## Known limits and next steps

- **Free tiers**: Vercel Hobby is non-commercial; Firestore Spark has daily caps (check firebase.google.com/pricing). Upgrade before real trading.
- **Catalogue size**: listings filter a cached in-memory list — fast up to a few thousand products; beyond that add a search service.
- **LBP**: currency is stored everywhere, but prices are entered in USD today.
- **Notifications**: confirmations go via the WhatsApp link; email/SMS isn't wired in.
- **Admin dashboard**: type-checked, built and its server operations tested; do one hands-on pass through it after deploying.
- **Logos**: upload only brand logos and club crests you're permitted to use; clubs without a crest show a neutral shield in club colours.
