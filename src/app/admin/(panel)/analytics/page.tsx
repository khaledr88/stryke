"use client";

import { useMemo, useState } from "react";
import { collection, orderBy, query, Timestamp, where } from "firebase/firestore";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@shared/constants";
import { formatMoney } from "@shared/money";
import type { Order } from "@shared/types";
import { HBarChart, SalesChart, bucketByDay } from "@/components/admin/SalesChart";
import { Card, ErrorBox, PageTitle, StatCard } from "@/components/admin/ui";
import { useLiveQuery } from "@/lib/admin/data";
import { firebase } from "@/lib/firebase/client";
import { cn } from "@/lib/utils/cn";

const PERIODS = [7, 30, 90, 365];

function topBy<T>(items: T[], key: (t: T) => string | null, value: (t: T) => number, n = 8) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + value(it));
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [start] = useState(() => Date.now());
  const from = start - days * 86_400_000;
  const { data: orders, loading, error } = useLiveQuery<Order>(
    () => query(collection(firebase().db, "orders"), where("createdAt", ">=", Timestamp.fromMillis(from)), orderBy("createdAt", "desc")),
    `analytics-${days}`,
  );

  const m = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "cancelled");
    const delivered = orders.filter((o) => o.status === "delivered");
    const sales = valid.reduce((s, o) => s + o.total, 0);
    const items = valid.flatMap((o) => o.items);
    return {
      valid,
      sales,
      revenue: delivered.reduce((s, o) => s + o.total, 0),
      aov: valid.length ? Math.round(sales / valid.length) : 0,
      cancelRate: orders.length ? Math.round(((orders.length - valid.length) / orders.length) * 100) : 0,
      units: items.reduce((s, i) => s + i.quantity, 0),
      topRevenue: topBy(items, (i) => i.name, (i) => i.lineTotal),
      topUnits: topBy(items, (i) => i.name, (i) => i.quantity),
      byBrand: topBy(items, (i) => i.brandName, (i) => i.lineTotal, 6),
      byClub: topBy(items, (i) => i.clubName, (i) => i.lineTotal, 6),
      byArea: topBy(valid, (o) => o.delivery.governorate, (o) => o.total, 9),
      bySize: topBy(items, (i) => i.size, (i) => i.quantity, 10),
      status: ORDER_STATUSES.map((s) => ({ s, n: orders.filter((o) => o.status === s).length })),
    };
  }, [orders]);

  return (
    <>
      <PageTitle
        title="Analytics"
        description="Calculated from your real orders. Cancelled orders are excluded from sales."
        actions={
          <div className="flex gap-1" role="tablist" aria-label="Period">
            {PERIODS.map((d) => (
              <button
                key={d}
                role="tab"
                aria-selected={days === d}
                onClick={() => setDays(d)}
                className={cn("h-10 px-3 text-sm", days === d ? "bg-white text-ink" : "text-silver shadow-[inset_0_0_0_1px_var(--color-line)] hover:text-white")}
              >
                {d === 365 ? "12 months" : `${d} days`}
              </button>
            ))}
          </div>
        }
      />
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className={cn("transition-opacity", loading && "opacity-60")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Sales" value={formatMoney(m.sales)} hint={`${m.valid.length} orders`} />
          <StatCard label="Delivered revenue" value={formatMoney(m.revenue)} tone="success" />
          <StatCard label="Average order" value={formatMoney(m.aov)} />
          <StatCard label="Units sold" value={m.units} />
          <StatCard label="Cancelled" value={`${m.cancelRate}%`} hint="of all orders in the period" />
        </div>

        <Card className="mt-6" title="Sales per day">
          <SalesChart data={bucketByDay(orders, Math.min(days, 90))} />
          {days > 90 && <p className="mt-2 text-xs text-steel">Chart shows the last 90 days; totals cover 12 months.</p>}
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Top products by sales">{m.topRevenue.length ? <HBarChart data={m.topRevenue} height={Math.max(160, m.topRevenue.length * 34)} /> : <p className="text-sm text-steel">No sales in this period.</p>}</Card>
          <Card title="Top products by units">{m.topUnits.length ? <HBarChart data={m.topUnits} money={false} height={Math.max(160, m.topUnits.length * 34)} /> : <p className="text-sm text-steel">No sales in this period.</p>}</Card>
          <Card title="Sales by brand">{m.byBrand.length ? <HBarChart data={m.byBrand} height={Math.max(140, m.byBrand.length * 34)} /> : <p className="text-sm text-steel">No data.</p>}</Card>
          <Card title="Sales by club">{m.byClub.length ? <HBarChart data={m.byClub} height={Math.max(140, m.byClub.length * 34)} /> : <p className="text-sm text-steel">No club products sold.</p>}</Card>
          <Card title="Sales by governorate">{m.byArea.length ? <HBarChart data={m.byArea} height={Math.max(140, m.byArea.length * 34)} /> : <p className="text-sm text-steel">No data.</p>}</Card>
          <Card title="Most ordered sizes">{m.bySize.length ? <HBarChart data={m.bySize} money={false} height={Math.max(140, m.bySize.length * 30)} /> : <p className="text-sm text-steel">No data.</p>}</Card>
        </div>

        <Card className="mt-6" title="Orders by status">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {m.status.map(({ s, n }) => (
              <div key={s}>
                <p className="text-xs uppercase tracking-[0.1em] text-steel">{ORDER_STATUS_LABELS[s]}</p>
                <p className="font-display text-2xl font-bold text-white tabular-nums">{n}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
