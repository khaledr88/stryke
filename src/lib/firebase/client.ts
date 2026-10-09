"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-stryke",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-stryke.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
const region = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "europe-west1";

interface Clients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
}

let clients: Clients | null = null;

export function firebase(): Clients {
  if (clients) return clients;
  const app = getApps().length ? getApp() : initializeApp(config);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (typeof window !== "undefined" && siteKey && !useEmulators) {
    try {
      initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
    } catch {
      // already initialised (fast refresh)
    }
  }

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, region);

  if (useEmulators && typeof window !== "undefined") {
    const host = window.location.hostname;
    try {
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
      connectStorageEmulator(storage, host, 9199);
      connectFunctionsEmulator(functions, host, 5001);
    } catch {
      // already connected
    }
  }

  clients = { app, auth, db, storage, functions };
  return clients;
}

/** Typed wrapper around a callable Cloud Function. */
export function callable<Req, Res>(name: string) {
  return async (data: Req): Promise<Res> => {
    const fn = httpsCallable<Req, Res>(firebase().functions, name, { timeout: 30_000 });
    const res = await fn(data);
    return res.data;
  };
}

export interface CallableErrorInfo {
  code: string;
  message: string;
  details?: unknown;
}

export function callableError(err: unknown): CallableErrorInfo {
  const e = err as { code?: string; message?: string; details?: unknown };
  const code = (e.code ?? "unknown").replace(/^functions\//, "");
  let message = e.message || "Something went wrong.";
  if (code === "unavailable" || code === "deadline-exceeded") message = "We couldn't reach the server. Check your connection and try again.";
  if (code === "internal" && /^internal$/i.test(message)) message = "Something went wrong. Please try again.";
  return { code, message, details: e.details };
}
