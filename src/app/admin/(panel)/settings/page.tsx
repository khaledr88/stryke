"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { formatMoney } from "@shared/money";
import { normalizePhone } from "@shared/phone";
import { plain } from "@shared/serialize";
import { mergeSettings } from "@shared/settings";
import type { StoreSettings } from "@shared/types";
import { Btn, Card, ErrorBox, FieldShell, MoneyInput, PageTitle, SelectInput, Spinner, TextArea, TextInput, Toggle } from "@/components/admin/ui";
import { refreshStorefront } from "@/lib/admin/api";
import { friendlyFirestoreError } from "@/lib/admin/data";
import { firebase } from "@/lib/firebase/client";
import { useUi } from "@/lib/store/ui";

export default function SettingsPage() {
  const { db, auth } = firebase();
  const notify = useUi((s) => s.notify);
  const [s, setS] = useState<StoreSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => {
    getDoc(doc(db, "storeSettings", "main"))
      .then((snap) => setS(mergeSettings(snap.exists() ? plain<StoreSettings>(snap.data()) : null)))
      .catch((e) => setError(friendlyFirestoreError(e)));
  }, [db]);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!s) return <Spinner />;

  const set = (patch: Partial<StoreSettings>) => setS((x) => (x ? { ...x, ...patch } : x));
  const setContact = (patch: Partial<StoreSettings["contact"]>) => set({ contact: { ...s.contact, ...patch } });
  const setSocial = (patch: Partial<StoreSettings["social"]>) => set({ social: { ...s.social, ...patch } });
  const setPolicy = (patch: Partial<StoreSettings["policies"]>) => set({ policies: { ...s.policies, ...patch } });
  const setZone = (i: number, patch: Partial<StoreSettings["delivery"]["zones"][number]>) =>
    set({ delivery: { ...s.delivery, zones: s.delivery.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)) } });

  async function save() {
    if (!s) return;
    const issues: string[] = [];
    if (s.contact.whatsapp && !normalizePhone(s.contact.whatsapp)) issues.push("WhatsApp number isn’t valid.");
    if (s.contact.phone && !normalizePhone(s.contact.phone)) issues.push("Phone number isn’t valid.");
    for (const z of s.delivery.zones) if (z.enabled && z.fee == null) issues.push(`Set a delivery fee for ${z.governorate} or turn it off.`);
    for (const url of [s.social.instagram, s.social.facebook, s.social.tiktok]) if (url && !/^https:\/\//.test(url)) issues.push(`Social links must start with https:// (${url}).`);
    setProblems(issues);
    if (issues.length) return;
    setSaving(true);
    try {
      const { updatedAt: _u, ...data } = s;
      void _u;
      await setDoc(doc(db, "storeSettings", "main"), {
        ...data,
        contact: { ...data.contact, whatsapp: data.contact.whatsapp ? normalizePhone(data.contact.whatsapp) : "", phone: data.contact.phone ? normalizePhone(data.contact.phone) : "" },
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? "",
      });
      await refreshStorefront(["settings"]);
      notify("Settings saved");
    } catch (e) {
      notify(friendlyFirestoreError(e), "error");
    } finally {
      setSaving(false);
    }
  }

  const saveBtn = (
    <Btn variant="primary" loading={saving} onClick={save}>
      Save settings
    </Btn>
  );

  return (
    <>
      <PageTitle title="Store settings" description="Contact details, delivery, payments and policies shown on the store." actions={saveBtn} />
      {problems.length > 0 && (
        <div className="mb-6">
          <ErrorBox>
            <ul className="list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </ErrorBox>
        </div>
      )}
      <div className="space-y-6">
        <Card title="Store">
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldShell label="Store name">
              <TextInput value={s.storeName} onChange={(e) => set({ storeName: e.target.value })} maxLength={60} />
            </FieldShell>
            <FieldShell label="Tagline">
              <TextInput value={s.tagline} onChange={(e) => set({ tagline: e.target.value })} />
            </FieldShell>
            <FieldShell label="Currency" hint={s.currency === "LBP" ? "Prices are not converted — re-enter every product price in LBP before switching." : "No exchange rate is applied anywhere."}>
              <SelectInput value={s.currency} onChange={(e) => set({ currency: e.target.value as StoreSettings["currency"] })}>
                <option value="USD">USD — US dollar</option>
                <option value="LBP">LBP — Lebanese pound</option>
              </SelectInput>
            </FieldShell>
          </div>
        </Card>

        <Card title="Contact" description="Shown in the footer and on the contact page.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell label="WhatsApp number" hint="Used for the WhatsApp button and order confirmations">
              <TextInput value={s.contact.whatsapp} onChange={(e) => setContact({ whatsapp: e.target.value })} placeholder="+961 71 123 456" />
            </FieldShell>
            <FieldShell label="Phone">
              <TextInput value={s.contact.phone} onChange={(e) => setContact({ phone: e.target.value })} placeholder="+961 1 123 456" />
            </FieldShell>
            <FieldShell label="Email">
              <TextInput type="email" value={s.contact.email} onChange={(e) => setContact({ email: e.target.value })} />
            </FieldShell>
            <FieldShell label="Opening hours">
              <TextInput value={s.contact.hours} onChange={(e) => setContact({ hours: e.target.value })} placeholder="Mon–Sat, 10:00–20:00" />
            </FieldShell>
            <FieldShell label="Store address" hint="Leave empty if you sell online only">
              <TextInput value={s.contact.address} onChange={(e) => setContact({ address: e.target.value })} />
            </FieldShell>
            <FieldShell label="Map link">
              <TextInput value={s.contact.mapUrl} onChange={(e) => setContact({ mapUrl: e.target.value })} placeholder="https://maps.google.com/…" />
            </FieldShell>
            <FieldShell label="Instagram URL">
              <TextInput value={s.social.instagram} onChange={(e) => setSocial({ instagram: e.target.value })} placeholder="https://instagram.com/…" />
            </FieldShell>
            <FieldShell label="Facebook URL">
              <TextInput value={s.social.facebook} onChange={(e) => setSocial({ facebook: e.target.value })} />
            </FieldShell>
            <FieldShell label="TikTok URL">
              <TextInput value={s.social.tiktok} onChange={(e) => setSocial({ tiktok: e.target.value })} />
            </FieldShell>
          </div>
        </Card>

        <Card title="Delivery" description="Customers can only check out to governorates you enable here.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.1em] text-steel">
                  <th className="py-2 pr-4 font-semibold">Governorate</th>
                  <th className="py-2 pr-4 font-semibold">Deliver here</th>
                  <th className="py-2 pr-4 font-semibold">Fee</th>
                  <th className="py-2 font-semibold">Estimated time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s.delivery.zones.map((z, i) => (
                  <tr key={z.id}>
                    <td className="py-2 pr-4 text-white">{z.governorate}</td>
                    <td className="py-2 pr-4">
                      <Toggle checked={z.enabled} onChange={(v) => setZone(i, { enabled: v })} label={z.enabled ? "On" : "Off"} />
                    </td>
                    <td className="w-36 py-2 pr-4">
                      <MoneyInput key={`${z.id}-fee`} value={z.fee} onChange={(v) => setZone(i, { fee: v })} allowEmpty placeholder="Not set" />
                    </td>
                    <td className="py-2">
                      <TextInput value={z.eta} onChange={(e) => setZone(i, { eta: e.target.value })} placeholder="1–2 days" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <FieldShell label="Free delivery over" hint={s.delivery.freeDeliveryThreshold ? `Orders of ${formatMoney(s.delivery.freeDeliveryThreshold)} or more ship free` : "Leave empty to always charge delivery"}>
              <MoneyInput value={s.delivery.freeDeliveryThreshold} onChange={(v) => set({ delivery: { ...s.delivery, freeDeliveryThreshold: v } })} allowEmpty />
            </FieldShell>
            <FieldShell label="Delivery note at checkout">
              <TextInput value={s.delivery.note} onChange={(e) => set({ delivery: { ...s.delivery, note: e.target.value } })} placeholder="Orders placed before 2pm leave the same day" />
            </FieldShell>
          </div>
        </Card>

        <Card title="Payments and orders">
          <div className="space-y-5">
            <Toggle checked={s.payments.cod.enabled} onChange={(v) => set({ payments: { cod: { ...s.payments.cod, enabled: v } } })} label="Accept cash on delivery" description="Turning this off pauses checkout — it’s currently the only payment method." />
            <FieldShell label="Cash on delivery note">
              <TextInput value={s.payments.cod.note} onChange={(e) => set({ payments: { cod: { ...s.payments.cod, note: e.target.value } } })} />
            </FieldShell>
            <Toggle checked={s.orders.whatsappConfirmation} onChange={(v) => set({ orders: { ...s.orders, whatsappConfirmation: v } })} label="Offer “Confirm on WhatsApp” after checkout" />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Most of one size per order">
                <TextInput type="number" min={1} max={50} value={s.orders.maxQuantityPerLine} onChange={(e) => set({ orders: { ...s.orders, maxQuantityPerLine: Math.max(1, Number(e.target.value) || 1) } })} />
              </FieldShell>
              <FieldShell label="Low stock warning at" hint="Sizes with this many or fewer are flagged">
                <TextInput type="number" min={0} max={100} value={s.inventory.lowStockThreshold} onChange={(e) => set({ inventory: { lowStockThreshold: Math.max(0, Number(e.target.value) || 0) } })} />
              </FieldShell>
            </div>
          </div>
        </Card>

        <Card title="Policies and pages" description="Plain text. Blank lines make paragraphs, “## ” starts a heading, “- ” makes a bullet. Empty policies are hidden from the footer.">
          <div className="grid gap-4 lg:grid-cols-2">
            {(
              [
                ["about", "About STRYKE"],
                ["shipping", "Shipping policy"],
                ["returns", "Return policy"],
                ["privacy", "Privacy policy"],
                ["terms", "Terms and conditions"],
              ] as const
            ).map(([k, label]) => (
              <FieldShell key={k} label={label}>
                <TextArea value={s.policies[k]} onChange={(e) => setPolicy({ [k]: e.target.value })} rows={8} />
              </FieldShell>
            ))}
          </div>
        </Card>
        <div className="flex justify-end">{saveBtn}</div>
      </div>
    </>
  );
}
