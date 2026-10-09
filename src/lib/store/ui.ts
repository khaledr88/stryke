"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import type { ProductSummary } from "@shared/types";

interface UiState {
  searchOpen: boolean;
  menuOpen: boolean;
  quickView: ProductSummary | null;
  toast: { id: number; message: string; tone: "default" | "error" } | null;
  setSearchOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  openQuickView: (p: ProductSummary | null) => void;
  notify: (message: string, tone?: "default" | "error") => void;
}

export const useUi = create<UiState>()((set) => ({
  searchOpen: false,
  menuOpen: false,
  quickView: null,
  toast: null,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  openQuickView: (quickView) => set({ quickView }),
  notify: (message, tone = "default") => set({ toast: { id: Date.now(), message, tone } }),
}));

const subscribe = () => () => {};
/** True only after hydration — use before rendering localStorage-backed values. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
