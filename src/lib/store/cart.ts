"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_MAX_QTY_PER_LINE, MAX_CART_LINES } from "@shared/constants";

export interface CartItem {
  key: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  brandName: string;
  clubName: string | null;
  image: string | null;
  size: string;
  color: string | null;
  /** Display estimate in minor units (incl. printing). The server re-prices at checkout. */
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  /** Most the customer can add: min(stock at the time, per-line limit). */
  maxQuantity: number;
  customization: { name: string; number: string; price: number } | null;
  addedAt: number;
}

export type NewCartItem = Omit<CartItem, "key" | "addedAt" | "quantity">;

export function cartKey(i: Pick<CartItem, "productId" | "variantId" | "customization">) {
  return [i.productId, i.variantId, i.customization?.name ?? "", i.customization?.number ?? ""].join("|");
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  lastAddedKey: string | null;
  add: (item: NewCartItem, quantity: number) => { added: number; capped: boolean };
  setQuantity: (key: string, quantity: number) => void;
  changeVariant: (key: string, next: { variantId: string; size: string; maxQuantity: number }) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Apply fresh stock/price data from the server quote. */
  sync: (updates: { key: string; maxQuantity: number; unitPrice?: number; remove?: boolean }[]) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const clamp = (n: number, max: number) => Math.max(1, Math.min(Math.floor(n), Math.max(1, max)));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      lastAddedKey: null,

      add: (item, quantity) => {
        const key = cartKey(item);
        const max = Math.min(item.maxQuantity, DEFAULT_MAX_QTY_PER_LINE);
        const items = get().items;
        const existing = items.find((i) => i.key === key);
        // Same variant across different print options shares the same stock.
        const sameVariantQty = items.filter((i) => i.productId === item.productId && i.variantId === item.variantId && i.key !== key).reduce((s, i) => s + i.quantity, 0);
        const room = Math.max(0, max - sameVariantQty - (existing?.quantity ?? 0));
        const added = Math.min(quantity, room);
        if (added <= 0) return { added: 0, capped: true };
        if (!existing && items.length >= MAX_CART_LINES) return { added: 0, capped: true };
        set({
          items: existing
            ? items.map((i) => (i.key === key ? { ...i, ...item, quantity: i.quantity + added, maxQuantity: max } : i))
            : [...items, { ...item, key, quantity: added, maxQuantity: max, addedAt: Date.now() }],
          lastAddedKey: key,
        });
        return { added, capped: added < quantity };
      },

      setQuantity: (key, quantity) =>
        set({
          items: get().items.map((i) => (i.key === key ? { ...i, quantity: clamp(quantity, i.maxQuantity) } : i)),
        }),

      changeVariant: (key, next) =>
        set(() => {
          const items = get().items;
          const target = items.find((i) => i.key === key);
          if (!target) return {};
          const updated = { ...target, variantId: next.variantId, size: next.size, maxQuantity: next.maxQuantity };
          updated.key = cartKey(updated);
          updated.quantity = clamp(updated.quantity, next.maxQuantity);
          const others = items.filter((i) => i.key !== key);
          const dup = others.find((i) => i.key === updated.key);
          if (dup) {
            return {
              items: others.map((i) => (i.key === dup.key ? { ...i, quantity: clamp(i.quantity + updated.quantity, i.maxQuantity) } : i)),
            };
          }
          return { items: items.map((i) => (i.key === key ? updated : i)) };
        }),

      remove: (key) => set({ items: get().items.filter((i) => i.key !== key) }),
      clear: () => set({ items: [], lastAddedKey: null }),

      sync: (updates) =>
        set({
          items: get()
            .items.map((i) => {
              const u = updates.find((x) => x.key === i.key);
              if (!u) return i;
              if (u.remove) return null;
              const maxQuantity = Math.max(0, u.maxQuantity);
              return {
                ...i,
                maxQuantity,
                quantity: maxQuantity > 0 ? Math.min(i.quantity, maxQuantity) : i.quantity,
                unitPrice: u.unitPrice ?? i.unitPrice,
              };
            })
            .filter((i): i is CartItem => i !== null),
        }),

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "stryke-bag",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export function cartCount(items: CartItem[]) {
  return items.reduce((s, i) => s + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
}
