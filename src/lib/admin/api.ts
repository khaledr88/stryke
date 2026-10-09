"use client";

import { CACHE_TAGS } from "@shared/constants";
import type { ProductInput } from "@shared/schemas";
import { apiPost, firebase } from "@/lib/firebase/client";

const admin =
  <Req, Res>(action: string) =>
  (data: Req) =>
    apiPost<Res>(`/api/admin/${action}`, data, { auth: true });

/** Server operations for the dashboard (run as API routes, checked against the admin claim). */
export const adminApi = {
  saveProduct: admin<ProductInput, { id: string; slug: string; updatedAt: number }>("saveProduct"),
  setProductStatus: admin<{ productId: string; status: "draft" | "published" | "archived" }, { id: string; slug: string }>("setProductStatus"),
  duplicateProduct: admin<{ productId: string }, { id: string; slug: string }>("duplicateProduct"),
  deleteProduct: admin<{ productId: string }, { id: string }>("deleteProduct"),
  adjustStock: admin<{ productId: string; variantId: string; mode: "delta" | "set"; value: number; reason: string }, { stock: number }>("adjustStock"),
  updateOrderStatus: admin<{ orderId: string; status: string; note?: string; restock?: boolean }, { orderId: string; status: string }>("updateOrderStatus"),
  addOrderNote: admin<{ orderId: string; text: string }, { id: string }>("addOrderNote"),
  syncTaxonomyName: admin<{ collection: string; id: string; name: string }, { updated: number }>("syncTaxonomyName"),
};

/**
 * Refresh the storefront cache after the admin edits content directly in
 * Firestore (taxonomy, homepage, settings).
 */
export async function refreshStorefront(tags: string[]) {
  const user = firebase().auth.currentUser;
  if (!user) return;
  const token = await user.getIdToken();
  await fetch("/api/revalidate", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ tags }),
  }).catch(() => undefined);
}

export const TAGS = CACHE_TAGS;
