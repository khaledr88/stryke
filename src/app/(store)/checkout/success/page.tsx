import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default function SuccessPage() {
  return <OrderConfirmation />;
}
