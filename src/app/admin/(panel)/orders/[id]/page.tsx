"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, MessageCircle, Phone, Printer } from "lucide-react";
import { doc } from "firebase/firestore";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, nextStatuses, type OrderStatus } from "@shared/constants";
import { formatMoney } from "@shared/money";
import { formatPhoneForDisplay, whatsappLink } from "@shared/phone";
import type { Order } from "@shared/types";
import { Btn, Card, ConfirmDialog, ErrorBox, PageTitle, Spinner, StatusPill, TextArea, Toggle } from "@/components/admin/ui";
import { adminApi } from "@/lib/admin/api";
import { useLiveDoc } from "@/lib/admin/data";
import { callableError, firebase } from "@/lib/firebase/client";
import { useUi } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";

const PIPELINE: OrderStatus[] = ["pending", "confirmed", "preparing", "shipped", "delivered"];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, loading, error } = useLiveDoc<Order>(() => doc(firebase().db, "orders", id), id);
  const notify = useUi((s) => s.notify);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [restock, setRestock] = useState(true);
  const [cancelNote, setCancelNote] = useState("");
  const [note, setNote] = useState("");

  if (loading) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!order) return <ErrorBox>Order {id} was not found.</ErrorBox>;

  async function move(status: OrderStatus, extra: { note?: string; restock?: boolean } = {}) {
    setBusy(status);
    try {
      await adminApi.updateOrderStatus({ orderId: order!.id, status, ...extra });
      notify(`Order marked as ${ORDER_STATUS_LABELS[status].toLowerCase()}`);
    } catch (e) {
      notify(callableError(e).message, "error");
    } finally {
      setBusy(null);
    }
  }

  const next = nextStatuses(order.status).filter((s) => s !== "cancelled");
  const canCancel = nextStatuses(order.status).includes("cancelled");
  const wa = whatsappLink(order.customer.whatsapp || order.customer.phone, `Hello ${order.customer.fullName.split(" ")[0]}, this is STRYKE about your order ${order.number}.`);
  const stepIndex = PIPELINE.indexOf(order.status);

  return (
    <div className="print:text-black">
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-steel hover:text-white print:hidden">
        <ArrowLeft className="size-4" /> Orders
      </Link>
      <PageTitle
        title={`Order ${order.number}`}
        description={`Placed ${new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Btn onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Btn>
            {canCancel && (
              <Btn variant="danger" onClick={() => setCancelOpen(true)}>
                Cancel order
              </Btn>
            )}
            {next.slice(0, 1).map((s) => (
              <Btn key={s} variant="primary" loading={busy === s} onClick={() => move(s)}>
                Mark as {ORDER_STATUS_LABELS[s].toLowerCase()}
              </Btn>
            ))}
          </div>
        }
      />

      {/* Progress */}
      <div className="mb-6 bg-carbon p-5 shadow-[inset_0_0_0_1px_var(--color-line)] print:hidden">
        {order.status === "cancelled" ? (
          <p className="flex items-center gap-3 text-sm text-silver">
            <StatusPill status="cancelled" /> This order was cancelled{order.stockReleased ? " and its items were returned to stock" : ""}.
          </p>
        ) : (
          <ol className="grid grid-cols-5 gap-2">
            {PIPELINE.map((s, i) => (
              <li key={s}>
                <div className={cn("h-1 skew-x-[-35deg]", i <= stepIndex ? "bg-red" : "bg-white/10")} />
                <p className={cn("mt-2 text-xs font-semibold uppercase tracking-[0.1em]", i <= stepIndex ? "text-white" : "text-steel")}>{ORDER_STATUS_LABELS[s]}</p>
              </li>
            ))}
          </ol>
        )}
        {next.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="self-center text-xs text-steel">Skip to:</span>
            {next.slice(1).map((s) => (
              <Btn key={s} size="sm" loading={busy === s} onClick={() => move(s)}>
                {ORDER_STATUS_LABELS[s]}
              </Btn>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Items" padded={false}>
            <ul className="divide-y divide-line">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex items-center gap-4 px-5 py-4">
                  <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-graphite print:hidden">
                    {i.image ? <Image src={i.image} alt="" fill sizes="56px" className="object-cover" /> : null}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <Link href={`/admin/products/${i.productId}`} className="font-semibold text-white hover:underline print:text-black">
                      {i.name}
                    </Link>
                    <p className="text-steel">
                      Size <span className="font-semibold text-white print:text-black">{i.size}</span>
                      {i.color ? ` · ${i.color}` : ""} · SKU {i.sku}
                    </p>
                    {i.customization && (
                      <p className="text-warning">
                        Print: {i.customization.name} {i.customization.number} (+{formatMoney(i.customization.price, order.currency)})
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <p className="text-steel">
                      {i.quantity} × {formatMoney(i.unitPrice, order.currency)}
                    </p>
                    <p className="font-semibold text-white print:text-black">{formatMoney(i.lineTotal, order.currency)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-silver">Subtotal ({order.itemCount} items)</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotal, order.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-silver">Delivery — {order.delivery.governorate}</dt>
                <dd className="tabular-nums">{order.deliveryFee ? formatMoney(order.deliveryFee, order.currency) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt className="font-semibold text-white print:text-black">Total to collect</dt>
                <dd className="font-display text-2xl font-bold text-white tabular-nums print:text-black">{formatMoney(order.total, order.currency)}</dd>
              </div>
              <div className="flex justify-between text-xs text-steel">
                <dt>Payment</dt>
                <dd>
                  {PAYMENT_METHOD_LABELS[order.payment.method]} · {order.payment.status}
                </dd>
              </div>
            </dl>
          </Card>

          {order.notes && (
            <Card title="Customer note">
              <p className="text-sm whitespace-pre-wrap text-silver">{order.notes}</p>
            </Card>
          )}

          <Card title="Internal notes" description="Only visible to administrators" className="print:hidden">
            {order.internalNotes.length > 0 && (
              <ul className="mb-4 space-y-3">
                {[...order.internalNotes].reverse().map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className="whitespace-pre-wrap text-white">{n.text}</p>
                    <p className="text-xs text-steel">
                      {n.by} · {new Date(n.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                setBusy("note");
                try {
                  await adminApi.addOrderNote({ orderId: order.id, text: note.trim() });
                  setNote("");
                } catch (err) {
                  notify(callableError(err).message, "error");
                } finally {
                  setBusy(null);
                }
              }}
              className="space-y-2"
            >
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called customer, delivery Tuesday afternoon" rows={3} />
              <Btn type="submit" loading={busy === "note"} disabled={!note.trim()}>
                Add note
              </Btn>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-semibold text-white print:text-black">{order.customer.fullName}</p>
            <p className="mt-1 text-sm text-silver">{formatPhoneForDisplay(order.customer.phone)}</p>
            {order.customer.whatsapp && order.customer.whatsapp !== order.customer.phone && (
              <p className="text-sm text-silver">WhatsApp {formatPhoneForDisplay(order.customer.whatsapp)}</p>
            )}
            {order.customer.email && <p className="text-sm text-silver">{order.customer.email}</p>}
            <div className="mt-4 flex gap-2 print:hidden">
              <a href={`tel:${order.customer.phone}`} className="inline-flex h-9 items-center gap-2 px-3 text-sm text-white shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-white/5">
                <Phone className="size-4" /> Call
              </a>
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 bg-[#1f8f4e] px-3 text-sm text-white hover:bg-[#23a35a]">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              )}
            </div>
          </Card>
          <Card title="Delivery address">
            <address className="text-sm leading-relaxed text-silver not-italic">
              {order.delivery.street}
              <br />
              {order.delivery.building}
              {order.delivery.floor ? `, floor ${order.delivery.floor}` : ""}
              <br />
              {order.delivery.city}, {order.delivery.governorate}
            </address>
            {order.delivery.instructions && <p className="mt-3 text-sm text-warning">“{order.delivery.instructions}”</p>}
          </Card>
          <Card title="History" className="print:hidden">
            <ol className="space-y-3">
              {[...order.statusHistory].reverse().map((h, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <StatusPill status={h.status} />
                  <div>
                    <p className="text-silver">
                      {new Date(h.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {h.by}
                    </p>
                    {h.note && <p className="text-steel">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel ${order.number}?`}
        body="The customer won’t be notified automatically — call or message them."
        confirmLabel="Cancel order"
        danger
        onConfirm={() => move("cancelled", { note: cancelNote, restock })}
      >
        <Toggle checked={restock} onChange={setRestock} label="Return items to stock" description="Turn off if the items are damaged or already gone." disabled={order.stockReleased} />
        <TextArea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Reason (optional)" rows={2} />
      </ConfirmDialog>
    </div>
  );
}
