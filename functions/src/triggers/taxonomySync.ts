import type { Firestore } from "firebase-admin/firestore";
import { COL } from "@shared/constants";

const FIELD: Record<string, { idField: string; nameField: string }> = {
  [COL.brands]: { idField: "brandId", nameField: "brandName" },
  [COL.categories]: { idField: "categoryId", nameField: "categoryName" },
  [COL.clubs]: { idField: "clubId", nameField: "clubName" },
};

/**
 * Products store brand/category/club names for fast listing. When the admin
 * renames one, rewrite the denormalised name on every product that uses it.
 */
export async function syncTaxonomyName(db: Firestore, collection: string, id: string, name: string): Promise<number> {
  const f = FIELD[collection];
  if (!f) return 0;
  const snap = await db.collection(COL.products).where(f.idField, "==", id).get();
  let updated = 0;
  let batch = db.batch();
  let pending = 0;
  for (const doc of snap.docs) {
    if (doc.get(f.nameField) === name) continue;
    batch.update(doc.ref, { [f.nameField]: name });
    pending++;
    updated++;
    if (pending === 450) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  return updated;
}
