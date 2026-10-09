import { fromMinor } from "@shared/money";
import type { Order } from "@shared/types";

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection and escape quotes.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function ordersToCsv(orders: Order[]): string {
  const head = [
    "Order",
    "Date",
    "Status",
    "Payment",
    "Customer",
    "Phone",
    "WhatsApp",
    "Email",
    "Governorate",
    "City",
    "Street",
    "Building",
    "Floor",
    "Instructions",
    "Items",
    "Item count",
    "Subtotal",
    "Delivery",
    "Total",
    "Currency",
    "Customer notes",
  ];
  const rows = orders.map((o) => [
    o.number,
    new Date(o.createdAt).toISOString(),
    o.status,
    `${o.payment.method}/${o.payment.status}`,
    o.customer.fullName,
    o.customer.phone,
    o.customer.whatsapp ?? "",
    o.customer.email ?? "",
    o.delivery.governorate,
    o.delivery.city,
    o.delivery.street,
    o.delivery.building,
    o.delivery.floor,
    o.delivery.instructions,
    o.items
      .map((i) => `${i.quantity} x ${i.name} [${i.size}${i.customization ? ` | ${[i.customization.name, i.customization.number].filter(Boolean).join(" ")}` : ""}] (${i.sku})`)
      .join("; "),
    o.itemCount,
    fromMinor(o.subtotal, o.currency),
    fromMinor(o.deliveryFee, o.currency),
    fromMinor(o.total, o.currency),
    o.currency,
    o.notes,
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿", text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
