/**
 * Domain constants shared by the storefront, the admin dashboard and Cloud Functions.
 * Keep this file dependency-free: it is bundled into all three.
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Forward-only fulfilment pipeline. Cancelled is reachable from any non-final state. */
const PIPELINE: OrderStatus[] = ["pending", "confirmed", "preparing", "shipped", "delivered"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  if (from === "delivered" || from === "cancelled") return false;
  if (to === "cancelled") return true;
  return PIPELINE.indexOf(to) > PIPELINE.indexOf(from);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_STATUSES.filter((s) => canTransition(from, s));
}

export const PAYMENT_METHODS = ["cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
};

export const PRODUCT_TYPES = ["jersey", "boots", "apparel", "equipment", "accessory"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  jersey: "Jersey",
  boots: "Football boots",
  apparel: "Apparel",
  equipment: "Equipment",
  accessory: "Accessory",
};

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SIZE_PRESETS: Record<string, { label: string; sizes: string[] }> = {
  apparel: { label: "Clothing (XS–3XL)", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
  kids: { label: "Kids (age)", sizes: ["4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y", "14-15Y"] },
  footwearEU: {
    label: "Footwear (EU)",
    sizes: ["36", "36.5", "37.5", "38", "38.5", "39", "40", "40.5", "41", "42", "42.5", "43", "44", "44.5", "45", "46", "47"],
  },
  ball: { label: "Football size", sizes: ["3", "4", "5"] },
  oneSize: { label: "One size", sizes: ["One size"] },
};

/** Lebanon's nine governorates — used as delivery regions. Fees are configured by the admin. */
export const LEBANON_GOVERNORATES = [
  "Beirut",
  "Mount Lebanon",
  "Keserwan-Jbeil",
  "North Lebanon",
  "Akkar",
  "Bekaa",
  "Baalbek-Hermel",
  "South Lebanon",
  "Nabatieh",
] as const;

export const SUPPORTED_CURRENCIES = {
  USD: { code: "USD", symbol: "$", locale: "en-US", fractionDigits: 2 },
  LBP: { code: "LBP", symbol: "LBP", locale: "en-LB", fractionDigits: 0 },
} as const;
export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
export const DEFAULT_MAX_QTY_PER_LINE = 10;
export const MAX_CART_LINES = 30;
export const ORDER_NUMBER_PREFIX = "STK";

/** Firestore collection names — single source of truth. */
export const COL = {
  products: "products",
  categories: "categories",
  brands: "brands",
  clubs: "clubs",
  collections: "collections",
  orders: "orders",
  storeSettings: "storeSettings",
  homepageContent: "homepageContent",
  inventoryMovements: "inventoryMovements",
  adminAuditLogs: "adminAuditLogs",
  rateLimits: "rateLimits",
  /** Idempotency records for checkout submissions (server-only). */
  orderRequests: "orderRequests",
} as const;

export const SETTINGS_DOC = "main";
export const HOMEPAGE_PUBLISHED_DOC = "published";
export const HOMEPAGE_DRAFT_DOC = "draft";

/** Cache tags used by the storefront for on-demand revalidation. */
export const CACHE_TAGS = {
  products: "products",
  taxonomy: "taxonomy",
  collections: "collections",
  settings: "settings",
  homepage: "homepage",
  product: (slug: string) => `product:${slug}`,
} as const;
