import type { Metadata, Viewport } from "next";
import { barlow, barlowCondensed } from "./fonts";
import { siteUrl } from "@/lib/utils/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "STRYKE — Football & Sportswear",
    template: "%s | STRYKE",
  },
  description:
    "Football jerseys, football boots, sportswear and training equipment from the brands and clubs you follow. Delivered across Lebanon, cash on delivery.",
  applicationName: "STRYKE",
  openGraph: {
    type: "website",
    siteName: "STRYKE",
    locale: "en_LB",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
