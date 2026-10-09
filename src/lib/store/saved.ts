"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductSummary } from "@shared/types";

/** Snapshot kept locally so saved and recently viewed products render without a fetch. */
export type SavedProduct = Pick<
  ProductSummary,
  "id" | "slug" | "name" | "brandName" | "clubName" | "price" | "salePrice" | "image" | "inStock"
> & { savedAt: number };

interface SavedState {
  wishlist: SavedProduct[];
  recent: SavedProduct[];
  toggleWishlist: (p: Omit<SavedProduct, "savedAt">) => boolean;
  removeWishlist: (id: string) => void;
  pushRecent: (p: Omit<SavedProduct, "savedAt">) => void;
}

export const useSaved = create<SavedState>()(
  persist(
    (set, get) => ({
      wishlist: [],
      recent: [],
      toggleWishlist: (p) => {
        const exists = get().wishlist.some((w) => w.id === p.id);
        set({
          wishlist: exists ? get().wishlist.filter((w) => w.id !== p.id) : [{ ...p, savedAt: Date.now() }, ...get().wishlist].slice(0, 100),
        });
        return !exists;
      },
      removeWishlist: (id) => set({ wishlist: get().wishlist.filter((w) => w.id !== id) }),
      pushRecent: (p) =>
        set({ recent: [{ ...p, savedAt: Date.now() }, ...get().recent.filter((r) => r.id !== p.id)].slice(0, 12) }),
    }),
    { name: "stryke-saved", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
