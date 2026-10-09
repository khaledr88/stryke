import { describe, expect, it } from "vitest";
import { filterProducts, matchesCollection, searchScore, toSummary } from "@shared/catalog";
import { canTransition, nextStatuses } from "@shared/constants";
import { DEFAULT_SETTINGS } from "@shared/defaults";
import { discountPercent, effectivePrice, formatMoney, toMinor } from "@shared/money";
import { formatPhoneForDisplay, normalizePhone, whatsappLink } from "@shared/phone";
import { deliveryFeeFor, mergeLines, priceCart } from "@shared/pricing";
import { checkoutCustomerSchema, productInputSchema } from "@shared/schemas";
import { slugify, variantId } from "@shared/text";
import type { Product, StoreSettings } from "@shared/types";

const settings: StoreSettings = {
  ...DEFAULT_SETTINGS,
  delivery: {
    ...DEFAULT_SETTINGS.delivery,
    zones: DEFAULT_SETTINGS.delivery.zones.map((z) => ({ ...z, enabled: z.governorate !== "Akkar", fee: z.governorate === "Akkar" ? null : 400 })),
    freeDeliveryThreshold: 20000,
  },
};

function product(over: Partial<Product> = {}): Product {
  return {
    id: "p1", slug: "p1", name: "Jersey", brandId: "b", brandName: "Brand", categoryId: "c", categoryName: "Cat", clubId: null, clubName: null,
    season: null, productType: "jersey", description: "", price: 10000, salePrice: null, currency: "USD", sku: "J", images: [],
    sizes: ["S", "M"], colors: [], variants: [{ id: "s", size: "S", color: null, sku: "J-S", stock: 2 }, { id: "m", size: "M", color: null, sku: "J-M", stock: 0 }],
    tags: ["new-season"], isNew: true, isBestSeller: false, isFeatured: false, isLimited: false, status: "published", customization: null,
    totalStock: 2, minVariantStock: 0, inStock: true, onSale: false, salesCount: 3, createdAt: 1, updatedAt: 1, publishedAt: 1, ...over,
  };
}

describe("money", () => {
  it("formats and converts minor units", () => {
    expect(toMinor(109.99)).toBe(10999);
    expect(formatMoney(10999)).toBe("$109.99");
    expect(formatMoney(11000)).toBe("$110");
    expect(formatMoney(1500000, "LBP")).toBe("1,500,000 LBP");
  });
  it("only honours sale prices below the regular price", () => {
    expect(effectivePrice(10000, 8000)).toBe(8000);
    expect(effectivePrice(10000, 12000)).toBe(10000);
    expect(discountPercent(10000, 7500)).toBe(25);
    expect(discountPercent(10000, null)).toBeNull();
  });
});

describe("phone numbers", () => {
  it.each([
    ["71 123 456", "+96171123456"],
    ["03 123456", "+9613123456"],
    ["+961 71 123 456", "+96171123456"],
    ["00961-76-123456", "+96176123456"],
    ["+44 7700 900123", "+447700900123"],
  ])("normalises %s", (input, out) => expect(normalizePhone(input)).toBe(out));
  it.each(["12", "abc", "71 12", ""])("rejects %s", (input) => expect(normalizePhone(input)).toBeNull());
  it("formats and links", () => {
    expect(formatPhoneForDisplay("+96171123456")).toBe("+961 71 123 456");
    expect(whatsappLink("71 123 456", "Hi")).toBe("https://wa.me/96171123456?text=Hi");
  });
});

describe("order status rules", () => {
  it("moves forward only and cancels before delivery", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("shipped", "confirmed")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "pending")).toBe(false);
    expect(nextStatuses("preparing")).toEqual(["shipped", "delivered", "cancelled"]);
  });
});

