import type { Metadata } from "next";
import { ToastHost } from "@/components/ui/Toast";
import { AdminAuthProvider } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · STRYKE Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      {children}
      <ToastHost />
    </AdminAuthProvider>
  );
}
