import { formatMoney } from "@shared/money";

export function FreeDeliveryMeter({ subtotal, threshold }: { subtotal: number; threshold: number | null }) {
  if (!threshold || threshold <= 0) return null;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, (subtotal / threshold) * 100);
  return (
    <div>
      <p className="mb-2 text-sm text-silver">
        {remaining > 0 ? (
          <>
            Add <span className="font-semibold text-white">{formatMoney(remaining)}</span> for free delivery
          </>
        ) : (
          <span className="text-white">Your order qualifies for free delivery</span>
        )}
      </p>
      <div className="h-1 w-full overflow-hidden bg-white/10" aria-hidden>
        <div className="h-full origin-left bg-red transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
