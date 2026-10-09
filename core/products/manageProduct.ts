import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { AppError } from "../lib/errors";
import { buildVariants, isOnSale, stockStats } from "@shared/catalog";
import { COL } from "@shared/constants";
import { productIdSchema, productInputSchema, setProductStatusSchema } from "@shared/schemas";
import { plain } from "@shared/serialize";
import { slugify } from "@shared/text";
import type { Brand, Category, Club, ProductVariant } from "@shared/types";
import { auditInTx } from "../lib/audit";
import { parse, type Actor } from "../lib/guards";
import { productFromSnap } from "../lib/products";

async function uniqueSlug(db: Firestore, tx: Transaction, base: string, selfId: string): Promise<string> {
  const root = base || "product";
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const q = await tx.get(db.collection(COL.products).where("slug", "==", candidate).limit(2));
    if (q.docs.every((d) => d.id === selfId)) return candidate;
  }
  throw new AppError("already-exists", "Could not find a free URL for this product. Set a custom URL slug.");
}

/**
 * Creates or updates a product. Stock edits are applied as deltas against the
 * value the admin originally loaded, so orders placed while the form was open
 * are never overwritten (no overselling from a stale admin tab).
 */
export async function saveProductCore(db: Firestore, actor: Actor, raw: unknown, now = Date.now()) {
  const input = parse(productInputSchema, raw);
  const ref = input.id ? db.collection(COL.products).doc(input.id) : db.collection(COL.products).doc();
  const ts = Timestamp.fromMillis(now);

  const result = await db.runTransaction(async (tx) => {
    const refs = [
      ref,
      db.collection(COL.brands).doc(input.brandId),
      db.collection(COL.categories).doc(input.categoryId),
      ...(input.clubId ? [db.collection(COL.clubs).doc(input.clubId)] : []),
    ];
    const [existingSnap, brandSnap, categorySnap, clubSnap] = await tx.getAll(...refs);
    const existing = productFromSnap(existingSnap);
    if (input.id && !existing) throw new AppError("not-found", "This product no longer exists.");
    if (existing && input.expectedUpdatedAt != null) {
      // Content edits conflict if someone saved after this form was loaded; stock is merged as deltas below.
      const stored = (existingSnap.get("contentUpdatedAt") as Timestamp | undefined)?.toMillis() ?? null;
      if (stored != null && stored > input.expectedUpdatedAt) {
        throw new AppError("aborted", "Someone else saved this product while you were editing. Reload to see their changes.");
      }
    }
    if (!brandSnap.exists) throw new AppError("failed-precondition", "The selected brand no longer exists.");
    if (!categorySnap.exists) throw new AppError("failed-precondition", "The selected category no longer exists.");
    if (input.clubId && !clubSnap?.exists) throw new AppError("failed-precondition", "The selected club no longer exists.");
    const brand = plain<Brand>(brandSnap.data());
    const category = plain<Category>(categorySnap.data());
    const club = input.clubId ? plain<Club>(clubSnap!.data()) : null;

    const slug = await uniqueSlug(db, tx, slugify(input.slug || input.name), ref.id);

    // Merge stock as deltas.
    const desired = buildVariants(input.sku, input.variants);
    const movements: { variantId: string; size: string; delta: number; reason: string }[] = [];
    const variants: ProductVariant[] = desired.map((v, i) => {
      const src = input.variants[i];
      const current = existing?.variants.find((e) => e.id === v.id);
      if (!current) {
        if (v.stock > 0) movements.push({ variantId: v.id, size: v.size, delta: v.stock, reason: existing ? "variant-added" : "initial" });
        return v;
      }
      const baseline = src.baseline ?? current.stock;
      const delta = src.stock - baseline;
      const stock = Math.max(0, current.stock + delta);
      if (stock !== current.stock) movements.push({ variantId: v.id, size: v.size, delta: stock - current.stock, reason: "product-edit" });
      return { ...v, stock };
    });

    const stats = stockStats(variants);
    const imagePaths = input.images.map((img) => img.path).filter(Boolean);
    const doc = {
      slug,
      name: input.name,
      brandId: input.brandId,
      brandName: brand.name,
      categoryId: input.categoryId,
      categoryName: category.name,
      clubId: input.clubId ?? null,
      clubName: club?.name ?? null,
      season: input.season || null,
      productType: input.productType,
      description: input.description,
      price: input.price,
      salePrice: input.salePrice ?? null,
      currency: "USD",
      sku: input.sku.toUpperCase(),
      images: input.images,
      imagePaths,
      sizes: input.sizes,
      colors: input.colors,
      variants,
      tags: [...new Set(input.tags)],
      isNew: input.isNew,
      isBestSeller: input.isBestSeller,
      isFeatured: input.isFeatured,
      isLimited: input.isLimited,
      status: input.status,
      customization: input.customization?.enabled ? input.customization : null,
      totalStock: stats.totalStock,
      minVariantStock: stats.minVariantStock,
      inStock: stats.inStock,
      onSale: isOnSale({ price: input.price, salePrice: input.salePrice ?? null }),
      updatedAt: ts,
      contentUpdatedAt: ts,
      publishedAt: existing?.publishedAt ? Timestamp.fromMillis(existing.publishedAt) : input.status === "published" ? ts : null,
    };

    if (existing) {
      tx.update(ref, doc);
    } else {
      tx.create(ref, { ...doc, salesCount: 0, createdAt: ts, createdBy: actor.uid });
    }
    for (const m of movements) {
      tx.set(db.collection(COL.inventoryMovements).doc(), {
        productId: ref.id,
        productName: input.name,
        ...m,
        by: actor.email ?? actor.uid,
        at: ts,
      });
    }
    auditInTx(db, tx, actor, {
      action: existing ? "product.update" : "product.create",
      target: { type: "product", id: ref.id, label: input.name },
      details: { status: input.status, stockChanges: movements.length },
    });

    const removedImagePaths = (existing?.imagePaths ?? []).filter((p) => !imagePaths.includes(p));
    return { id: ref.id, slug, previousSlug: existing?.slug ?? null, removedImagePaths, updatedAt: now };
  });
  return result;
}

