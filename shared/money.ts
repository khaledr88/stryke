import { SUPPORTED_CURRENCIES, type CurrencyCode } from "./constants";

/**
 * All monetary values are stored as integers in the currency's minor unit
 * (cents for USD). Never store floats for money.
 */

export function toMinor(amount: number, currency: CurrencyCode = "USD"): number {
  const digits = SUPPORTED_CURRENCIES[currency].fractionDigits;
  return Math.round(amount * 10 ** digits);
}

export function fromMinor(minor: number, currency: CurrencyCode = "USD"): number {
  const digits = SUPPORTED_CURRENCIES[currency].fractionDigits;
  return minor / 10 ** digits;
}

export function formatMoney(minor: number, currency: CurrencyCode = "USD"): string {
  const c = SUPPORTED_CURRENCIES[currency] ?? SUPPORTED_CURRENCIES.USD;
  const value = fromMinor(minor, c.code);
  if (c.code === "LBP") {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} LBP`;
  }
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency: c.code,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Effective unit price: sale price only applies when it is lower than the regular price. */
export function effectivePrice(price: number, salePrice: number | null | undefined): number {
  if (salePrice != null && salePrice > 0 && salePrice < price) return salePrice;
  return price;
}

export function discountPercent(price: number, salePrice: number | null | undefined): number | null {
  const eff = effectivePrice(price, salePrice);
  if (eff >= price) return null;
  return Math.round(((price - eff) / price) * 100);
}
