"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function QuantityStepper({
  value,
  max,
  onChange,
  label = "Quantity",
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label?: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-9" : "h-12";
  const w = size === "sm" ? "w-9" : "w-12";
  return (
    <div className={cn("inline-flex items-stretch shadow-[inset_0_0_0_1px_var(--color-line-strong)]", h)} role="group" aria-label={label}>
      <button
        type="button"
        className={cn("grid place-items-center text-silver hover:text-white disabled:opacity-30", w)}
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>
      <output className={cn("grid min-w-8 place-items-center font-display text-lg font-bold tabular-nums text-white")} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={cn("grid place-items-center text-silver hover:text-white disabled:opacity-30", w)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
