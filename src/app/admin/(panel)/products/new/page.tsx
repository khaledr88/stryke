"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageTitle } from "@/components/admin/ui";

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-steel hover:text-white">
        <ArrowLeft className="size-4" /> Products
      </Link>
      <PageTitle title="Add product" description="Fill in the details, add photos and stock, then publish." />
      <ProductForm product={null} />
    </>
  );
}
