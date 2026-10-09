import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/** Region for every function. Keep it close to your Firestore location (see README). */
export const REGION = process.env.FUNCTIONS_REGION || "europe-west1";

function app() {
  return getApps()[0] ?? initializeApp();
}

/**
 * Test seam: unit tests inject an in-memory Firestore through this global.
 * In production nothing sets it, so the real Admin SDK instance is used.
 */
declare global {
  var __strykeFirestore: Firestore | undefined;
}

let cached: Firestore | undefined;
export function db(): Firestore {
  if (globalThis.__strykeFirestore) return globalThis.__strykeFirestore;
  if (!cached) {
    cached = getFirestore(app());
    cached.settings({ ignoreUndefinedProperties: true });
  }
  return cached;
}

export function adminAuth() {
  return getAuth(app());
}

export function bucket() {
  return getStorage(app()).bucket();
}
