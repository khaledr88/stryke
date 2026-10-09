import type { CartLine } from "./schemas";
import type { OrderItemSnapshot, Product, StoreSettings } from "./types";
import { effectivePrice } from "./money";

export type PricingProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "status"
  | "price"
  | "salePrice"
  | "variants"
  | "customization"
  | "images"
  | "brandName"
  | "clubName"
>;

export type PricingSettings = Pick<StoreSettings, "delivery" | "orders" | "payments">;

export type PricingProblemCode =
  | "product_unavailable"
  | "variant_unavailable"
  | "insufficient_stock"
  | "quantity_limit"
  | "customization_not_allowed"
  | "customization_invalid"
  | "delivery_unavailable"
  | "cod_unavailable";

export interface PricingProblem {
  code: PricingProblemCode;
  productId?: string;
  variantId?: string;
  /** For insufficient stock: what can still be ordered. */
  available?: number;
  message: string;
}

export interface PricingResult {
  items: OrderItemSnapshot[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  problems: PricingProblem[];
  freeDeliveryApplied: boolean;
}

/** Merge identical lines (same variant + same print) so stock checks see the real total. */
export function mergeLines(lines: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  for (const line of lines) {
    const c = line.customization;
    const key = `${line.productId}|${line.variantId}|${c?.name ?? ""}|${c?.number ?? ""}`;
    const existing = map.get(key);
    if (existing) existing.quantity += line.quantity;
    else map.set(key, { ...line, customization: c && (c.name || c.number) ? { ...c } : null });
  }
  return [...map.values()];
}

export function deliveryFeeFor(
  settings: PricingSettings,
  governorate: string,
  subtotal: number,
): { fee: number | null; free: boolean } {
  const zone = settings.delivery.zones.find((z) => z.governorate === governorate);
  if (!zone || !zone.enabled || zone.fee == null) return { fee: null, free: false };
  const threshold = settings.delivery.freeDeliveryThreshold;
  if (threshold != null && threshold > 0 && subtotal >= threshold) return { fee: 0, free: true };
  return { fee: zone.fee, free: false };
}

/**
 * Authoritative pricing. Runs on the server inside the checkout transaction
 * with freshly read product documents; the browser only uses it for estimates.
 */
export function priceCart(
  rawLines: CartLine[],
  products: Map<string, PricingProduct>,
  settings: PricingSettings,
  governorate: string,
): PricingResult {
  const lines = mergeLines(rawLines);
  const problems: PricingProblem[] = [];
  const items: OrderItemSnapshot[] = [];
  const maxQty = settings.orders.maxQuantityPerLine;

  // Total requested per variant across differently-printed lines.
  const requestedPerVariant = new Map<string, number>();
  for (const l of lines) {
    const k = `${l.productId}|${l.variantId}`;
    requestedPerVariant.set(k, (requestedPerVariant.get(k) ?? 0) + l.quantity);
  }

  for (const line of lines) {
    const product = products.get(line.productId);
    if (!product || product.status !== "published") {
      problems.push({ code: "product_unavailable", productId: line.productId, message: "This product is no longer available." });
      continue;
    }
    const variant = product.variants.find((v) => v.id === line.variantId);
    if (!variant) {
      problems.push({
        code: "variant_unavailable",
        productId: product.id,
        variantId: line.variantId,
        message: `The selected size of ${product.name} is no longer available.`,
      });
      continue;
    }
    if (line.quantity > maxQty) {
      problems.push({
        code: "quantity_limit",
        productId: product.id,
        variantId: variant.id,
        available: maxQty,
        message: `You can order up to ${maxQty} of ${product.name} (${variant.size}) per order.`,
      });
      continue;
    }
    const requested = requestedPerVariant.get(`${product.id}|${variant.id}`) ?? line.quantity;
    if (variant.stock < requested) {
      problems.push({
        code: "insufficient_stock",
        productId: product.id,
        variantId: variant.id,
        available: Math.max(0, variant.stock),
        message:
          variant.stock <= 0
            ? `${product.name} (${variant.size}) just sold out.`
            : `Only ${variant.stock} left of ${product.name} (${variant.size}).`,
      });
      continue;
    }

    let customization: OrderItemSnapshot["customization"] = null;
    const c = line.customization;
    if (c && (c.name || c.number)) {
      const rules = product.customization;
      if (!rules?.enabled) {
        problems.push({
          code: "customization_not_allowed",
          productId: product.id,
          message: `Name and number printing is not available for ${product.name}.`,
        });
        continue;
      }
      const num = c.number === "" ? null : Number(c.number);
      if (c.name.length > rules.nameMaxLength || (num !== null && (num < rules.numberMin || num > rules.numberMax))) {
        problems.push({
          code: "customization_invalid",
          productId: product.id,
          message: `Printing for ${product.name} allows up to ${rules.nameMaxLength} letters and numbers ${rules.numberMin}–${rules.numberMax}.`,
        });
        continue;
      }
      customization = { name: c.name.toUpperCase(), number: c.number, price: rules.price };
    }

    const unitPrice = effectivePrice(product.price, product.salePrice) + (customization?.price ?? 0);
    items.push({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      brandName: product.brandName,
      clubName: product.clubName,
      image: product.images[0]?.url ?? null,
      size: variant.size,
      color: variant.color,
      sku: variant.sku,
      unitPrice,
      quantity: line.quantity,
      lineTotal: unitPrice * line.quantity,
      customization,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const delivery = deliveryFeeFor(settings, governorate, subtotal);
  if (delivery.fee === null) {
    problems.push({ code: "delivery_unavailable", message: `Delivery to ${governorate} is not available yet.` });
  }
  if (!settings.payments.cod.enabled) {
    problems.push({ code: "cod_unavailable", message: "Cash on delivery is temporarily unavailable." });
  }
  const deliveryFee = delivery.fee ?? 0;
  return {
    items,
    itemCount,
    subtotal,
    deliveryFee,
    discount: 0,
    total: subtotal + deliveryFee,
    problems,
    freeDeliveryApplied: delivery.free,
  };
}
