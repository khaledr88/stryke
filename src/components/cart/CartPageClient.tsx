"use client";

import { useRouter } from "next/navigation";
import { formatMoney } from "@shared/money";
import { Container } from "@/components/home/SectionHeading";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cartCount, cartSubtotal, useCart } from "@/lib/store/cart";
import { problemFor, useQuote } from "@/lib/store/useQuote";
import { useMounted } from "@/lib/store/ui";
import { CartLine } from "./CartLine";
import { FreeDeliveryMeter } from "./FreeDeliveryMeter";

export function CartPageClient() {
  const mounted = useMounted();
  const items = useCart((s) => s.items);
  const router = useRouter();
  const { quote, loading, error } = useQuote(items, null, mounted);

  if (!mounted) {
    return (
      <Container className="py-16">
        <div className="skeleton h-12 w-48" />
      </Container>
    );
  }

  if (!items.length) {
    return (
      <>
        <Container className="py-10">
          <EmptyState title="Your bag is empty" body="Find your club’s new kit or your next pair of boots." action={<ButtonLink href="/shop">Shop now</ButtonLink>} />
        </Container>
        <RecentlyViewed />
      </>
    );
  }

  const subtotal = quote?.subtotal ?? cartSubtotal(items);
  const blocked = Boolean(quote?.problems.length) || items.some((i) => i.maxQuantity <= 0);

  return (
    <Container className="py-10 lg:py-14">
      <h1 className="display text-5xl text-white lg:text-6xl">
        Your bag <span className="text-steel">({cartCount(items)})</span>
      </h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <CartLine key={item.key} item={item} problem={problemFor(quote, item)} />
          ))}
        </ul>
        <aside className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
          <div className="bg-carbon p-6 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <h2 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white">Summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-silver">Subtotal</dt>
                <dd className="text-white tabular-nums">{formatMoney(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-silver">Delivery</dt>
                <dd className="text-steel">Calculated at checkout</dd>
              </div>
            </dl>
            <div className="mt-5">
              <FreeDeliveryMeter subtotal={subtotal} threshold={quote?.freeDeliveryThreshold ?? null} />
            </div>
            <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
              <span className="font-display text-lg font-semibold uppercase tracking-[0.1em] text-white">Total</span>
              <span className="font-display text-3xl font-bold text-white tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            {error && <p className="mt-3 text-sm text-warning">{error}</p>}
            {blocked && <p className="mt-3 text-sm text-red-bright">Some items changed. Adjust or remove them to continue.</p>}
            <Button full size="lg" className="mt-6" disabled={blocked || loading && !quote} onClick={() => router.push("/checkout")}>
              Checkout
            </Button>
            <p className="mt-4 text-center text-xs text-steel">No account needed. Pay cash on delivery.</p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
