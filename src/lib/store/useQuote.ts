"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_MAX_QTY_PER_LINE } from "@shared/constants";
import type { PricingProblem } from "@shared/pricing";
import type { OrderItemSnapshot } from "@shared/types";
import { useCart, type CartItem } from "./cart";

export interface Quote {
  items: OrderItemSnapshot[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number | null;
  freeDeliveryApplied: boolean;
  freeDeliveryThreshold: number | null;
  total: number;
  currency: "USD" | "LBP";
  problems: PricingProblem[];
  stock: Record<string, number>;
}

interface Result {
  payload: string;
  quote: Quote | null;
  error: string | null;
}

/**
 * Asks the server for current prices and stock for the bag (read-only).
 * Keeps the local bag honest: sold-out sizes are flagged, quantities capped.
 */
export function useQuote(items: CartItem[], governorate: string | null, enabled = true) {
  const [result, setResult] = useState<Result | null>(null);
  const sync = useCart((s) => s.sync);
  const active = enabled && items.length > 0;

  const payload = useMemo(
    () =>
      JSON.stringify({
        governorate,
        lines: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          customization: i.customization ? { name: i.customization.name, number: i.customization.number } : null,
        })),
      }),
    [items, governorate],
  );

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "content-type": "application/json" }, body: payload });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not check your bag.");
        setResult({ payload, quote: data, error: null });
        const updates = useCart.getState().items.map((i) => {
          const stock = data.stock[`${i.productId}|${i.variantId}`] as number | undefined;
          const priced = (data.items as OrderItemSnapshot[]).find(
            (x) =>
              x.productId === i.productId &&
              x.variantId === i.variantId &&
              (x.customization?.name ?? "") === (i.customization?.name?.toUpperCase() ?? "") &&
              (x.customization?.number ?? "") === (i.customization?.number ?? ""),
          );
          return {
            key: i.key,
            maxQuantity: stock === undefined ? 0 : Math.min(stock, DEFAULT_MAX_QTY_PER_LINE),
            unitPrice: priced?.unitPrice,
          };
        });
        sync(updates);
      } catch (e) {
        if (!cancelled) setResult((r) => ({ payload, quote: r?.quote ?? null, error: e instanceof Error ? e.message : "Could not check your bag." }));
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [payload, active, sync]);

  if (!active) return { quote: null, loading: false, error: null };
  return {
    // Keep showing the last quote while a new one loads to avoid flicker.
    quote: result?.quote ?? null,
    loading: result?.payload !== payload,
    error: result?.payload === payload ? result.error : null,
  };
}

export function problemFor(quote: Quote | null, item: Pick<CartItem, "productId" | "variantId">): PricingProblem | undefined {
  return quote?.problems.find((p) => p.productId === item.productId && (!p.variantId || p.variantId === item.variantId));
}
