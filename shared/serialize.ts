/**
 * Converts Firestore Timestamps (admin or web SDK — both expose toMillis())
 * into epoch milliseconds, recursively. Keeps the data layer free of SDK types.
 */
export function plain<T>(value: unknown): T {
  return convert(value) as T;
}

function convert(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value !== "object") return value;
  const maybeTs = value as { toMillis?: () => number };
  if (typeof maybeTs.toMillis === "function") return maybeTs.toMillis();
  if (Array.isArray(value)) return value.map(convert);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = convert(v);
  return out;
}

export function withId<T>(id: string, data: unknown): T {
  return { ...(plain<Record<string, unknown>>(data) ?? {}), id } as T;
}
