"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Lock, ShieldCheck } from "lucide-react";
import { formatMoney } from "@shared/money";
import type { PricingProblem } from "@shared/pricing";
import { checkoutCustomerSchema, type CheckoutCustomer, type CheckoutCustomerInput } from "@shared/schemas";
import type { PlacedOrderReceipt } from "@shared/types";
import { Container } from "@/components/home/SectionHeading";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Wordmark } from "@/components/ui/Logo";
import { callable, callableError } from "@/lib/firebase/client";
import { cartCount, useCart } from "@/lib/store/cart";
import { problemFor, useQuote } from "@/lib/store/useQuote";
import { useMounted } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

const SAVED_DETAILS_KEY = "stryke-checkout-details";
export const LAST_ORDER_KEY = "stryke-last-order";

const placeOrder = callable<unknown, PlacedOrderReceipt>("placeOrder");

interface Props {
  zones: { governorate: string; fee: number; eta: string }[];
  allGovernorates: string[];
  freeDeliveryThreshold: number | null;
  codEnabled: boolean;
  codNote: string;
  deliveryNote: string;
  termsAvailable: boolean;
  privacyAvailable: boolean;
}

const EMPTY: CheckoutCustomerInput = {
  fullName: "",
  phone: "",
  whatsapp: "",
  email: "",
  governorate: undefined as unknown as CheckoutCustomerInput["governorate"],
  city: "",
  street: "",
  building: "",
  floor: "",
  instructions: "",
  notes: "",
};

