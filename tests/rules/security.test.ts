/**
 * Firestore and Storage security rules tests.
 * Run with the emulators:  npm run test:rules
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";

const root = path.resolve(import.meta.dirname, "../..");
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-stryke",
    firestore: { rules: readFileSync(path.join(root, "firestore.rules"), "utf8") },
    storage: { rules: readFileSync(path.join(root, "storage.rules"), "utf8") },
  });
});
afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "products/live"), { name: "Live", status: "published", price: 100 });
    await setDoc(doc(db, "products/draft"), { name: "Draft", status: "draft", price: 100 });
    await setDoc(doc(db, "orders/STK-AAAAAA"), { status: "pending", customer: { phone: "+96171000000" } });
    await setDoc(doc(db, "categories/jerseys"), { name: "Jerseys", slug: "jerseys", order: 1, visible: true, description: "", navLabel: "", showInNav: false, image: null });
    await setDoc(doc(db, "categories/hidden"), { name: "Hidden", slug: "hidden", order: 2, visible: false, description: "", navLabel: "", showInNav: false, image: null });
    await setDoc(doc(db, "storeSettings/main"), { storeName: "STRYKE", currency: "USD", delivery: { zones: [] } });
    await setDoc(doc(db, "homepageContent/draft"), { heroSlides: [] });
    await setDoc(doc(db, "homepageContent/published"), { heroSlides: [] });
    await setDoc(doc(db, "rateLimits/x"), { count: 1 });
  });
});

const guest = () => env.unauthenticatedContext().firestore();
const customer = () => env.authenticatedContext("someone", { email: "a@b.c" }).firestore();
const admin = () => env.authenticatedContext("owner", { admin: true }).firestore();

describe("catalogue", () => {
  it("guests read published products only", async () => {
    await assertSucceeds(getDoc(doc(guest(), "products/live")));
    await assertFails(getDoc(doc(guest(), "products/draft")));
    await assertSucceeds(getDocs(query(collection(guest(), "products"), where("status", "==", "published"))));
    await assertFails(getDocs(collection(guest(), "products")));
  });
  it("nobody writes products directly — only Cloud Functions", async () => {
    await assertFails(setDoc(doc(guest(), "products/x"), { name: "x", status: "published" }));
    await assertFails(updateDoc(doc(customer(), "products/live"), { price: 1 }));
    await assertFails(updateDoc(doc(admin(), "products/live"), { price: 1 }));
  });
  it("hidden categories are private; admins edit with a valid shape", async () => {
    await assertSucceeds(getDoc(doc(guest(), "categories/jerseys")));
    await assertFails(getDoc(doc(guest(), "categories/hidden")));
    await assertFails(updateDoc(doc(customer(), "categories/jerseys"), { name: "Hacked", updatedAt: serverTimestamp(), updatedBy: "someone" }));
    await assertSucceeds(updateDoc(doc(admin(), "categories/jerseys"), { name: "Football Jerseys", updatedAt: serverTimestamp(), updatedBy: "owner" }));
    await assertFails(updateDoc(doc(admin(), "categories/jerseys"), { slug: "Not A Slug!", updatedAt: serverTimestamp(), updatedBy: "owner" }));
    await assertFails(deleteDoc(doc(customer(), "categories/jerseys")));
  });
});

describe("orders and private data", () => {
  it("customers can't read, list or create orders", async () => {
    await assertFails(getDoc(doc(guest(), "orders/STK-AAAAAA")));
    await assertFails(getDocs(collection(customer(), "orders")));
    await assertFails(addDoc(collection(guest(), "orders"), { total: 1, status: "delivered" }));
  });
  it("admins read orders but change them only through functions", async () => {
    await assertSucceeds(getDoc(doc(admin(), "orders/STK-AAAAAA")));
    await assertFails(updateDoc(doc(admin(), "orders/STK-AAAAAA"), { status: "delivered" }));
  });
  it("internal collections are closed", async () => {
    await assertFails(getDoc(doc(admin(), "rateLimits/x")));
    await assertFails(getDocs(collection(customer(), "inventoryMovements")));
    await assertSucceeds(getDocs(collection(admin(), "adminAuditLogs")));
    await assertFails(addDoc(collection(admin(), "adminAuditLogs"), { action: "fake" }));
  });
});

describe("storefront content", () => {
  it("settings and published homepage are public, drafts are not", async () => {
    await assertSucceeds(getDoc(doc(guest(), "storeSettings/main")));
    await assertSucceeds(getDoc(doc(guest(), "homepageContent/published")));
    await assertFails(getDoc(doc(guest(), "homepageContent/draft")));
  });
  it("only admins change settings, with a valid currency", async () => {
    const valid = { storeName: "STRYKE", currency: "USD", delivery: { zones: [] }, updatedAt: serverTimestamp(), updatedBy: "owner" };
    await assertFails(setDoc(doc(customer(), "storeSettings/main"), { ...valid, updatedBy: "someone" }));
    await assertSucceeds(setDoc(doc(admin(), "storeSettings/main"), valid));
    await assertFails(setDoc(doc(admin(), "storeSettings/main"), { ...valid, currency: "EUR" }));
  });
});

describe("storage", () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  it("only admins upload images; anyone reads product images", async () => {
    await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(), "products/p/1.png"), png, { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(env.authenticatedContext("someone").storage(), "products/p/1.png"), png, { contentType: "image/png" }));
    const adminStorage = env.authenticatedContext("owner", { admin: true }).storage();
    await assertSucceeds(uploadBytes(ref(adminStorage, "products/p/1.png"), png, { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(adminStorage, "products/p/evil.html"), png, { contentType: "text/html" }));
    await assertFails(uploadBytes(ref(adminStorage, "private/p.png"), png, { contentType: "image/png" }));
    await assertSucceeds(getBytes(ref(env.unauthenticatedContext().storage(), "products/p/1.png")));
  });
});
