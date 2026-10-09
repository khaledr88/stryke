"use client";

import { CACHE_TAGS } from "@shared/constants";
import type { ProductInput } from "@shared/schemas";
import { callable, firebase } from "@/lib/firebase/client";

export const adminApi = {
  saveProduct: callable<ProductInput, { id: string; slug: string; updatedAt: number }>("saveProduct"),
  setProductStatus: callable<{ productId: string; status: "draft" | "published" | "archived" }, { id: string; slug: string }>("setProductStatus"),
  duplicateProduct: callable<{ productId: string }, { id: string; slug: string }>("duplicateProduct"),
  deleteProduct: callable<{ productId: string }, { id: string }>("deleteProduct"),
  adjustStock: callable<{ productId: string; variantId: string; mode: "delta" | "set"; value: number; reason: string }, { stock: number }>("adjustStock"),
  updateOrderStatus: callable<{ orderId: string; status: string; note?: string; restock?: boolean }, { orderId: string; status: string }>("updateOrderStatus"),
  addOrderNote: callable<{ orderId: string; text: string }, { id: string }>("addOrderNote"),
};

/**
 * Refresh the storefront cache after the admin edits content directly in
 * Firestore (taxonomy, homepage, settings). Product/order changes go through
 * Cloud Functions, which refresh the cache themselves.
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
