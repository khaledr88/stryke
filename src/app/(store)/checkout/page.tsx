import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { getSettings } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <CheckoutClient
      zones={settings.delivery.zones.filter((z) => z.enabled && z.fee != null).map((z) => ({ governorate: z.governorate, fee: z.fee!, eta: z.eta }))}
      allGovernorates={settings.delivery.zones.map((z) => z.governorate)}
      freeDeliveryThreshold={settings.delivery.freeDeliveryThreshold}
      codEnabled={settings.payments.cod.enabled}
      codNote={settings.payments.cod.note}
      deliveryNote={settings.delivery.note}
      termsAvailable={Boolean(settings.policies.terms)}
      privacyAvailable={Boolean(settings.policies.privacy)}
    />
  );
}