export function CheckoutClient(props: Props) {
  const mounted = useMounted();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [requestId] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`));
  const [initial] = useState(readSavedDetails);
  const [remember, setRemember] = useState(initial.remember);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverProblems, setServerProblems] = useState<PricingProblem[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const [placed, setPlaced] = useState(false);

  const form = useForm<CheckoutCustomerInput, unknown, CheckoutCustomer>({
    resolver: zodResolver(checkoutCustomerSchema),
    defaultValues: initial.values,
    mode: "onTouched",
  });
  const { register, handleSubmit, formState, control } = form;
  const governorate = useWatch({ control, name: "governorate" }) ?? null;

  const { quote, loading, error: quoteError } = useQuote(items, governorate || null, mounted && !placed);
  const problems = useMemo(() => [...(quote?.problems ?? []), ...serverProblems], [quote, serverProblems]);
  const zone = props.zones.find((z) => z.governorate === governorate);

  async function onSubmit(values: CheckoutCustomer) {
    setSubmitError(null);
    setServerProblems([]);
    try {
      const receipt = await placeOrder({
        customer: values,
        lines: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          customization: i.customization ? { name: i.customization.name, number: i.customization.number } : null,
        })),
        paymentMethod: "cod",
        requestId,
        company: honeypot,
      });
      // The order is saved — only now is it safe to clear the bag.
      setPlaced(true);
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(receipt));
        if (remember) {
          const { fullName, phone, whatsapp, email, governorate: g, city, street, building, floor } = values;
          localStorage.setItem(SAVED_DETAILS_KEY, JSON.stringify({ fullName, phone, whatsapp, email, governorate: g, city, street, building, floor }));
        } else {
          localStorage.removeItem(SAVED_DETAILS_KEY);
        }
      } catch {}
      clear();
      router.replace("/checkout/success");
    } catch (err) {
      const e = callableError(err);
      const details = e.details as { problems?: PricingProblem[]; fields?: Record<string, string> } | undefined;
      if (details?.problems?.length) setServerProblems(details.problems);
      if (details?.fields) {
        for (const [k, msg] of Object.entries(details.fields)) {
          const field = k.replace(/^customer\./, "") as keyof CheckoutCustomerInput;
          if (field in EMPTY) form.setError(field, { message: msg });
        }
      }
      setSubmitError(e.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (!mounted) {
    return (
      <Container className="py-16">
        <div className="skeleton h-12 w-48" />
      </Container>
    );
  }

  if (!items.length && !placed) {
    return (
      <Container className="py-10">
        <EmptyState title="Your bag is empty" body="Add something to your bag to check out." action={<ButtonLink href="/shop">Shop now</ButtonLink>} />
      </Container>
    );
  }

  const subtotal = quote?.subtotal ?? 0;
  const deliveryFee = quote?.deliveryFee;
  const total = quote?.total ?? subtotal;
  const submitting = formState.isSubmitting;
  const blocked = problems.length > 0 || !props.codEnabled;

  return (
    <div className="pb-16">
      <div className="border-b border-line">
        <Container className="flex h-14 items-center justify-between">
          <p className="label flex items-center gap-2 text-[0.72rem] text-steel">
            <Lock className="size-3.5" /> Secure checkout
          </p>
          <Wordmark className="h-4 w-auto opacity-70" sizes="120px" />
        </Container>
      </div>
      <Container className="pt-8 lg:pt-12">
        <h1 className="display text-5xl text-white lg:text-6xl">Checkout</h1>
        <p className="mt-2 text-steel">No account needed. We’ll call or WhatsApp you to confirm before delivery.</p>

        {(submitError || quoteError) && (
          <div role="alert" className="mt-6 bg-red/10 p-4 text-sm text-white shadow-[inset_0_0_0_1px_rgb(214_0_28/0.5)]">
            {submitError ?? quoteError}
            {problems.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-silver">
                {[...new Set(problems.map((p) => p.message))].map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
            {problems.some((p) => p.productId) && (
              <Link href="/cart" className="mt-3 inline-block underline underline-offset-4">
                Update your bag
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
          <div className="space-y-10">
            <Fieldset title="Contact">
              <Field label="Full name" error={formState.errors.fullName} className="sm:col-span-2">
                <input {...register("fullName")} autoComplete="name" className={inputClass(formState.errors.fullName)} />
              </Field>
              <Field label="Phone number" hint="We call this number to confirm your order" error={formState.errors.phone}>
                <input {...register("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="71 123 456" className={inputClass(formState.errors.phone)} />
              </Field>
              <Field label="WhatsApp number" optional hint="If different from your phone" error={formState.errors.whatsapp}>
                <input {...register("whatsapp")} type="tel" inputMode="tel" placeholder="71 123 456" className={inputClass(formState.errors.whatsapp)} />
              </Field>
              <Field label="Email" optional hint="For an order receipt" error={formState.errors.email} className="sm:col-span-2">
                <input {...register("email")} type="email" inputMode="email" autoComplete="email" className={inputClass(formState.errors.email)} />
              </Field>
            </Fieldset>

            <Fieldset title="Delivery address">
              <Field label="Governorate" error={formState.errors.governorate}>
                <select {...register("governorate")} className={inputClass(formState.errors.governorate)} defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {props.allGovernorates.map((g) => {
                    const z = props.zones.find((x) => x.governorate === g);
                    return (
                      <option key={g} value={g} disabled={!z}>
                        {g}
                        {z ? ` — ${formatMoney(z.fee)}` : " — not available yet"}
                      </option>
                    );
                  })}
                </select>
              </Field>
              <Field label="City / town" error={formState.errors.city}>
                <input {...register("city")} autoComplete="address-level2" className={inputClass(formState.errors.city)} />
              </Field>
              <Field label="Street" error={formState.errors.street} className="sm:col-span-2">
                <input {...register("street")} autoComplete="address-line1" className={inputClass(formState.errors.street)} />
              </Field>
              <Field label="Building" error={formState.errors.building}>
                <input {...register("building")} autoComplete="address-line2" className={inputClass(formState.errors.building)} />
              </Field>
              <Field label="Floor" optional error={formState.errors.floor}>
                <input {...register("floor")} className={inputClass(formState.errors.floor)} />
              </Field>
              <Field label="Delivery instructions" optional hint="Landmarks, best time to call…" error={formState.errors.instructions} className="sm:col-span-2">
                <textarea {...register("instructions")} rows={2} className={cn(inputClass(formState.errors.instructions), "h-auto py-3")} />
              </Field>
              {zone?.eta && <p className="text-sm text-steel sm:col-span-2">Estimated delivery to {zone.governorate}: {zone.eta}</p>}
              {props.deliveryNote && <p className="text-sm text-steel sm:col-span-2">{props.deliveryNote}</p>}
            </Fieldset>

            <Fieldset title="Payment">
              <div className="sm:col-span-2">
                <div className={cn("flex items-start gap-4 p-4", props.codEnabled ? "bg-white/[0.03] shadow-[inset_0_0_0_1px_#fff]" : "opacity-50 shadow-[inset_0_0_0_1px_var(--color-line)]")}>
                  <span className="mt-0.5 grid size-5 place-items-center rounded-full border-2 border-white">
                    <span className="size-2 rounded-full bg-white" />
                  </span>
                  <div className="flex-1">
                    <p className="flex items-center gap-2 font-semibold text-white">
                      <Banknote className="size-5" /> Cash on delivery
                    </p>
                    <p className="mt-1 text-sm text-steel">{props.codEnabled ? props.codNote || "Pay in cash when your order arrives." : "Cash on delivery is temporarily unavailable."}</p>
                  </div>
                </div>
              </div>
              <Field label="Order notes" optional error={formState.errors.notes} className="sm:col-span-2">
                <textarea {...register("notes")} rows={2} className={cn(inputClass(formState.errors.notes), "h-auto py-3")} />
              </Field>
              <label className="flex items-center gap-3 text-sm text-silver sm:col-span-2">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--color-red)]" />
                Save my details on this device for next time
              </label>
              {/* Honeypot: hidden from people, irresistible to bots. */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Company
                  <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                </label>
              </div>
            </Fieldset>
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <div className="bg-carbon p-5 shadow-[inset_0_0_0_1px_var(--color-line)] sm:p-6">
              <h2 className="font-display text-xl font-bold uppercase tracking-[0.08em] text-white">
                Order summary <span className="text-steel">({cartCount(items)})</span>
              </h2>
              <ul className="mt-4 max-h-[340px] divide-y divide-line overflow-y-auto pr-1">
                {items.map((i) => {
                  const p = problemFor(quote, i) ?? serverProblems.find((x) => x.productId === i.productId && (!x.variantId || x.variantId === i.variantId));
                  return (
                    <li key={i.key} className="flex gap-3 py-3">
                      <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-graphite">
                        {i.image ? <Image src={i.image} alt="" fill sizes="64px" className="object-cover" /> : null}
                        <span className="absolute top-0 right-0 grid h-5 min-w-5 place-items-center bg-white px-1 text-[11px] font-bold text-ink">{i.quantity}</span>
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="line-clamp-2 text-white">{i.name}</span>
                        <span className="block text-steel">
                          Size {i.size}
                          {i.customization ? ` · ${[i.customization.name, i.customization.number].filter(Boolean).join(" ")}` : ""}
                        </span>
                        {p && <span className="block text-red-bright">{p.message}</span>}
                      </span>
                      <span className="text-sm text-white tabular-nums">{formatMoney(i.unitPrice * i.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-silver">Subtotal</dt>
                  <dd className="text-white tabular-nums">{quote ? formatMoney(subtotal) : "…"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-silver">Delivery</dt>
                  <dd className="text-white tabular-nums">
                    {!governorate ? <span className="text-steel">Choose your governorate</span> : deliveryFee == null ? "…" : deliveryFee === 0 ? "Free" : formatMoney(deliveryFee)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
                <span className="font-display text-lg font-semibold uppercase tracking-[0.1em] text-white">Total</span>
                <span className="font-display text-3xl font-bold text-white tabular-nums" aria-live="polite">
                  {quote ? formatMoney(total) : "…"}
                </span>
              </div>
              <p className="mt-1 text-right text-xs text-steel">Pay cash on delivery</p>

              <Button type="submit" full size="lg" className="mt-6" disabled={submitting || blocked || (loading && !quote)}>
                {submitting ? "Placing your order…" : `Place order${quote && governorate ? ` · ${formatMoney(total)}` : ""}`}
              </Button>
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-steel">
                <ShieldCheck className="size-4 shrink-0" />
                <span>
                  Prices and stock are confirmed when you place the order.
                  {props.termsAvailable && (
                    <>
                      {" "}
                      By ordering you agree to our{" "}
                      <Link href="/info/terms" className="underline underline-offset-2 hover:text-white">
                        terms
                      </Link>
                    </>
                  )}
                  {props.privacyAvailable && (
                    <>
                      {props.termsAvailable ? " and " : " See our "}
                      <Link href="/info/privacy" className="underline underline-offset-2 hover:text-white">
                        privacy policy
                      </Link>
                    </>
                  )}
                  {props.termsAvailable || props.privacyAvailable ? "." : ""}
                </span>
              </p>
            </div>
          </aside>
        </form>
      </Container>
    </div>
  );
}

/** Details the customer chose to keep on this device (never sent anywhere until they order). */
function readSavedDetails(): { values: CheckoutCustomerInput; remember: boolean } {
  if (typeof window === "undefined") return { values: EMPTY, remember: false };
  try {
    const saved = localStorage.getItem(SAVED_DETAILS_KEY);
    if (saved) return { values: { ...EMPTY, ...JSON.parse(saved), notes: "", instructions: "" }, remember: true };
  } catch {}
  return { values: EMPTY, remember: false };
}

function inputClass(error?: FieldError) {
  return cn(
    "h-12 w-full bg-ink px-4 text-white placeholder:text-steel/60 transition-shadow focus:outline-none",
    error ? "shadow-[inset_0_0_0_1px_var(--color-red-bright)]" : "shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:shadow-[inset_0_0_0_1px_#fff]",
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="relative">
      <legend className="mb-5 flex items-center gap-3 font-display text-xl font-bold uppercase tracking-[0.1em] text-white">
        <span className="strike-line w-5" aria-hidden />
        {title}
      </legend>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label: string;
  error?: FieldError;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between text-sm text-silver">
        <span>{label}</span>
        {optional && <span className="text-xs text-steel">Optional</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm text-red-bright" role="alert">
          {error.message}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-steel">{hint}</span>
      ) : null}
    </label>
  );
}
