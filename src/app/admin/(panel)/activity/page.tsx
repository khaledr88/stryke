"use client";

import Link from "next/link";
import { collection, limit, orderBy, query } from "firebase/firestore";
import { Card, Empty, ErrorBox, PageTitle } from "@/components/admin/ui";
import { useLiveQuery } from "@/lib/admin/data";
import { firebase } from "@/lib/firebase/client";

interface Entry {
  id: string;
  action: string;
  target: { type: string; id: string; label?: string };
  details?: Record<string, unknown>;
  actor: { uid: string; email: string | null };
  at: number;
}

const LABELS: Record<string, string> = {
  "product.create": "Created product",
  "product.update": "Updated product",
  "product.status": "Changed product status",
  "product.duplicate": "Duplicated product",
  "product.delete": "Deleted product",
  "inventory.adjust": "Adjusted stock",
  "order.status": "Changed order status",
  "order.note": "Added order note",
};

function describe(e: Entry): string {
  const d = e.details ?? {};
  if (e.action === "order.status") return `${d.from} → ${d.to}${d.restocked ? " (restocked)" : ""}${d.note ? ` — ${d.note}` : ""}`;
  if (e.action === "inventory.adjust") return `${d.from} → ${d.to} — ${d.reason}`;
  if (e.action === "product.status") return `${d.from} → ${d.to}`;
  if (e.action === "product.update" || e.action === "product.create") return `${d.status}${d.stockChanges ? `, ${d.stockChanges} stock change(s)` : ""}`;
  return "";
}

export default function ActivityPage() {
  const { data, loading, error } = useLiveQuery<Entry>(() => query(collection(firebase().db, "adminAuditLogs"), orderBy("at", "desc"), limit(150)), "audit");
  return (
    <>
      <PageTitle title="Activity log" description="Every change made through the dashboard to products, stock and orders." />
      {error && <ErrorBox>{error}</ErrorBox>}
      <Card padded={false}>
        {data.length === 0 ? (
          <Empty title={loading ? "Loading…" : "No activity yet"} />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((e) => {
              const href = e.target.type === "order" ? `/admin/orders/${e.target.id}` : e.target.type === "product" && e.action !== "product.delete" ? `/admin/products/${e.target.id}` : null;
              return (
                <li key={e.id} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[170px_1fr_200px] sm:gap-4">
                  <span className="text-steel">{e.at ? new Date(e.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "…"}</span>
                  <span className="text-white">
                    {LABELS[e.action] ?? e.action}{" "}
                    {href ? (
                      <Link href={href} className="font-semibold underline-offset-2 hover:underline">
                        {e.target.label ?? e.target.id}
                      </Link>
                    ) : (
                      <span className="font-semibold">{e.target.label ?? e.target.id}</span>
                    )}
                    {describe(e) && <span className="text-steel"> · {describe(e)}</span>}
                  </span>
                  <span className="truncate text-steel sm:text-right">{e.actor.email ?? e.actor.uid}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
