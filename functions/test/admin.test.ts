import { beforeEach, describe, expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { placeOrderCore } from "../src/orders/placeOrder";
import { addOrderNoteCore, updateOrderStatusCore } from "../src/orders/manageOrder";
import { deleteProductCore, duplicateProductCore, saveProductCore, setProductStatusCore } from "../src/products/manageProduct";
import { adjustStockCore } from "../src/inventory/adjustStock";
import { requireAdmin } from "../src/lib/guards";
import { syncTaxonomyName } from "../src/triggers/taxonomySync";
import { admin, newDb, orderInput, seedProduct, seedStore } from "./helpers";

let db: Firestore;

const jersey = (over: Record<string, unknown> = {}) => ({
  name: "Real Madrid 26/27 Home Jersey",
  brandId: "adidas",
  categoryId: "football-jerseys",
  clubId: "real-madrid",
  season: "26/27",
  productType: "jersey",
  description: "Home shirt.",
  price: 11000,
  salePrice: null,
  sku: "rm-h-27",
  images: [{ path: "products/new/1.webp", url: "https://example.test/1.webp", alt: "Front" }],
  colors: [],
  sizes: ["S", "M", "L"],
  variants: [
    { size: "S", color: null, sku: "", stock: 4, baseline: null },
    { size: "M", color: null, sku: "", stock: 6, baseline: null },
    { size: "L", color: null, sku: "", stock: 2, baseline: null },
  ],
  tags: ["new-season"],
  isNew: true,
  isBestSeller: false,
  isFeatured: true,
  isLimited: false,
  status: "published",
  customization: { enabled: true, price: 1500, nameMaxLength: 12, numberMin: 1, numberMax: 99 },
  ...over,
});

async function variants(id: string) {
  return ((await db.doc(`products/${id}`).get()).get("variants") as { id: string; stock: number }[]).reduce<Record<string, number>>(
    (acc, v) => ({ ...acc, [v.id]: v.stock }),
    {},
  );
}

describe("admin authorization", () => {
  it("requires the admin custom claim", () => {
    expect(() => requireAdmin({ auth: undefined })).toThrowError(/administrator/);
    expect(() => requireAdmin({ auth: { uid: "u", token: { email: "x@y.z" } } as never })).toThrowError(/not an administrator/);
    expect(requireAdmin({ auth: { uid: "u", token: { admin: true, email: "a@b.c" } } as never })).toEqual({ uid: "u", email: "a@b.c" });
  });
});

describe("products", () => {
  beforeEach(async () => {
    db = newDb();
    await seedStore(db);
  });

  it("publishes a new product with denormalised names, stock stats and an initial inventory log", async () => {
    const r = await saveProductCore(db, admin, jersey());
    expect(r.slug).toBe("real-madrid-26-27-home-jersey");
    const p = (await db.doc(`products/${r.id}`).get()).data()!;
    expect(p).toMatchObject({ brandName: "Adidas", clubName: "Real Madrid", status: "published", totalStock: 12, minVariantStock: 2, inStock: true, sku: "RM-H-27" });
    expect(p.variants.map((v: { id: string }) => v.id)).toEqual(["s", "m", "l"]);
    expect(p.publishedAt).toBeTruthy();
    expect((await db.collection("inventoryMovements").get()).size).toBe(3);
    expect((await db.collection("adminAuditLogs").get()).docs[0].get("action")).toBe("product.create");
  });

  it("keeps slugs unique", async () => {
    const a = await saveProductCore(db, admin, jersey());
    const b = await saveProductCore(db, admin, jersey({ sku: "other" }));
    expect(a.slug).not.toBe(b.slug);
    expect(b.slug).toBe("real-madrid-26-27-home-jersey-2");
  });

  it("refuses to publish without photos and rejects invalid sale prices", async () => {
    await expect(saveProductCore(db, admin, jersey({ images: [] }))).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(saveProductCore(db, admin, jersey({ salePrice: 12000 }))).rejects.toMatchObject({ code: "invalid-argument" });
    const draft = await saveProductCore(db, admin, jersey({ images: [], status: "draft" }));
    await expect(setProductStatusCore(db, admin, { productId: draft.id, status: "published" })).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("merges admin stock edits as deltas so orders placed meanwhile are not overwritten", async () => {
    const r = await saveProductCore(db, admin, jersey());
    const loaded = (await db.doc(`products/${r.id}`).get()).data()!;
    // A customer buys 2 x M while the admin has the edit form open (form shows M = 6).
    await placeOrderCore(db, orderInput([{ productId: r.id, variantId: "m", quantity: 2 }]), { ip: "1.1.1.1" });
    expect((await variants(r.id)).m).toBe(4);
    // Admin receives 5 more M and types 11 (6 + 5) in the form.
    await saveProductCore(
      db,
      admin,
      jersey({
        id: r.id,
        expectedUpdatedAt: loaded.contentUpdatedAt.toMillis(),
        variants: [
          { size: "S", color: null, sku: "", stock: 4, baseline: 4 },
          { size: "M", color: null, sku: "", stock: 11, baseline: 6 },
          { size: "L", color: null, sku: "", stock: 2, baseline: 2 },
        ],
      }),
    );
    expect(await variants(r.id)).toEqual({ s: 4, m: 9, l: 2 });
  });

  it("detects conflicting content edits", async () => {
    const r = await saveProductCore(db, admin, jersey(), 1000);
    const loadedAt = 1000;
    await saveProductCore(db, admin, jersey({ id: r.id, name: "Edited elsewhere", expectedUpdatedAt: loadedAt }), 2000);
    await expect(saveProductCore(db, admin, jersey({ id: r.id, expectedUpdatedAt: loadedAt }), 3000)).rejects.toMatchObject({ code: "aborted" });
  });

  it("duplicates as a draft with zero stock and deletes products", async () => {
    const r = await saveProductCore(db, admin, jersey());
    const copy = await duplicateProductCore(db, admin, { productId: r.id });
    const c = (await db.doc(`products/${copy.id}`).get()).data()!;
    expect(c).toMatchObject({ status: "draft", totalStock: 0, name: "Real Madrid 26/27 Home Jersey (copy)" });
    const del = await deleteProductCore(db, admin, { productId: copy.id });
    expect(del.imagePaths).toEqual(["products/new/1.webp"]);
    expect((await db.doc(`products/${copy.id}`).get()).exists).toBe(false);
  });

  it("adjusts stock with a logged reason and never below zero", async () => {
    await seedProduct(db, "p1");
    await adjustStockCore(db, admin, { productId: "p1", variantId: "s", mode: "delta", value: 3, reason: "Delivery received" });
    await adjustStockCore(db, admin, { productId: "p1", variantId: "l", mode: "set", value: 0, reason: "Damaged" });
    expect(await variants("p1")).toEqual({ s: 8, m: 5, l: 0 });
    await expect(adjustStockCore(db, admin, { productId: "p1", variantId: "m", mode: "delta", value: -9, reason: "Count" })).rejects.toMatchObject({
      code: "failed-precondition",
    });
    const p = (await db.doc("products/p1").get()).data()!;
    expect(p.minVariantStock).toBe(0);
  });

  it("renames brands on products", async () => {
    await seedProduct(db, "p1");
    await seedProduct(db, "p2");
    const n = await syncTaxonomyName(db, "brands", "adidas", "adidas Originals");
    expect(n).toBe(2);
    expect((await db.doc("products/p2").get()).get("brandName")).toBe("adidas Originals");
  });
});

describe("order management", () => {
  beforeEach(async () => {
    db = newDb();
    await seedStore(db);
    await seedProduct(db, "p1");
  });

  async function place(qty = 2) {
    const { receipt } = await placeOrderCore(db, orderInput([{ productId: "p1", variantId: "m", quantity: qty }]), { ip: `9.9.9.${qty}` });
    return receipt.number;
  }

  it("moves an order through to delivery and marks it paid", async () => {
    const id = await place();
    for (const status of ["confirmed", "preparing", "shipped", "delivered"]) {
      await updateOrderStatusCore(db, admin, { orderId: id, status });
    }
    const o = (await db.doc(`orders/${id}`).get()).data()!;
    expect(o.status).toBe("delivered");
    expect(o.payment.status).toBe("paid");
    expect(o.statusHistory.map((h: { status: string }) => h.status)).toEqual(["pending", "confirmed", "preparing", "shipped", "delivered"]);
    await expect(updateOrderStatusCore(db, admin, { orderId: id, status: "cancelled" })).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("blocks backwards moves", async () => {
    const id = await place();
    await updateOrderStatusCore(db, admin, { orderId: id, status: "shipped" });
    await expect(updateOrderStatusCore(db, admin, { orderId: id, status: "confirmed" })).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("restores stock exactly once when an order is cancelled", async () => {
    const id = await place(2);
    expect(await variants("p1")).toMatchObject({ m: 3 });
    await updateOrderStatusCore(db, admin, { orderId: id, status: "cancelled", note: "Customer changed mind" });
    expect(await variants("p1")).toMatchObject({ m: 5 });
    const o = (await db.doc(`orders/${id}`).get()).data()!;
    expect(o.stockReleased).toBe(true);
    await expect(updateOrderStatusCore(db, admin, { orderId: id, status: "cancelled" })).rejects.toMatchObject({ code: "failed-precondition" });
    expect(await variants("p1")).toMatchObject({ m: 5 });
    expect((await db.doc("products/p1").get()).get("salesCount")).toBe(0);
  });

  it("can cancel without restocking", async () => {
    const id = await place(1);
    await updateOrderStatusCore(db, admin, { orderId: id, status: "cancelled", restock: false });
    expect(await variants("p1")).toMatchObject({ m: 4 });
  });

  it("adds internal notes", async () => {
    const id = await place();
    await addOrderNoteCore(db, admin, { orderId: id, text: "Called customer, delivering Tuesday" });
    const o = (await db.doc(`orders/${id}`).get()).data()!;
    expect(o.internalNotes).toHaveLength(1);
    expect(o.internalNotes[0].by).toBe("owner@stryke.test");
  });
});
