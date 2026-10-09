export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeSearch(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable variant id from size + colour, safe for use in Firestore field values and URLs. */
export function variantId(size: string, color: string | null): string {
  const s = slugify(size) || "os";
  const c = color ? slugify(color) : "";
  return c ? `${s}__${c}` : s;
}

export function initials(name: string, max = 3): string {
  const words = name
    .replace(/^(fc|ac|cf|sc)\s+/i, (m) => m)
    .split(/[\s-]+/)
    .filter(Boolean);
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, max)
    .toUpperCase();
}

export function truncate(input: string, length: number): string {
  if (input.length <= length) return input;
  return `${input.slice(0, length - 1).trimEnd()}…`;
}
