"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { collection, limit, orderBy, query, Timestamp, where, type QueryConstraint } from "firebase/firestore";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@shared/constants";
import { formatMoney } from "@shared/money";
import { formatPhoneForDisplay } from "@shared/phone";
import type { Order } from "@shared/types";
import { Btn, Card, Empty, ErrorBox, PageTitle, StatusPill, TextInput } from "@/components/admin/ui";
import { ordersToCsv, downloadText } from "@/lib/admin/csv";
import { useLiveQuery } from "@/lib/admin/data";
import { firebase } from "@/lib/firebase/client";
import { cn } from "@/lib/utils/cn";

const PAGE = 50;

function OrdersInner() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") ?? "all";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState(q);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v && v !== "all") next.set(k, v);
    else next.delete(k);
    setPages(1);
    router.replace(`/admin/orders${next.size ? `?${next}` : ""}`);
  };

  const key = `${status}|${from}|${to}|${q}|${pages}`;
  const { data: orders, loading, error } = useLiveQuery<Order>(() => {
    const c: QueryConstraint[] = [];
    if (q) {
      // Search overrides the status filter (Firestore can't combine both without another index).
      const token = q.replace(/^stk-/, "").replace(/[\s+()-]/g, "").replace(/^(00961|961|0)/, "");
      c.push(where("searchTokens", "array-contains", /^\d+$/.test(token) ? token : q.split(/\s+/)[0]));
    } else if (status !== "all") {
      c.push(where("status", "==", status));
    }
    if (from) c.push(where("createdAt", ">=", Timestamp.fromDate(new Date(`${from}T00:00:00`))));
    if (to) c.push(where("createdAt", "<=", Timestamp.fromDate(new Date(`${to}T23:59:59.999`))));
    return query(collection(firebase().db, "orders"), ...c, orderBy("createdAt", "desc"), limit(PAGE * pages));
  }, key);

  const totals = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "cancelled");
    return { count: orders.length, value: valid.reduce((s, o) => s + o.total, 0) };
  }, [orders]);

  return (
    <>
      <PageTitle
        title="Orders"
        description="Updates live as customers check out."
        actions={
          <Btn onClick={() => downloadText(`stryke-orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(orders))} disabled={!orders.length}>
            <Download className="size-4" /> Export CSV ({orders.length})
          </Btn>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filter by status">
        {["all", ...ORDER_STATUSES].map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s && !q}
            onClick={() => setParam("status", s)}
            className={cn(
              "h-9 shrink-0 px-3.5 text-sm transition-colors",
              status === s && !q ? "bg-white text-ink" : "text-silver shadow-[inset_0_0_0_1px_var(--color-line)] hover:text-white",
            )}
          >
            {s === "all" ? "All" : ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS]}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", search.trim().toLowerCase());
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel" />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order number, phone or customer name — press Enter" className="pl-9" aria-label="Search orders" />
        </form>
        <label className="flex items-center gap-2 text-xs text-steel">
          From
          <TextInput type="date" value={from} onChange={(e) => setParam("from", e.target.value)} className="w-40" />
        </label>
        <label className="flex items-center gap-2 text-xs text-steel">
          To
          <TextInput type="date" value={to} onChange={(e) => setParam("to", e.target.value)} className="w-40" />
        </label>
      </div>
      {q && (
        <p className="mb-4 text-sm text-silver">
          Results for “{q}”.{" "}
          <button className="underline" onClick={() => { setSearch(""); setParam("q", ""); }}>
            Clear search
          </button>
        </p>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}

      <Card padded={false}>
        {orders.length === 0 ? (
          <Empty title={loading ? "Loading orders…" : "No orders found"} body={loading ? undefined : "Try a different status, date range or search."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-steel">
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Area</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => router.push(`/admin/orders/${o.id}`)}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-white hover:underline" onClick={(e) => e.stopPropagation()}>
                        {o.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-steel">{new Date(o.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-4 py-3 text-white">{o.customer.fullName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-silver">{formatPhoneForDisplay(o.customer.phone)}</td>
                    <td className="px-4 py-3 text-silver">
                      {o.delivery.city}, {o.delivery.governorate}
                    </td>
                    <td className="px-4 py-3 text-silver">{o.itemCount}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white tabular-nums">{formatMoney(o.total, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong text-sm">
                  <td colSpan={7} className="px-4 py-3 text-steel">
                    {totals.count} orders shown · value excluding cancelled
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white tabular-nums">{formatMoney(totals.value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      {orders.length >= PAGE * pages && (
        <div className="mt-6 flex justify-center">
          <Btn onClick={() => setPages((p) => p + 1)}>Load more</Btn>
        </div>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersInner />
    </Suspense>
  );
}
