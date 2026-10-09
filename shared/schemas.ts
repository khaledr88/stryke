import { z } from "zod";
import {
  LEBANON_GOVERNORATES,
  MAX_CART_LINES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
} from "./constants";
import { normalizePhone } from "./phone";

/* ----------------------------------------------------------------------------
 * Checkout (public input — validated on the client for UX and again on the server)
 * --------------------------------------------------------------------------*/

const phone = z
  .string()
  .trim()
  .min(7, "Enter a phone number")
  .max(24)
  .refine((v) => normalizePhone(v) !== null, "Enter a valid phone number, e.g. 71 123 456");

const optionalPhone = z
  .string()
  .trim()
  .max(24)
  .refine((v) => v === "" || normalizePhone(v) !== null, "Enter a valid WhatsApp number or leave it empty");

export const checkoutCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  phone,
  whatsapp: optionalPhone.default(""),
  email: z.union([z.literal(""), z.email("Enter a valid email or leave it empty").max(120)]).default(""),
  governorate: z.enum(LEBANON_GOVERNORATES, { error: "Choose your governorate" }),
  city: z.string().trim().min(2, "Enter your city or town").max(60),
  street: z.string().trim().min(2, "Enter your street").max(120),
  building: z.string().trim().min(1, "Enter the building name or number").max(60),
  floor: z.string().trim().max(20).default(""),
  instructions: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(500).default(""),
});
export type CheckoutCustomerInput = z.input<typeof checkoutCustomerSchema>;
export type CheckoutCustomer = z.output<typeof checkoutCustomerSchema>;

export const lineCustomizationSchema = z.object({
  name: z
    .string()
    .trim()
    .max(20)
    .regex(/^[\p{L} .'-]*$/u, "Letters only")
    .default(""),
  number: z
    .string()
    .trim()
    .regex(/^\d{0,2}$/, "Up to two digits")
    .default(""),
});

export const cartLineSchema = z.object({
  productId: z.string().min(1).max(128),
  variantId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(99),
  customization: lineCustomizationSchema.nullable().default(null),
});
export type CartLineInput = z.input<typeof cartLineSchema>;
export type CartLine = z.output<typeof cartLineSchema>;

export const placeOrderSchema = z.object({
  customer: checkoutCustomerSchema,
  lines: z.array(cartLineSchema).min(1, "Your bag is empty").max(MAX_CART_LINES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  /** Client-generated idempotency key so a double tap never creates two orders. */
  requestId: z.uuid(),
  /** Honeypot field: real customers never fill it. */
  company: z.string().max(0).optional().default(""),
});
export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

/* ----------------------------------------------------------------------------
 * Admin inputs
 * --------------------------------------------------------------------------*/

export const storedImageSchema = z.object({
  path: z.string().max(512).default(""),
  url: z.string().max(2048),
  alt: z.string().max(200).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const money = z.number().int().min(0).max(100_000_000);

export const productInputSchema = z
  .object({
    id: z.string().max(128).optional(),
    name: z.string().trim().min(2, "Name is required").max(140),
    slug: z
      .string()
      .trim()
      .max(90)
      .regex(/^[a-z0-9-]*$/, "Lowercase letters, numbers and dashes only")
      .default(""),
    brandId: z.string().min(1, "Choose a brand"),
    categoryId: z.string().min(1, "Choose a category"),
    clubId: z.string().nullable().default(null),
    season: z.string().trim().max(20).nullable().default(null),
    productType: z.enum(PRODUCT_TYPES),
    description: z.string().trim().max(5000).default(""),
    price: money.refine((v) => v > 0, "Price must be greater than 0"),
    salePrice: money.nullable().default(null),
    sku: z.string().trim().min(1, "SKU is required").max(64),
    images: z.array(storedImageSchema).max(12).default([]),
    colors: z
      .array(z.object({ name: z.string().trim().min(1).max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) }))
      .max(12)
      .default([]),
    sizes: z.array(z.string().trim().min(1).max(20)).min(1, "Add at least one size").max(40),
    variants: z
      .array(
        z.object({
          size: z.string().trim().min(1).max(20),
          color: z.string().trim().max(40).nullable().default(null),
          sku: z.string().trim().max(80).default(""),
          stock: z.number().int().min(0).max(100_000),
          /**
           * The stock value the admin saw when the form loaded. The server applies
           * (stock - baseline) as a delta so orders placed meanwhile are never overwritten.
           * null for new variants.
           */
          baseline: z.number().int().min(0).nullable().default(null),
        }),
      )
      .min(1)
      .max(400),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(30).default([]),
    isNew: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    isLimited: z.boolean().default(false),
    status: z.enum(PRODUCT_STATUSES),
    customization: z
      .object({
        enabled: z.boolean(),
        price: money,
        nameMaxLength: z.number().int().min(1).max(20),
        numberMin: z.number().int().min(0).max(99),
        numberMax: z.number().int().min(0).max(99),
      })
      .nullable()
      .default(null),
    /** Expected updatedAt of the stored document, for optimistic concurrency. */
    expectedUpdatedAt: z.number().nullable().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.salePrice != null && p.salePrice >= p.price) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be lower than the regular price" });
    }
    if (p.status === "published" && p.images.length === 0) {
      ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one photo before publishing" });
    }
    const seen = new Set<string>();
    for (const v of p.variants) {
      if (!p.sizes.includes(v.size)) {
        ctx.addIssue({ code: "custom", path: ["variants"], message: `Variant size ${v.size} is not in the size list` });
      }
      if (v.color && !p.colors.some((c) => c.name === v.color)) {
        ctx.addIssue({ code: "custom", path: ["variants"], message: `Variant colour ${v.color} is not in the colour list` });
      }
      const key = `${v.size}|${v.color ?? ""}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: ["variants"], message: `Duplicate variant ${v.size} ${v.color ?? ""}` });
      }
      seen.add(key);
    }
    if (p.customization?.enabled && p.customization.numberMin > p.customization.numberMax) {
      ctx.addIssue({ code: "custom", path: ["customization"], message: "Minimum number must be below maximum" });
    }
  });
export type ProductInput = z.input<typeof productInputSchema>;
export type ProductInputParsed = z.output<typeof productInputSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1).max(64),
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional().default(""),
  /** When cancelling: put the items back into stock (default) or not (e.g. damaged return). */
  restock: z.boolean().optional().default(true),
});

export const addOrderNoteSchema = z.object({
  orderId: z.string().min(1).max(64),
  text: z.string().trim().min(1).max(1000),
});

export const adjustStockSchema = z.object({
  productId: z.string().min(1).max(128),
  variantId: z.string().min(1).max(128),
  mode: z.enum(["delta", "set"]),
  value: z.number().int().min(-100_000).max(100_000),
  reason: z.string().trim().min(2, "Give a reason").max(200),
});

export const productIdSchema = z.object({ productId: z.string().min(1).max(128) });

export const setProductStatusSchema = z.object({
  productId: z.string().min(1).max(128),
  status: z.enum(PRODUCT_STATUSES),
});
