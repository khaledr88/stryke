/**
 * End-to-end test of STRYKE's core business flow, in one process:
 *
 *   - An in-memory Firestore (real Admin SDK, @firebase-bridge/firestore-admin) stands in for the database.
 *   - The production Next.js build serves the storefront against it.
 *   - Checkout and admin operations run through the app's own API routes / core
 *     modules — the same code that runs on Vercel.
 *   - Headless Chromium drives the storefront like a customer and saves screenshots.
 *
 * Prerequisite: a production build (`npm run e2e` builds first).
 * Security rules are not exercised here — run `npm run test:rules` with the emulator.
 */
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { FirestoreMock } from "@firebase-bridge/firestore-admin";
import type { Firestore } from "firebase-admin/firestore";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Page } from "puppeteer-core";
import { seedHomepage, seedSampleProducts, seedSettings, seedTaxonomy } from "../lib/seedData";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, ".e2e");
const SHOTS = path.join(OUT, "screenshots");
const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;
mkdirSync(SHOTS, { recursive: true });

process.env.REVALIDATE_SECRET = "e2e-secret";
process.env.GCLOUD_PROJECT = "demo-stryke";
process.env.NEXT_PUBLIC_SITE_URL = BASE;

const results: { name: string; ok: boolean; info?: string }[] = [];
function check(name: string, ok: boolean, info?: string) {
  results.push({ name, ok, info });
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${info ? ` — ${info}` : ""}`);
}
async function expectReject(name: string, p: Promise<unknown>, code: string) {
  try {
    await p;
    check(name, false, "expected rejection");
  } catch (e) {
    const c = (e as { code?: string }).code;
    check(name, c === code, `got ${c}: ${(e as Error).message}`);
  }
}

/* ------------------------------------------------------------- Database */
const env = new FirestoreMock();
const db: Firestore = env.createDatabase().firestore();
globalThis.__strykeFirestore = db;

await seedTaxonomy(db);
await seedSettings(db, { sampleDelivery: true });
await seedHomepage(db);
await seedSampleProducts(db);
console.log("Seeded taxonomy, settings, homepage and sample products");

/* ------------------------------------------------------- Core operations */
const ADMIN = { uid: "owner", email: "owner@stryke.test" };
const core = {
  ...(await import("../../core/products/manageProduct")),
  ...(await import("../../core/orders/manageOrder")),
  ...(await import("../../core/orders/placeOrder")),
};
const asAdmin = (name: "saveProductCore" | "updateOrderStatusCore" | "addOrderNoteCore", data: unknown) =>
  (core[name] as (db: Firestore, actor: typeof ADMIN, raw: unknown) => Promise<unknown>)(db, ADMIN, data);
const post = (p: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(BASE + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

/* -------------------------------------------------------------- Next.js */
const { default: next } = await import("next");
const app = next({ dev: false, dir: ROOT, hostname: "127.0.0.1", port: PORT });
await app.prepare();
const handle = app.getRequestHandler();
const web = createServer((req, res) => handle(req, res));
await new Promise<void>((r) => web.listen(PORT, "127.0.0.1", r));
console.log(`Storefront on ${BASE}\n`);

const get = async (p: string) => {
  const r = await fetch(BASE + p);
  return { status: r.status, html: await r.text() };
};
const variants = async (id: string) =>
  Object.fromEntries(((await db.doc(`products/${id}`).get()).get("variants") as { id: string; stock: number }[]).map((v) => [v.id, v.stock]));

let exitCode = 0;
try {
  console.log("Storefront pages");
  for (const p of ["/", "/shop", "/category/football-jerseys", "/clubs", "/clubs/real-madrid", "/brands", "/brands/nike", "/collections", "/collections/new-season", "/info/size-guide", "/sitemap.xml", "/robots.txt"]) {
    const r = await get(p);
    check(`GET ${p}`, r.status === 200, String(r.status));
  }
  const home = await get("/");
  check("Home shows hero heading", /More than/i.test(home.html));
  check("Home lists best sellers from Firestore", home.html.includes("Real Madrid Home Jersey [Sample]"));
  check("Unknown product returns 404", (await get("/product/does-not-exist")).status === 404);
  const search = await (await fetch(`${BASE}/api/search`)).json();
  check("Search index served", Array.isArray(search) && search.length === 8, `${search.length} products`);

  console.log("\nAdmin publishes a new Real Madrid jersey");
  const saved = (await asAdmin("saveProductCore", {
    name: "Real Madrid 26/27 Away Jersey",
    brandId: "adidas",
    categoryId: "football-jerseys",
    clubId: "real-madrid",
    season: "26/27",
    productType: "jersey",
    description: "Away shirt for the 26/27 season.\n\n- Lightweight fabric\n- Club crest",
    price: 11000,
    salePrice: null,
    sku: "RMA-A-2627",
    images: [
      { path: "", url: "/samples/white-home-front.webp", alt: "Front" },
      { path: "", url: "/samples/white-home-back.webp", alt: "Back" },
    ],
    colors: [],
    sizes: ["S", "M", "L", "XL"],
    variants: [
      { size: "S", color: null, sku: "", stock: 3, baseline: null },
      { size: "M", color: null, sku: "", stock: 5, baseline: null },
      { size: "L", color: null, sku: "", stock: 1, baseline: null },
      { size: "XL", color: null, sku: "", stock: 0, baseline: null },
    ],
    tags: ["new-season"],
    isNew: true,
    isBestSeller: false,
    isFeatured: true,
    isLimited: false,
    status: "published",
    customization: { enabled: true, price: 1500, nameMaxLength: 12, numberMin: 1, numberMax: 99 },
  })) as { id: string; slug: string };
  // The /api/admin/saveProduct route does this after saving; do the same here.
  await post("/api/revalidate", { tags: ["products"] }, { "x-revalidate-secret": "e2e-secret" });
  check("saveProduct returns id and slug", Boolean(saved.id) && saved.slug === "real-madrid-26-27-away-jersey", saved.slug);
  const pdp = await get(`/product/${saved.slug}`);
  check("New product page is live immediately", pdp.status === 200 && pdp.html.includes("Real Madrid 26/27 Away Jersey"));
  check("Price shown from Firestore", pdp.html.includes("$110"));
  check("Structured data present", pdp.html.includes('"@type":"Product"') && pdp.html.includes('"price":"110.00"'));
  check("Appears on the club page", (await get("/clubs/real-madrid")).html.includes("Real Madrid 26/27 Away Jersey"));
  check("Appears in the New Season collection", (await get("/collections/new-season")).html.includes("Real Madrid 26/27 Away Jersey"));

  console.log("\nSecurity checks on Cloud Functions");
  const noToken = await post("/api/admin/saveProduct", {});
  check("Admin API without sign-in is refused", noToken.status === 401, String(noToken.status));
  const badToken = await post("/api/admin/updateOrderStatus", { orderId: "x", status: "confirmed" }, { authorization: "Bearer not-a-real-token" });
  check("Admin API with an invalid token is refused", badToken.status === 401, String(badToken.status));
  const upload = await post("/api/admin/upload", { type: "blob.generate-presigned-url", payload: { pathname: "products/x.png", clientPayload: null, multipart: false } });
  check("Photo upload tokens need an admin", upload.status === 401, String(upload.status));
  const rv = await post("/api/revalidate", { tags: ["products"] });
  check("Cache refresh endpoint rejects unauthenticated calls", rv.status === 401, String(rv.status));
  const customer = { fullName: "Test Customer", phone: "71 000 111", governorate: "Beirut", city: "Achrafieh", street: "Main St", building: "B1" };
  const checkout = async (data: unknown, ip = "10.1.0.1") => {
    const r = await post("/api/checkout", data, { "x-forwarded-for": ip });
    const j = await r.json();
    return { status: r.status, code: j.error?.code as string | undefined, message: j.error?.message as string | undefined, result: j.result };
  };
  const expectCheckoutError = async (name: string, data: unknown, code: string) => {
    const r = await checkout(data);
    check(name, r.code === code, `${r.status} ${r.code}: ${r.message}`);
  };
  await expectCheckoutError("Ordering more than in stock is refused", { customer, lines: [{ productId: saved.id, variantId: "l", quantity: 2 }], paymentMethod: "cod", requestId: crypto.randomUUID() }, "failed-precondition");
  await expectCheckoutError("Ordering a sold-out size is refused", { customer, lines: [{ productId: saved.id, variantId: "xl", quantity: 1 }], paymentMethod: "cod", requestId: crypto.randomUUID() }, "failed-precondition");
  await expectCheckoutError("Malformed checkout is refused", { customer: { ...customer, phone: "abc" }, lines: [{ productId: saved.id, variantId: "s", quantity: 1 }], paymentMethod: "cod", requestId: crypto.randomUUID() }, "invalid-argument");
  const tamperedRes = await checkout(
    { customer, lines: [{ productId: saved.id, variantId: "s", quantity: 1, price: 1, unitPrice: 1 }], paymentMethod: "cod", requestId: crypto.randomUUID(), total: 1, deliveryFee: 0 },
    "10.1.0.2",
  );
  const tampered = tamperedRes.result as { number: string; total: number };
  check("Client-sent prices are ignored", tampered?.total === 11000 + 300, `charged ${tampered?.total}`);
  await asAdmin("updateOrderStatusCore", { orderId: tampered.number, status: "cancelled", note: "test order" });
  check("Cancelling restores stock", (await variants(saved.id)).s === 3);

  console.log("\nCustomer checkout in the browser");
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({ executablePath: exe, args: chromium.args, headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("    [browser error]", e.message));
  const shot = async (p: Page, name: string, full = false) => p.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: full });

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1800));
  await shot(page, "01-home-desktop");
  await shot(page, "01b-home-desktop-full", true);
  await page.goto(`${BASE}/shop`, { waitUntil: "networkidle0" });
  await shot(page, "02-shop-desktop");
  await page.goto(`${BASE}/product/${saved.slug}`, { waitUntil: "networkidle0" });
  await shot(page, "03-product-desktop");

  // Mobile customer journey
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1800));
  await shot(page, "04-home-mobile");
  await shot(page, "04b-home-mobile-full", true);
  await page.goto(`${BASE}/product/${saved.slug}`, { waitUntil: "networkidle0" });
  await shot(page, "05-product-mobile");
  await page.click('button[aria-label^="Size M"]');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Add to bag"));
    btn?.click();
  });
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 900));
  await shot(page, "06-bag-drawer-mobile");
  const bag = await page.evaluate(() => JSON.parse(localStorage.getItem("stryke-bag") || "{}"));
  check("Item added to the local bag", bag?.state?.items?.[0]?.size === "M" && bag.state.items[0].quantity === 1);

  await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle0" });
  await page.type('input[name="fullName"]', "Karim Haddad");
  await page.type('input[name="phone"]', "71 123 456");
  await page.select('select[name="governorate"]', "Beirut");
  await page.type('input[name="city"]', "Achrafieh");
  await page.type('input[name="street"]', "Sursock Street");
  await page.type('input[name="building"]', "Building 12");
  await page.type('input[name="floor"]', "3");
  await new Promise((r) => setTimeout(r, 1200));
  await shot(page, "07-checkout-mobile", true);
  const totalText = await page.evaluate(() => document.querySelector('[aria-live="polite"].font-display')?.textContent ?? "");
  check("Checkout total includes Beirut delivery", totalText.includes("113"), totalText);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type="submit"]')].find((b) => b.textContent?.includes("Place order")) as HTMLButtonElement | undefined;
    btn?.click();
  });
  await page.waitForFunction(() => location.pathname === "/checkout/success", { timeout: 15000 });
  await page.waitForSelector('[data-testid="order-number"]', { timeout: 5000 });
  const orderNumber = await page.$eval('[data-testid="order-number"]', (el) => el.textContent?.trim() ?? "");
  await shot(page, "08-confirmation-mobile", true);
  check("Order confirmation shows an order number", /^STK-[A-Z2-9]{6}$/.test(orderNumber), orderNumber);
  const bagAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("stryke-bag") || "{}"));
  check("Bag cleared after the order is saved", (bagAfter?.state?.items ?? []).length === 0);

  const order = (await db.doc(`orders/${orderNumber}`).get()).data();
  check("Order stored in Firestore as pending COD", order?.status === "pending" && order?.payment?.method === "cod" && order?.payment?.status === "unpaid");
  check("Order totals calculated on the server", order?.subtotal === 11000 && order?.deliveryFee === 300 && order?.total === 11300, `${order?.total}`);
  check("Customer phone normalised", order?.customer?.phone === "+96171123456");
  check("Stock reserved for size M", (await variants(saved.id)).m === 4);

  console.log("\nAdmin manages the order through delivery");
  for (const status of ["confirmed", "preparing", "shipped", "delivered"]) {
    await asAdmin("updateOrderStatusCore", { orderId: orderNumber, status });
  }
  await asAdmin("addOrderNoteCore", { orderId: orderNumber, text: "Delivered to customer, cash collected" });
  const done = (await db.doc(`orders/${orderNumber}`).get()).data();
  check("Order delivered and marked paid", done?.status === "delivered" && done?.payment?.status === "paid");
  check("Status history recorded", done?.statusHistory?.length === 5);
  await expectReject("Delivered order cannot be cancelled", asAdmin("updateOrderStatusCore", { orderId: orderNumber, status: "cancelled" }), "failed-precondition");
  const audit = await db.collection("adminAuditLogs").get();
  check("Admin actions written to the audit log", audit.size >= 7, `${audit.size} entries`);

  // More screenshots
  await page.goto(`${BASE}/product/${saved.slug}`, { waitUntil: "networkidle0" });
  const stockHtml = await page.content();
  check("Product page reflects the reduced stock", stockHtml.includes("Only 1 left") || stockHtml.includes("only 1 left"));
  await page.goto(`${BASE}/clubs/real-madrid`, { waitUntil: "networkidle0" });
  await shot(page, "09-club-mobile");
  await page.goto(`${BASE}/missing-page`, { waitUntil: "networkidle0" });
  await shot(page, "10-404-mobile");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle0" });
  await shot(page, "11-admin-login-desktop");
  await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle0" });
  await page.goto(`${BASE}/category/football-boots`, { waitUntil: "networkidle0" });
  await shot(page, "12-boots-desktop");
  await browser.close();
} catch (e) {
  console.error(e);
  check("Unexpected error", false, (e as Error).message);
} finally {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in .e2e/screenshots`);
  if (failed.length) exitCode = 1;
  web.close();
  process.exit(exitCode);
}
