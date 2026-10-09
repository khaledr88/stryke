import type { Metadata } from "next";
import { WishlistClient } from "@/components/product/WishlistClient";

export const metadata: Metadata = { title: "Saved items", robots: { index: false } };

export default function WishlistPage() {
  return <WishlistClient />;
}
