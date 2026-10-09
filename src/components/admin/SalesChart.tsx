"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@shared/money";
import type { Order } from "@shared/types";

export interface DayPoint {
  day: string;
  label: string;
  revenue: number;
  orders: number;
}

export function bucketByDay(orders: Pick<Order, "createdAt" | "total" | "status">[], days: number, now = Date.now()): DayPoint[] {
  const out: DayPoint[] = [];
  const map = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    const point = { day: key, label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), revenue: 0, orders: 0 };
    out.push(point);
    map.set(key, point);
  }
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    const p = map.get(key);
    if (!p) continue;
    p.revenue += o.total;
    p.orders += 1;
  }
  return out;
}

const axis = { stroke: "#5c5c5c", fontSize: 11, tickLine: false, axisLine: false } as const;

export function SalesChart({ data, height = 260 }: { data: DayPoint[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Sales per day">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d6001c" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#d6001c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={24} />
          <YAxis {...axis} width={56} tickFormatter={(v) => formatMoney(v).replace(".00", "")} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,0.2)" }}
            contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 0, fontSize: 12 }}
            labelStyle={{ color: "#c0c0c0" }}
            formatter={(value, name) => (name === "revenue" ? [formatMoney(Number(value)), "Sales"] : [String(value), "Orders"])}
          />
          <Area type="monotone" dataKey="revenue" stroke="#f0142f" strokeWidth={2} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data, height = 260, money = true }: { data: { name: string; value: number }[]; height?: number; money?: boolean }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" {...axis} tickFormatter={(v) => (money ? formatMoney(v).replace(".00", "") : String(v))} />
          <YAxis type="category" dataKey="name" {...axis} width={120} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 0, fontSize: 12 }}
            formatter={(v) => [money ? formatMoney(Number(v)) : String(v), money ? "Sales" : "Units"]}
          />
          <Bar dataKey="value" fill="#d6001c" barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
