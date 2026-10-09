import { FieldValue, type Transaction, type Firestore } from "firebase-admin/firestore";
import { COL } from "@shared/constants";
import type { Actor } from "./guards";

export interface AuditEntry {
  action: string;
  target: { type: string; id: string; label?: string };
  details?: Record<string, unknown>;
}

/** Firestore rejects `undefined`; drop such keys from free-form details. */
function clean(details: Record<string, unknown> | undefined) {
  if (!details) return {};
  return Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined));
}

function entry(actor: Actor, e: AuditEntry) {
  return {
    ...e,
    details: clean(e.details),
    actor: { uid: actor.uid, email: actor.email },
    at: FieldValue.serverTimestamp(),
  };
}

export function auditInTx(db: Firestore, tx: Transaction, actor: Actor, e: AuditEntry) {
  tx.set(db.collection(COL.adminAuditLogs).doc(), entry(actor, e));
}

export async function audit(db: Firestore, actor: Actor, e: AuditEntry) {
  await db.collection(COL.adminAuditLogs).add(entry(actor, e));
}
