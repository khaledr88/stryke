"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

export function WhatsAppButton({ href }: { href: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout") || pathname.startsWith("/product/")) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ask us on WhatsApp"
      className="fixed right-8 bottom-8 z-40 hidden size-13 place-items-center rounded-full bg-[#1f8f4e] text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 lg:grid"
    >
      <MessageCircle className="size-6" strokeWidth={1.8} />
    </a>
  );
}
