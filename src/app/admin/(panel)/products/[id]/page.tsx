"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { withId } from "@shared/serialize";
import type { Product } from "@shared/types";
import { ProductForm } from "@/components/admin/ProductForm";
import { ErrorBox, PageTitle, Spinner } from "@/components/admin/ui";
import { friendlyFirestoreError } from "@/lib/admin/data";
import { firebase } from "@/lib/firebase/client";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Loaded once (not live) so incoming orders don't reset the form while editing.
    getDoc(doc(firebase().db, "products", id))
      .then((snap) => setProduct(snap.exists() ? withId<Product>(snap.id, snap.data()) : null))
      .catch((e) => setError(friendlyFirestoreError(e)));
  }, [id]);

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-steel hover:text-white">
        <ArrowLeft className="size-4" /> Products
      </Link>
      {error ? (
        <ErrorBox>{error}</ErrorBox>
      ) : product === undefined ? (
        <Spinner />
      ) : product === null ? (
        <ErrorBox>This product doesn’t exist or was deleted.</ErrorBox>
      ) : (
        <>
          <PageTitle title={product.name} description={`SKU ${product.sku} · ${product.totalStock} in stock · ${product.salesCount} sold`} />
          <ProductForm key={product.id} product={product} />
        </>
      )}
    </>
  );
}
