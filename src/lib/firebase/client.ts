"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { getToken, initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-stryke",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

interface Clients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  appCheck: AppCheck | null;
}

let clients: Clients | null = null;

/** Firebase in the browser: Authentication (admin sign-in) and Firestore (admin dashboard reads). */
export function firebase(): Clients {
  if (clients) return clients;
  const app = getApps().length ? getApp() : initializeApp(config);

  let appCheck: AppCheck | null = null;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (typeof window !== "undefined" && siteKey && !useEmulators) {
    try {
      appCheck = initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true });
    } catch {
      // already initialised (fast refresh)
    }
  }

  const auth = getAuth(app);
  const db = getFirestore(app);

  if (useEmulators && typeof window !== "undefined") {
    const host = window.location.hostname;
    try {
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
    } catch {
      // already connected
    }
  }

  clients = { app, auth, db, appCheck };
  return clients;
}

export class ApiError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/**
 * POST to one of the site's API routes. `auth` attaches the signed-in admin's
 * ID token; `appCheck` attaches an App Check token when App Check is set up.
 */
export async function apiPost<Res>(path: string, data: unknown, opts: { auth?: boolean; appCheck?: boolean } = {}): Promise<Res> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.auth) {
    const user = firebase().auth.currentUser;
    if (!user) throw new ApiError("unauthenticated", "Your session has ended. Sign in again.");
    headers.authorization = `Bearer ${await user.getIdToken()}`;
  }
  if (opts.appCheck) {
    const ac = firebase().appCheck;
    if (ac) {
      try {
        headers["x-firebase-appcheck"] = (await getToken(ac)).token;
      } catch {
        // The server decides whether a missing token is acceptable.
      }
    }
  }
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers, body: JSON.stringify(data) });
  } catch {
    throw new ApiError("unavailable", "We couldn't reach the server. Check your connection and try again.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.error) {
    const e = json?.error ?? {};
    throw new ApiError(e.code ?? "internal", e.message ?? "Something went wrong. Please try again.", e.details);
  }
  return json.result as Res;
}

export interface ApiErrorInfo {
  code: string;
  message: string;
  details?: unknown;
}

export function apiError(err: unknown): ApiErrorInfo {
  if (err instanceof ApiError) return { code: err.code, message: err.message, details: err.details };
  return { code: "internal", message: (err as Error)?.message || "Something went wrong." };
}
