"use client";

import { CartDrawer } from "@/components/cart/CartDrawer";
import { QuickView } from "@/components/product/QuickView";
import { ToastHost } from "@/components/ui/Toast";
import type { NavItem } from "./Header";
import { MobileMenu } from "./MobileMenu";
import { MobileTabBar } from "./MobileTabBar";
import { SearchOverlay } from "./SearchOverlay";
import { WhatsAppButton } from "./WhatsAppButton";

/** Client-side overlays shared by every storefront page. */
export function StoreChrome({
  nav,
  secondary,
  suggestions,
  whatsappUrl,
}: {
  nav: NavItem[];
  secondary: NavItem[];
  suggestions: string[];
  whatsappUrl: string | null;
}) {
  return (
    <>
      <MobileMenu items={nav} secondary={secondary} whatsappUrl={whatsappUrl} />
      <SearchOverlay suggestions={suggestions} />
      <CartDrawer />
      <QuickView />
      <MobileTabBar />
      {whatsappUrl && <WhatsAppButton href={whatsappUrl} />}
      <ToastHost />
    </>
  );
}
