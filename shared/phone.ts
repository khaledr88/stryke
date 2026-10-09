/**
 * Lebanese phone handling. Accepts the formats customers actually type:
 * "03 123 456", "71123456", "+961 71 123 456", "00961 3 123456".
 * Returns E.164 ("+96171123456") or null when the number is not plausible.
 * Numbers from other countries are accepted when written with a leading + and 8–15 digits.
 */
export function normalizePhone(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!/^\+?\d+$/.test(s)) return null;

  if (s.startsWith("+") && !s.startsWith("+961")) {
    const digits = s.slice(1);
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  let local = s.replace(/^\+?961/, "");
  if (local.startsWith("0")) local = local.slice(1);
  // Lebanese numbers: 7 digits (e.g. 3 123456, 1 123456) or 8 digits (e.g. 71 123456).
  if (!/^\d{7,8}$/.test(local)) return null;
  return `+961${local}`;
}

export function formatPhoneForDisplay(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = /^\+961(\d+)$/.exec(e164);
  if (!m) return e164;
  const d = m[1];
  return d.length === 8 ? `+961 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : `+961 ${d.slice(0, 1)} ${d.slice(1, 4)} ${d.slice(4)}`;
}

/** wa.me requires digits only, international format, no +. */
export function whatsappLink(e164OrRaw: string, text?: string): string | null {
  const n = normalizePhone(e164OrRaw);
  if (!n) return null;
  const base = `https://wa.me/${n.replace(/^\+/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
