"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatMoney } from "@shared/money";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cartSubtotal, useCart } from "@/lib/store/cart";
import { problemFor, useQuote } from "@/lib/store/useQuote";
import { useMounted } from "@/lib/store/ui";
import { CartLine } from "./CartLine";
import { FreeDeliveryMeter } from "./FreeDeliveryMeter";

export function CartDrawer() {
  const open = useCart((s) => s.drawerOpen);
  const close = useCart((s) => s.closeDrawer);
  const items = useCart((s) => s.items);
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const { quote, error } = useQuote(items, null, open);

  useEffect(() => {
    close();
  }, [pathname, close]);

  const subtotal = quote?.subtotal ?? cartSubtotal(items);
  const blocked = Boolean(quote?.problems.length) || items.some((i) => i.maxQuantity <= 0);
  const list = mounted ? items : [];

  return (
    <Sheet
      open={open}
      onClose={close}
      title={`Your bag${list.length ? ` (${list.reduce((s, i) => s + i.quantity, 0)})` : ""}`}
      footer={
        list.length ? (
          <div className="space-y-3">
            <FreeDeliveryMeter subtotal={subtotal} threshold={quote?.freeDeliveryThreshold ?? null} />
            <div className="flex items-baseline justify-between">
              <span className="text-silver">Subtotal</span>
              <span className="font-display text-2xl font-bold text-white tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <p className="text-xs text-steel">Delivery is calculated at checkout. Pay cash when your order arrives.</p>
            {error && <p className="text-sm text-warning">{error}</p>}
            <Button full size="lg" disabled={blocked} onClick={() => router.push("/checkout")}>
              {blocked ? "Update your bag to continue" : "Checkout"}
            </Button>
            <ButtonLink href="/cart" variant="secondary" full size="md" onClick={close}>
              View bag
            </ButtonLink>
          </div>
        ) : null
      }
    >
      {list.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <p className="display text-4xl text-white">Your bag is empty</p>
          <p className="mt-3 max-w-xs text-steel">Find your club’s new kit or your next pair of boots.</p>
          <ButtonLink href="/shop" className="mt-8" onClick={close}>
            Shop now
          </ButtonLink>
        </div>
      ) : (
        <ul className="divide-y divide-line px-5">
          {list.map((item) => (
            <CartLine key={item.key} item={item} problem={problemFor(quote, item)} compact onNavigate={close} />
          ))}
        </ul>
      )}
    </Sheet>
  );
}
