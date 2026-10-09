import { beforeEach, describe, expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { placeOrderCore } from "@core/orders/placeOrder";
import { newDb, orderInput, seedProduct, seedStore, uuid } from "./helpers";

let db: Firestore;
let ipCounter = 0;
const ctx = () => ({ ip: `10.0.0.${++ipCounter}` });

async function stockOf(id: string, variant: string) {
  const snap = await db.doc(`products/${id}`).get();
  return (snap.get("variants") as { id: string; stock: number }[]).find((v) => v.id === variant)!.stock;
}

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("placeOrder", () => {
  beforeEach(async () => {
    db = newDb();
    await seedStore(db);
    await seedProduct(db, "rm-home");
  });

  it("creates an order with server-calculated prices and reserves stock", async () => {
    const { receipt } = await placeOrderCore(
      db,
      // The client tries to send its own price and total — they must be ignored.
      { ...orderInput([{ productId: "rm-home", variantId: "m", quantity: 2, price: 1 }]), total: 1 },
      ctx(),
    );
    expect(receipt.number).toMatch(/^STK-[A-Z2-9]{6}$/);
    expect(receipt.subtotal).toBe(22000);
    expect(receipt.deliveryFee).toBe(300);
    expect(receipt.total).toBe(22300);
    expect(receipt.whatsappUrl).toContain("wa.me/96171000000");

    const order = (await db.doc(`orders/${receipt.number}`).get()).data()!;
    expect(order.status).toBe("pending");
    expect(order.customer.phone).toBe("+96171123456");
    expect(order.items[0]).toMatchObject({ unitPrice: 11000, quantity: 2, lineTotal: 22000, size: "M" });
    expect(order.payment).toEqual({ method: "cod", status: "unpaid" });
    expect(await stockOf("rm-home", "m")).toBe(3);

    const product = (await db.doc("products/rm-home").get()).data()!;
    expect(product.totalStock).toBe(9);
    expect(product.salesCount).toBe(2);
    const moves = await db.collection("inventoryMovements").get();
    expect(moves.size).toBe(1);
    expect(moves.docs[0].get("delta")).toBe(-2);
  });

  it("uses the sale price when it is lower and applies free delivery over the threshold", async () => {
    await seedStore(db, { freeThreshold: 15000 });
    await seedProduct(db, "sale", { salePrice: 8000 });
    const { receipt } = await placeOrderCore(db, orderInput([{ productId: "sale", variantId: "s", quantity: 2 }]), ctx());
    expect(receipt.subtotal).toBe(16000);
    expect(receipt.deliveryFee).toBe(0);
    expect(receipt.total).toBe(16000);
  });

  it("rejects quantities above available stock", async () => {
    await expectCode(placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "l", quantity: 2 }]), ctx()), "failed-precondition");
    expect(await stockOf("rm-home", "l")).toBe(1);
  });

  it("counts the same size across differently printed lines", async () => {
    await seedProduct(db, "custom", { customization: { enabled: true, price: 1500, nameMaxLength: 12, numberMin: 1, numberMax: 99 } }, { m: 2 });
    const lines = [
      { productId: "custom", variantId: "m", quantity: 2, customization: { name: "Bellingham", number: "5" } },
      { productId: "custom", variantId: "m", quantity: 1, customization: null },
    ];
    await expectCode(placeOrderCore(db, orderInput(lines), ctx()), "failed-precondition");
  });

  it("charges for name and number printing only when the product allows it", async () => {
    await seedProduct(db, "custom", { customization: { enabled: true, price: 1500, nameMaxLength: 12, numberMin: 1, numberMax: 99 } });
    const { receipt } = await placeOrderCore(
      db,
      orderInput([{ productId: "custom", variantId: "s", quantity: 1, customization: { name: "Vini", number: "7" } }]),
      ctx(),
    );
    expect(receipt.subtotal).toBe(12500);
    expect(receipt.items[0].customization).toEqual({ name: "VINI", number: "7", price: 1500 });

    await expectCode(
      placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "s", quantity: 1, customization: { name: "Vini", number: "7" } }]), ctx()),
      "failed-precondition",
    );
  });

  it("rejects hidden products, unknown sizes, unconfigured regions and disabled COD", async () => {
    await seedProduct(db, "draft", { status: "draft" });
    await expectCode(placeOrderCore(db, orderInput([{ productId: "draft", variantId: "s", quantity: 1 }]), ctx()), "failed-precondition");
    await expectCode(placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "xxl", quantity: 1 }]), ctx()), "failed-precondition");
    await expectCode(placeOrderCore(db, orderInput([{ productId: "nope", variantId: "s", quantity: 1 }]), ctx()), "failed-precondition");
    await expectCode(
      placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "s", quantity: 1 }], { customer: { governorate: "Akkar" } }), ctx()),
      "failed-precondition",
    );
    await seedStore(db, { cod: false });
    await expectCode(placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "s", quantity: 1 }]), ctx()), "failed-precondition");
    expect((await db.collection("orders").get()).size).toBe(0);
  });

  it("validates customer input", async () => {
    await expectCode(
      placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "s", quantity: 1 }], { customer: { phone: "12" } }), ctx()),
      "invalid-argument",
    );
    await expectCode(
      placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "s", quantity: 1 }], { customer: { governorate: "Narnia" } }), ctx()),
      "invalid-argument",
    );
    await expectCode(placeOrderCore(db, orderInput([]), ctx()), "invalid-argument");
    await expectCode(placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "s", quantity: 0 }]), ctx()), "invalid-argument");
  });

  it("rejects bot submissions that fill the honeypot", async () => {
    await expectCode(
      placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "s", quantity: 1 }], { company: "ACME" }), ctx()),
      "invalid-argument",
    );
  });

  it("is idempotent for retried submissions", async () => {
    const input = orderInput([{ productId: "rm-home", variantId: "s", quantity: 1 }], { requestId: uuid() });
    const a = await placeOrderCore(db, input, ctx());
    const b = await placeOrderCore(db, input, ctx());
    expect(b.receipt.number).toBe(a.receipt.number);
    expect((await db.collection("orders").get()).size).toBe(1);
    expect(await stockOf("rm-home", "s")).toBe(4);
  });

  it("never oversells the last unit under concurrent checkouts", async () => {
    const attempts = Array.from({ length: 6 }, (_, i) =>
      placeOrderCore(
        db,
        orderInput([{ productId: "rm-home", variantId: "l", quantity: 1 }], { customer: { phone: `70 00${i} 111` } }),
        { ip: `192.168.1.${i}` },
      ).then(
        () => "ok",
        (e) => e.code as string,
      ),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(await stockOf("rm-home", "l")).toBe(0);
    expect((await db.collection("orders").get()).size).toBe(1);
  });

  it("rate-limits repeated orders from the same phone", async () => {
    const results: string[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(
        await placeOrderCore(db, orderInput([{ productId: "rm-home", variantId: "s", quantity: 1 }]), { ip: `172.16.0.${i}` }).then(
          () => "ok",
          (e) => e.code,
        ),
      );
    }
    expect(results.slice(0, 5).every((r) => r === "ok")).toBe(true);
    expect(results[5]).toBe("resource-exhausted");
  });
});
