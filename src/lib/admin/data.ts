"use client";

import { useEffect, useState } from "react";
import { onSnapshot, type DocumentReference, type Query } from "firebase/firestore";
import { withId } from "@shared/serialize";

export interface LiveResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

interface Snapshot<T> {
  key: string;
  data: T;
  error: string | null;
}

/**
 * Realtime query subscription. `key` must change whenever the query changes;
 * results from a previous key are never shown for a new one.
 */
export function useLiveQuery<T>(make: () => Query, key: string): LiveResult<T[]> {
  const [snap, setSnap] = useState<Snapshot<T[]> | null>(null);
  useEffect(() => {
    return onSnapshot(
      make(),
      (s) => setSnap({ key, data: s.docs.map((d) => withId<T>(d.id, d.data())), error: null }),
      (err) => setSnap({ key, data: [], error: friendlyFirestoreError(err) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = snap?.key === key ? snap : null;
  return { data: current?.data ?? [], loading: !current, error: current?.error ?? null };
}

export function useLiveDoc<T>(make: () => DocumentReference, key: string): LiveResult<(T & { id: string }) | null> & { exists: boolean } {
  const [snap, setSnap] = useState<Snapshot<(T & { id: string }) | null> | null>(null);
  useEffect(() => {
    return onSnapshot(
      make(),
      (s) => setSnap({ key, data: s.exists() ? withId<T & { id: string }>(s.id, s.data()) : null, error: null }),
      (err) => setSnap({ key, data: null, error: friendlyFirestoreError(err) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = snap?.key === key ? snap : null;
  return { data: current?.data ?? null, exists: Boolean(current?.data), loading: !current, error: current?.error ?? null };
}

export function friendlyFirestoreError(err: unknown): string {
  const code = (err as { code?: string }).code ?? "";
  if (code === "permission-denied") return "You don't have permission to see this. Sign in with an administrator account.";
  if (code === "failed-precondition") return "A database index is still being built. Try again in a few minutes.";
  if (code === "unavailable") return "Can't reach the database. Check your connection.";
  return (err as Error)?.message || "Something went wrong loading data.";
}