describe("pricing", () => {
  it("merges duplicate lines", () => {
    const merged = mergeLines([
      { productId: "p1", variantId: "s", quantity: 1, customization: null },
      { productId: "p1", variantId: "s", quantity: 2, customization: null },
    ]);
    expect(merged).toEqual([{ productId: "p1", variantId: "s", quantity: 3, customization: null }]);
  });
  it("prices a cart with delivery", () => {
    const r = priceCart([{ productId: "p1", variantId: "s", quantity: 1, customization: null }], new Map([["p1", product()]]), settings, "Beirut");
    expect(r.problems).toEqual([]);
    expect(r).toMatchObject({ subtotal: 10000, deliveryFee: 400, total: 10400 });
  });
  it("applies free delivery at the threshold and blocks unconfigured regions", () => {
    expect(deliveryFeeFor(settings, "Beirut", 20000)).toEqual({ fee: 0, free: true });
    expect(deliveryFeeFor(settings, "Akkar", 100)).toEqual({ fee: null, free: false });
  });
  it("reports sold-out sizes and over-limit quantities", () => {
    const r = priceCart(
      [
        { productId: "p1", variantId: "m", quantity: 1, customization: null },
        { productId: "p1", variantId: "s", quantity: 11, customization: null },
      ],
      new Map([["p1", product()]]),
      settings,
      "Beirut",
    );
    expect(r.problems.map((p) => p.code)).toEqual(["insufficient_stock", "quantity_limit"]);
  });
});

describe("validation", () => {
  it("accepts a typical Lebanese checkout", () => {
    const ok = checkoutCustomerSchema.safeParse({ fullName: "Rana K", phone: "03 123456", governorate: "South Lebanon", city: "Saida", street: "Riad El Solh", building: "Bldg 3" });
    expect(ok.success).toBe(true);
  });
  it("rejects bad sale prices and duplicate variants", () => {
    const base = {
      name: "Test jersey", brandId: "b", categoryId: "c", productType: "jersey", price: 1000, sku: "X", status: "draft", sizes: ["S"],
      variants: [{ size: "S", color: null, stock: 1 }],
    };
    expect(productInputSchema.safeParse({ ...base, salePrice: 1000 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, variants: [{ size: "S", stock: 1 }, { size: "S", stock: 2 }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, status: "published" }).success).toBe(false); // no photos
    expect(productInputSchema.safeParse(base).success).toBe(true);
  });
});

describe("catalogue helpers", () => {
  const list = [
    toSummary(product()),
    toSummary(product({ id: "p2", slug: "p2", name: "Real Madrid Away", clubId: "rm", clubName: "Real Madrid", price: 9000, salePrice: 7000, onSale: true, createdAt: 5 })),
    toSummary(product({ id: "p3", slug: "p3", name: "Boot", productType: "boots", inStock: false, totalStock: 0, tags: [] })),
  ];
  it("searches by club and name", () => {
    expect(searchScore("madrid", list[1])).toBeGreaterThan(0);
    expect(searchScore("madrid", list[0])).toBe(0);
    expect(filterProducts(list, { q: "real away" }).map((p) => p.id)).toEqual(["p2"]);
  });
  it("filters and sorts", () => {
    expect(filterProducts(list, { onSale: true }).map((p) => p.id)).toEqual(["p2"]);
    expect(filterProducts(list, { inStock: true }).length).toBe(2);
    expect(filterProducts(list, { sort: "price-asc" })[0].id).toBe("p2");
    expect(filterProducts(list, { sizes: ["M"] })).toEqual([]);
  });
  it("matches collection rules", () => {
    expect(matchesCollection(list[0], { tag: "new-season" })).toBe(true);
    expect(matchesCollection(list[2], { tag: "new-season" })).toBe(false);
  });
  it("builds stable slugs and variant ids", () => {
    expect(slugify("Real Madrid 26/27 Home Jersey")).toBe("real-madrid-26-27-home-jersey");
    expect(variantId("XL", "Navy Blue")).toBe("xl__navy-blue");
    expect(variantId("42.5", null)).toBe("42-5");
  });
});
