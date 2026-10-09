"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useMounted } from "@/lib/store/ui";
import { motion } from "motion/react";
import { Check, MessageCircle } from "lucide-react";
import { formatMoney } from "@shared/money";
import type { PlacedOrderReceipt } from "@shared/types";
import { Container } from "@/components/home/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LAST_ORDER_KEY } from "./CheckoutClient";

export function OrderConfirmation() {
  const mounted = useMounted();
  const receipt = useMemo<PlacedOrderReceipt | null | undefined>(() => {
    if (!mounted) return undefined;
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [mounted]);

  if (receipt === undefined) return <Container className="py-20"><div className="skeleton h-12 w-64" /></Container>;
  if (receipt === null) {
    return (
      <Container className="py-10">
        <EmptyState title="No recent order" body="If you just placed an order, keep an eye on your phone — we’ll be in touch to confirm it." action={<ButtonLink href="/shop">Continue shopping</ButtonLink>} />
      </Container>
    );
  }

  return (
    <Container className="max-w-3xl py-14 lg:py-20">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="cut grid size-16 place-items-center bg-red">
        <Check className="size-8 text-white" strokeWidth={2.5} />
      </motion.div>
      <h1 className="display mt-8 text-5xl text-white sm:text-6xl">Order placed</h1>
      <p className="mt-4 text-lg text-silver">
        Thank you. Your order number is{" "}
        <span className="font-display text-2xl font-bold tracking-wider text-white" data-testid="order-number">
          {receipt.number}
        </span>
        .
      </p>
      <p className="mt-2 text-steel">We’ll call or message you to confirm delivery. Keep this number for any questions — you’ll pay {formatMoney(receipt.total, receipt.currency)} in cash when it arrives.</p>

      {receipt.whatsappUrl && (
        <a
          href={receipt.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cut mt-8 inline-flex h-14 items-center gap-3 bg-[#1f8f4e] px-7 font-display font-semibold uppercase tracking-[0.14em] text-white hover:bg-[#23a35a]"
        >
          <MessageCircle className="size-5" /> Confirm on WhatsApp
        </a>
      )}

      <section className="mt-12 bg-carbon p-6 shadow-[inset_0_0_0_1px_var(--color-line)]">
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.1em] text-white">Summary</h2>
        <ul className="mt-4 divide-y divide-line">
          {receipt.items.map((i, idx) => (
            <li key={idx} className="flex items-center gap-4 py-3">
              <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-graphite">
                {i.image ? <Image src={i.image} alt="" fill sizes="56px" className="object-cover" /> : null}
              </span>
              <span className="flex-1 text-sm">
                <span className="block text-white">{i.name}</span>
                <span className="text-steel">
                  Size {i.size} · Qty {i.quantity}
                  {i.customization ? ` · ${[i.customization.name, i.customization.number].filter(Boolean).join(" ")}` : ""}
                </span>
              </span>
              <span className="text-sm text-white tabular-nums">{formatMoney(i.lineTotal, receipt.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-silver">Subtotal</dt>
            <dd className="text-white tabular-nums">{formatMoney(receipt.subtotal, receipt.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-silver">Delivery</dt>
            <dd className="text-white tabular-nums">{receipt.deliveryFee === 0 ? "Free" : formatMoney(receipt.deliveryFee, receipt.currency)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base">
            <dt className="font-semibold text-white">Total (cash on delivery)</dt>
            <dd className="font-display text-2xl font-bold text-white tabular-nums">{formatMoney(receipt.total, receipt.currency)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-10">
        <ButtonLink href="/shop" variant="secondary">
          Continue shopping
        </ButtonLink>
      </div>
    </Container>
  );
}
