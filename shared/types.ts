import type {
  CurrencyCode,
  OrderStatus,
  PaymentMethod,
  ProductStatus,
  ProductType,
} from "./constants";

/**
 * Data-transfer shapes. In Firestore, timestamp fields are stored as native
 * Timestamps; everything that leaves the data layer is converted to epoch
 * milliseconds so it can cross the server/client boundary safely.
 */
export type Millis = number;

export interface StoredImage {
  /** Firebase Storage object path, e.g. products/{id}/abc.webp. Empty for external/static assets. */
  path: string;
  /** Public download URL. */
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductVariant {
  /** Stable id: derived from size + color, e.g. "m__white". */
  id: string;
  size: string;
  color: string | null;
  sku: string;
  stock: number;
}

export interface ProductCustomization {
  enabled: boolean;
  /** Extra charge in minor units when a name or number is printed. */
  price: number;
  nameMaxLength: number;
  numberMin: number;
  numberMax: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  clubId: string | null;
  clubName: string | null;
  season: string | null;
  productType: ProductType;
  description: string;
  /** Minor units. */
  price: number;
  salePrice: number | null;
  currency: CurrencyCode;
  sku: string;
  images: StoredImage[];
  /** Storage paths of images, for reference checks before deleting files. */
  imagePaths?: string[];
  sizes: string[];
  colors: ProductColor[];
  variants: ProductVariant[];
  tags: string[];
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  isLimited: boolean;
  /** Marks development seed data so it is never mistaken for real inventory. */
  isSample?: boolean;
  status: ProductStatus;
  customization: ProductCustomization | null;
  totalStock: number;
  /** Lowest stock across variants (0 if any variant is sold out). */
  minVariantStock: number;
  inStock: boolean;
  onSale: boolean;
  salesCount: number;
  createdAt: Millis;
  updatedAt: Millis;
  /** Last time product content (not stock) was saved — used for edit-conflict detection. */
  contentUpdatedAt?: Millis;
  publishedAt: Millis | null;
}

/** Light shape used for listings and the search index. */
export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  clubId: string | null;
  clubName: string | null;
  productType: ProductType;
  price: number;
  salePrice: number | null;
  image: StoredImage | null;
  hoverImage: StoredImage | null;
  sizes: { size: string; available: boolean }[];
  tags: string[];
  isNew: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  isLimited: boolean;
  isSample?: boolean;
  totalStock: number;
  inStock: boolean;
  onSale: boolean;
  salesCount: number;
  createdAt: Millis;
  season: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: StoredImage | null;
  /** Label used in the main navigation, e.g. "Football". Empty = not in nav. */
  navLabel: string;
  showInNav: boolean;
  defaultProductType: ProductType;
  sizePreset: string;
  order: number;
  visible: boolean;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo: StoredImage | null;
  image: StoredImage | null;
  description: string;
  order: number;
  visible: boolean;
}

export interface Club {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  league: string;
  country: string;
  crest: StoredImage | null;
  image: StoredImage | null;
  /** Primary and secondary club colours for the crest fallback. */
  colors: [string, string];
  order: number;
  visible: boolean;
  featured: boolean;
}

export interface CollectionRule {
  categoryId?: string | null;
  brandId?: string | null;
  clubId?: string | null;
  tag?: string | null;
  onSale?: boolean;
  isNew?: boolean;
  isLimited?: boolean;
  isBestSeller?: boolean;
}

export interface ProductCollection {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: StoredImage | null;
  rule: CollectionRule;
  order: number;
  visible: boolean;
}

export interface DeliveryZone {
  id: string;
  governorate: string;
  /** Minor units. null = not configured yet (checkout blocked for this region). */
  fee: number | null;
  enabled: boolean;
  eta: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapUrl: string;
    hours: string;
  };
  social: {
    instagram: string;
    facebook: string;
    tiktok: string;
  };
  currency: CurrencyCode;
  delivery: {
    zones: DeliveryZone[];
    /** Minor units; null disables free delivery. */
    freeDeliveryThreshold: number | null;
    note: string;
  };
  payments: {
    cod: { enabled: boolean; note: string };
  };
  inventory: {
    lowStockThreshold: number;
  };
  orders: {
    maxQuantityPerLine: number;
    whatsappConfirmation: boolean;
  };
  policies: {
    about: string;
    shipping: string;
    returns: string;
    privacy: string;
    terms: string;
  };
  updatedAt?: Millis;
}

export interface HeroSlide {
  id: string;
  eyebrow: string;
  heading: string;
  body: string;
  image: StoredImage | null;
  mobileImage: StoredImage | null;
  /** Focal point for cropping, 0–100. */
  focusX: number;
  focusY: number;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string } | null;
  enabled: boolean;
}

export interface PromoBanner {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  image: StoredImage | null;
  enabled: boolean;
}

export type HomeSectionKey =
  | "categories"
  | "brands"
  | "clubs"
  | "bestSellers"
  | "newArrivals"
  | "promos"
  | "featured";

export interface HomepageContent {
  announcement: { enabled: boolean; text: string; href: string };
  heroSlides: HeroSlide[];
  sectionOrder: HomeSectionKey[];
  hiddenSections: HomeSectionKey[];
  categoryOrder: string[];
  promos: PromoBanner[];
  featuredCollectionIds: string[];
  updatedAt?: Millis;
  publishedAt?: Millis;
}

export interface OrderItemSnapshot {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  brandName: string;
  clubName: string | null;
  image: string | null;
  size: string;
  color: string | null;
  sku: string;
  /** Minor units, server-calculated, includes customization surcharge. */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  customization: { name: string; number: string; price: number } | null;
}

export interface OrderNote {
  id: string;
  text: string;
  by: string;
  at: Millis;
}

export interface OrderStatusChange {
  status: OrderStatus;
  at: Millis;
  by: string;
  note?: string;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  items: OrderItemSnapshot[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  currency: CurrencyCode;
  payment: { method: PaymentMethod; status: "unpaid" | "paid" | "refunded" };
  customer: { fullName: string; phone: string; whatsapp: string | null; email: string | null };
  delivery: {
    governorate: string;
    city: string;
    street: string;
    building: string;
    floor: string;
    instructions: string;
  };
  notes: string;
  internalNotes: OrderNote[];
  statusHistory: OrderStatusChange[];
  stockReleased: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

/** What the customer gets back after checkout — no personal data beyond what they typed. */
export interface PlacedOrderReceipt {
  orderId: string;
  number: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  currency: CurrencyCode;
  itemCount: number;
  items: Pick<OrderItemSnapshot, "name" | "size" | "quantity" | "lineTotal" | "image" | "customization">[];
  whatsappUrl: string | null;
  createdAt: Millis;
}
