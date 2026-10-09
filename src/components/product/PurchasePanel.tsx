"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DEFAULT_MAX_QTY_PER_LINE } from "@shared/constants";
import { effectivePrice, formatMoney } from "@shared/money";
import type { Product } from "@shared/types";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCart } from "@/lib/store/cart";
import { useSaved } from "@/lib/store/saved";
import { useMounted, useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";
import { SizeGuideButton } from "./SizeGuide";

const LOW_STOCK = 3;

export function PurchasePanel({ product, variant = "page", onAdded }: { product: Product; variant?: "page" | "quick"; onAdded?: () => void }) {
  const add = useCart((s) => s.add);
  const openDrawer = useCart((s) => s.openDrawer);
  const notify = useUi((s) => s.notify);
  const mounted = useMounted();
  const saved = useSaved((s) => s.wishlist.some((w) => w.id === product.id));
  const toggleSaved = useSaved((s) => s.toggleWishlist);

  const colors = product.colors;
  const [color, setColor] = useState<string | null>(colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(() => {
    const inStock = product.sizes.filter((s) => product.variants.some((v) => v.size === s && v.stock > 0));
    return product.sizes.length === 1 && inStock.length === 1 ? inStock[0] : null;
  });
  const [qtyRaw, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [printOn, setPrintOn] = useState(false);
  const [printName, setPrintName] = useState("");
  const [printNumber, setPrintNumber] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const sizeGroup = useRef<HTMLFieldSetElement>(null);
  const mainButton = useRef<HTMLDivElement>(null);
  const [mainVisible, setMainVisible] = useState(true);

  const variantFor = (s: string) => product.variants.find((v) => v.size === s && (colors.length === 0 || v.color === color));
  const selected = size ? variantFor(size) : undefined;
  const stock = selected?.stock ?? 0;
  const maxQty = Math.max(1, Math.min(stock, DEFAULT_MAX_QTY_PER_LINE));
  const qty = Math.min(qtyRaw, maxQty);
  const custom = product.customization?.enabled ? product.customization : null;
  const printActive = Boolean(custom && printOn && (printName.trim() || printNumber.trim()));
  const numberValid =
    !printNumber || (custom ? Number(printNumber) >= custom.numberMin && Number(printNumber) <= custom.numberMax : false);
  const unitPrice = effectivePrice(product.price, product.salePrice) + (printActive && custom ? custom.price : 0);

  useEffect(() => {
    if (variant !== "page" || !mainButton.current) return;
    const io = new IntersectionObserver(([e]) => setMainVisible(e.isIntersecting), { rootMargin: "0px 0px -40px 0px" });
    io.observe(mainButton.current);
    return () => io.disconnect();
  }, [variant]);

  const sizeStates = useMemo(
    () =>
      product.sizes.map((s) => {
        const v = product.variants.find((x) => x.size === s && (colors.length === 0 || x.color === color));
        return { size: s, stock: v?.stock ?? 0, exists: Boolean(v) };
      }),
    [product, color, colors.length],
  );

  function handleAdd() {
    if (!size || !selected) {
      setSizeError(true);
      sizeGroup.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      sizeGroup.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus({ preventScroll: true });
      return;
    }
    if (stock <= 0) return;
    if (printActive && !numberValid) return;
    const result = add(
      {
        productId: product.id,
        variantId: selected.id,
        slug: product.slug,
        name: product.name,
        brandName: product.brandName,
        clubName: product.clubName,
        image: product.images[0]?.url ?? null,
        size: selected.size,
        color: selected.color,
        unitPrice,
        compareAtPrice: product.salePrice ? product.price : null,
        maxQuantity: stock,
        customization: printActive && custom ? { name: printName.trim().toUpperCase(), number: printNumber.trim(), price: custom.price } : null,
      },
      qty,
    );
    if (result.added === 0) {
      notify(`You already have the most we can sell of size ${selected.size} in your bag.`, "error");
      return;
    }
    if (result.capped) notify(`Added ${result.added} — that's all we have in size ${selected.size}.`);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
    onAdded?.();
    openDrawer();
  }

  const allSoldOut = !product.inStock;

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm text-silver">
            Colour: <span className="text-white">{color}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const any = product.variants.some((v) => v.color === c.name && v.stock > 0);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    setColor(c.name);
                    setSize(null);
                  }}
                  aria-pressed={color === c.name}
                  aria-label={`${c.name}${any ? "" : " (sold out)"}`}
                  title={c.name}
                  className={cn(
                    "relative size-11 rounded-full p-1 transition-shadow",
                    color === c.name ? "shadow-[0_0_0_2px_#fff]" : "shadow-[0_0_0_1px_var(--color-line-strong)] hover:shadow-[0_0_0_1px_#fff]",
                    !any && "opacity-40",
                  )}
                >
                  <span className="block size-full rounded-full" style={{ background: c.hex }} />
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset ref={sizeGroup}>
        <div className="mb-3 flex items-center justify-between">
          <legend className={cn("text-sm", sizeError ? "text-red-bright" : "text-silver")}>
            {sizeError ? "Choose a size" : size ? <>Size: <span className="text-white">{size}</span></> : "Select size"}
          </legend>
          <SizeGuideButton type={product.productType} />
        </div>
        <div className={cn("grid gap-2", product.productType === "boots" ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-4 sm:grid-cols-6", variant === "quick" && "sm:grid-cols-5")}>
          {sizeStates
            .filter((s) => s.exists)
            .map((s) => {
              const out = s.stock <= 0;
              const active = size === s.size;
              return (
                <button
                  key={s.size}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setSize(s.size);
                    setSizeError(false);
                  }}
                  aria-pressed={active}
                  aria-label={`Size ${s.size}${out ? ", sold out" : s.stock <= LOW_STOCK ? `, only ${s.stock} left` : ""}`}
                  className={cn(
                    "relative h-12 font-display text-[0.95rem] font-semibold tracking-wide transition-colors",
                    active ? "bg-white text-ink" : "text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:shadow-[inset_0_0_0_1px_#fff]",
                    out && "cursor-not-allowed text-steel/50 line-through shadow-[inset_0_0_0_1px_var(--color-line)] hover:shadow-[inset_0_0_0_1px_var(--color-line)]",
                    sizeError && !out && !active && "shadow-[inset_0_0_0_1px_rgb(214_0_28/0.7)]",
                  )}
                >
                  {s.size}
                  {!out && s.stock <= LOW_STOCK && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-warning" aria-hidden />}
                </button>
              );
            })}
        </div>
        <p className="mt-2 min-h-5 text-sm" aria-live="polite">
          {selected && stock > 0 && stock <= LOW_STOCK ? (
            <span className="text-warning">Only {stock} left in size {selected.size}</span>
          ) : selected && stock > 0 ? (
            <span className="text-steel">In stock</span>
          ) : null}
        </p>
      </fieldset>

      {custom && (
        <div className="shadow-[inset_0_0_0_1px_var(--color-line)]">
          <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
            <input type="checkbox" checked={printOn} onChange={(e) => setPrintOn(e.target.checked)} className="size-5 accent-[var(--color-red)]" />
            <span className="flex-1 text-white">Add name and number</span>
            <span className="font-display font-semibold text-silver">+{formatMoney(custom.price)}</span>
          </label>
          <AnimatePresence initial={false}>
            {printOn && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-[1fr_96px] gap-3 px-4 pb-4">
                  <label className="text-sm text-silver">
                    Name
                    <input
                      value={printName}
                      onChange={(e) => setPrintName(e.target.value.replace(/[^\p{L} .'-]/gu, "").slice(0, custom.nameMaxLength))}
                      maxLength={custom.nameMaxLength}
                      className="mt-1 h-12 w-full bg-ink px-3 font-display text-lg font-semibold uppercase tracking-wider text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:shadow-[inset_0_0_0_1px_#fff] focus:outline-none"
                      placeholder="YOUR NAME"
                      autoComplete="off"
                    />
                  </label>
                  <label className="text-sm text-silver">
                    Number
                    <input
                      value={printNumber}
                      onChange={(e) => setPrintNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
                      inputMode="numeric"
                      className="mt-1 h-12 w-full bg-ink px-3 text-center font-display text-lg font-semibold text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] focus:shadow-[inset_0_0_0_1px_#fff] focus:outline-none"
                      placeholder="10"
                      aria-invalid={!numberValid}
                    />
                  </label>
                  {!numberValid && (
                    <p className="col-span-2 text-sm text-red-bright">
                      Numbers {custom.numberMin}–{custom.numberMax} only.
                    </p>
                  )}
                  <p className="col-span-2 text-xs text-steel">Printed shirts can’t be returned unless faulty.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div ref={mainButton} className="flex items-stretch gap-3">
        {!allSoldOut && <QuantityStepper value={qty} max={maxQty} onChange={setQty} />}
        <Button size="lg" className="flex-1" onClick={handleAdd} disabled={allSoldOut || (selected ? stock <= 0 : false)}>
          {allSoldOut ? (
            "Sold out"
          ) : justAdded ? (
            <>
              <Check className="size-5" /> Added
            </>
          ) : (
            <>
              <ShoppingBag className="size-5" strokeWidth={1.8} /> Add to bag
            </>
          )}
        </Button>
        {variant === "page" && (
          <button
            type="button"
            onClick={() => {
              const added = toggleSaved({
                id: product.id,
                slug: product.slug,
                name: product.name,
                brandName: product.brandName,
                clubName: product.clubName,
                price: product.price,
                salePrice: product.salePrice,
                image: product.images[0] ?? null,
                inStock: product.inStock,
              });
              notify(added ? "Saved to your list" : "Removed from saved");
            }}
            aria-pressed={mounted ? saved : false}
            aria-label={saved ? "Remove from saved" : "Save for later"}
            className="grid w-14 shrink-0 place-items-center text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:shadow-[inset_0_0_0_1px_#fff]"
          >
            <Heart className={cn("size-5", mounted && saved && "fill-red text-red")} />
          </button>
        )}
      </div>

      {variant === "page" && !allSoldOut && (
        <AnimatePresence>
          {!mainVisible && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.2, 0.9, 0.1, 1] }}
              className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 pt-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur-xl lg:hidden"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{product.name}</p>
                  <Price price={product.price} salePrice={product.salePrice} size="sm" />
                </div>
                <Button onClick={handleAdd} className="shrink-0">
                  {size ? `Add size ${size}` : "Select size"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
