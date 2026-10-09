import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-side Firebase Admin. On Vercel, set FIREBASE_SERVICE_ACCOUNT_JSON to the
 * service-account key (the whole JSON). Locally, the emulator env vars
 * (FIRESTORE_EMULATOR_HOST…) are enough, or GOOGLE_APPLICATION_CREDENTIALS.
 */
export function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return initializeApp({
    projectId,
    ...(json ? { credential: cert(JSON.parse(json)) } : {}),
  });
}

declare global {
  // Test seam used by scripts/e2e — never set in production.
  var __strykeFirestore: Firestore | undefined;
}

let cached: Firestore | undefined;
export function adminDb(): Firestore {
  if (globalThis.__strykeFirestore) return globalThis.__strykeFirestore;
  if (!cached) {
    cached = getFirestore(adminApp());
    try {
      cached.settings({ ignoreUndefinedProperties: true });
    } catch {
      // settings() can only be called once per instance (hot reload in dev).
    }
  }
  return cached;
}

export function adminAuth() {
  return getAuth(adminApp());
}
