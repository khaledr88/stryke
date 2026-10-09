"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  collection,
  doc,
  getAggregateFromServer,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  sum,
  Timestamp,
  where,
  type Firestore,
} from "firebase/firestore";
import { ORDER_STATUSES, type OrderStatus } from "@shared/constants";
import { formatMoney } from "@shared/money";
import { withId } from "@shared/serialize";
import { mergeSettings } from "@shared/settings";
import type { Order, Product, StoreSettings } from "@shared/types";
import { SalesChart, bucketByDay } from "@/components/admin/SalesChart";
import { Btn, Card, ErrorBox, PageTitle, StatCard, StatusPill } from "@/components/admin/ui";
import { firebase } from "@/lib/firebase/client";
import { friendlyFirestoreError, useLiveDoc, useLiveQuery } from "@/lib/admin/data";

interface Stats {
  byStatus: Record<OrderStatus, number>;
  totalSales: number;
  revenue: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: Product[];
  last30: Order[];
}

async function fetchStats(db: Firestore, threshold: number): Promise<Stats> {
  const orders = collection(db, "orders");
  const products = collection(db, "products");
  const counts = await Promise.all(ORDER_STATUSES.map((s) => getCountFromServer(query(orders, where("status", "==", s)))));
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, counts[i].data().count])) as Record<OrderStatus, number>;
  const [sales, revenue, active, out, low, last30] = await Promise.all([
    getAggregateFromServer(query(orders, where("status", "in", ["pending", "confirmed", "preparing", "shipped", "delivered"])), { total: sum("total") }),
    getAggregateFromServer(query(orders, where("status", "==", "delivered")), { total: sum("total") }),
    getCountFromServer(query(products, where("status", "==", "published"))),
    getCountFromServer(query(products, where("status", "==", "published"), where("inStock", "==", false))),
    getDocs(query(products, where("status", "==", "published"), where("minVariantStock", "<=", threshold), orderBy("minVariantStock"), limit(12))),
    getDocs(query(orders, where("createdAt", ">=", Timestamp.fromMillis(Date.now() - 30 * 86_400_000)), orderBy("createdAt", "desc"))),
  ]);
  return {
    byStatus,
    totalSales: sales.data().total ?? 0,
    revenue: revenue.data().total ?? 0,
    activeProducts: active.data().count,
    outOfStock: out.data().count,
    lowStock: low.docs.map((d) => withId<Product>(d.id, d.data())),
    last30: last30.docs.map((d) => withId<Order>(d.id, d.data())),
  };
}

export default function OverviewPage() {
  const { db } = firebase();
  const settingsDoc = useLiveDoc<StoreSettings>(() => doc(db, "storeSettings", "main"), "settings");
  const settings = mergeSettings(settingsDoc.data);
  const threshold = settings.inventory.lowStockThreshold;
  const recent = useLiveQuery<Order>(() => query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(8)), "recent-orders");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchStats(db, threshold)
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        setError(null);
      })
      .catch((e) => !cancelled && setError(friendlyFirestoreError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [db, threshold, refreshKey]);

  const totalOrders = stats ? Object.values(stats.byStatus).reduce((a, b) => a + b, 0) : 0;
  const series = stats ? bucketByDay(stats.last30, 30) : [];
  const last30Revenue = series.reduce((s, d) => s + d.revenue, 0);
  const lowStock = stats?.lowStock.filter((p) => p.minVariantStock > 0 || p.inStock) ?? [];

  return (
    <>
      <PageTitle
        title="Overview"
        description="Live figures from your orders and inventory."
        actions={
          <Btn
            onClick={() => {
              setLoading(true);
              setRefreshKey((k) => k + 1);
            }}
            loading={loading}
          >
            <RefreshCw className="size-4" /> Refresh
          </Btn>
        }
      />
      {error && (
        <div className="mb-6">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total orders" value={stats ? totalOrders : "–"} />
        <StatCard label="Pending" value={stats ? stats.byStatus.pending : "–"} tone={stats?.byStatus.pending ? "warning" : undefined} hint={<Link href="/admin/orders?status=pending" className="underline">Review</Link>} />
        <StatCard label="Confirmed" value={stats ? stats.byStatus.confirmed + stats.byStatus.preparing + stats.byStatus.shipped : "–"} hint="Confirmed, preparing or shipped" />
        <StatCard label="Delivered" value={stats ? stats.byStatus.delivered : "–"} tone="success" />
        <StatCard label="Cancelled" value={stats ? stats.byStatus.cancelled : "–"} />
        <StatCard label="Total sales" value={stats ? formatMoney(stats.totalSales, settings.currency) : "–"} hint="All orders except cancelled" />
        <StatCard label="Completed revenue" value={stats ? formatMoney(stats.revenue, settings.currency) : "–"} tone="success" hint="Delivered (paid) orders only" />
        <StatCard label="Active products" value={stats ? stats.activeProducts : "–"} hint={stats?.outOfStock ? <span className="text-red-bright">{stats.outOfStock} out of stock</span> : "All in stock"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Sales — last 30 days" description={stats ? `${formatMoney(last30Revenue, settings.currency)} from ${series.reduce((s, d) => s + d.orders, 0)} orders (excluding cancelled)` : undefined}>
          {stats ? <SalesChart data={series} /> : <div className="skeleton h-[260px]" />}
        </Card>
        <Card title="Low stock" description={`Products with a size at ${threshold} or fewer`} padded={false} actions={<Link href="/admin/inventory?filter=low" className="text-xs text-silver underline">Inventory</Link>}>
          {!stats ? (
            <div className="skeleton m-5 h-40" />
          ) : lowStock.length === 0 && stats.outOfStock === 0 ? (
            <p className="p-5 text-sm text-steel">Nothing running low.</p>
          ) : (
            <ul className="divide-y divide-line">
              {stats.lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-white/[0.03]">
                    <span className="min-w-0 truncate text-white">{p.name}</span>
                    <span className="shrink-0 text-xs">
                      {p.variants
                        .filter((v) => v.stock <= threshold)
                        .slice(0, 4)
                        .map((v) => (
                          <span key={v.id} className={v.stock === 0 ? "ml-2 text-red-bright" : "ml-2 text-warning"}>
                            {v.size}: {v.stock}
                          </span>
                        ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6" title="Recent orders" padded={false} actions={<Link href="/admin/orders" className="text-xs text-silver underline">All orders</Link>}>
        {recent.error ? (
          <div className="p-5">
            <ErrorBox>{recent.error}</ErrorBox>
          </div>
        ) : recent.data.length === 0 ? (
          <p className="p-5 text-sm text-steel">{recent.loading ? "Loading…" : "No orders yet. They’ll appear here the moment a customer checks out."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-steel">
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Placed</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.data.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-3">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-white hover:underline">
                        {o.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-silver">
                      {o.customer.fullName} <span className="text-steel">· {o.delivery.governorate}</span>
                    </td>
                    <td className="px-5 py-3 text-steel">{new Date(o.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="px-5 py-3 text-right text-white tabular-nums">{formatMoney(o.total, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