export async function setProductStatusCore(db: Firestore, actor: Actor, raw: unknown, now = Date.now()) {
  const input = parse(setProductStatusSchema, raw);
  const ref = db.collection(COL.products).doc(input.productId);
  return db.runTransaction(async (tx) => {
    const p = productFromSnap(await tx.get(ref));
    if (!p) throw new AppError("not-found", "Product not found.");
    if (input.status === "published" && p.images.length === 0) {
      throw new AppError("failed-precondition", "Add at least one photo before publishing.");
    }
    const ts = Timestamp.fromMillis(now);
    tx.update(ref, {
      status: input.status,
      updatedAt: ts,
      ...(input.status === "published" && !p.publishedAt ? { publishedAt: ts } : {}),
    });
    auditInTx(db, tx, actor, { action: "product.status", target: { type: "product", id: p.id, label: p.name }, details: { from: p.status, to: input.status } });
    return { id: p.id, slug: p.slug };
  });
}

export async function duplicateProductCore(db: Firestore, actor: Actor, raw: unknown, now = Date.now()) {
  const input = parse(productIdSchema, raw);
  const src = productFromSnap(await db.collection(COL.products).doc(input.productId).get());
  if (!src) throw new AppError("not-found", "Product not found.");
  const ref = db.collection(COL.products).doc();
  const ts = Timestamp.fromMillis(now);
  return db.runTransaction(async (tx) => {
    const slug = await uniqueSlug(db, tx, `${src.slug}-copy`, ref.id);
    const variants = src.variants.map((v) => ({ ...v, stock: 0 }));
    const copied = {
      brandId: src.brandId,
      brandName: src.brandName,
      categoryId: src.categoryId,
      categoryName: src.categoryName,
      clubId: src.clubId,
      clubName: src.clubName,
      season: src.season,
      productType: src.productType,
      description: src.description,
      price: src.price,
      salePrice: src.salePrice,
      currency: src.currency,
      images: src.images,
      imagePaths: src.imagePaths ?? [],
      sizes: src.sizes,
      colors: src.colors,
      tags: src.tags,
      isNew: src.isNew,
      isBestSeller: src.isBestSeller,
      isFeatured: src.isFeatured,
      isLimited: src.isLimited,
      customization: src.customization,
      onSale: src.onSale,
    };
    tx.create(ref, {
      ...copied,
      name: `${src.name} (copy)`,
      slug,
      sku: `${src.sku}-COPY`,
      variants,
      ...stockStats(variants),
      status: "draft",
      salesCount: 0,
      isSample: src.isSample ?? false,
      createdAt: ts,
      updatedAt: ts,
      contentUpdatedAt: ts,
      publishedAt: null,
      createdBy: actor.uid,
    });
    auditInTx(db, tx, actor, { action: "product.duplicate", target: { type: "product", id: ref.id, label: src.name }, details: { from: src.id } });
    return { id: ref.id, slug };
  });
}

export async function deleteProductCore(db: Firestore, actor: Actor, raw: unknown) {
  const input = parse(productIdSchema, raw);
  const ref = db.collection(COL.products).doc(input.productId);
  const result = await db.runTransaction(async (tx) => {
    const p = productFromSnap(await tx.get(ref));
    if (!p) throw new AppError("not-found", "Product not found.");
    tx.delete(ref);
    auditInTx(db, tx, actor, { action: "product.delete", target: { type: "product", id: p.id, label: p.name } });
    return { id: p.id, slug: p.slug, imagePaths: p.imagePaths ?? [] };
  });
  return result;
}

/** Returns the paths that no remaining product references, so they are safe to delete from Storage. */
export async function unreferencedPaths(db: Firestore, paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const path of paths) {
    if (!path.startsWith("products/")) continue;
    const q = await db.collection(COL.products).where("imagePaths", "array-contains", path).limit(1).get();
    if (q.empty) out.push(path);
  }
  return out;
}
