"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, type User } from "firebase/auth";
import { firebase } from "@/lib/firebase/client";

type Status = "loading" | "signed-out" | "not-admin" | "admin";

interface AdminAuth {
  status: Status;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  idToken: () => Promise<string | null>;
}

const Ctx = createContext<AdminAuth | null>(null);

/**
 * Admin access is decided by the `admin` custom claim on the ID token, which
 * only the server (scripts/grant-admin.mjs) can set. The UI check here is for
 * convenience — Firestore/Storage rules and Cloud Functions enforce it.
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { auth } = firebase();
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (!u) return setStatus("signed-out");
      const token = await u.getIdTokenResult();
      setStatus(token.claims.admin === true ? "admin" : "not-admin");
    });
  }, []);

  const value: AdminAuth = {
    status,
    user,
    signIn: async (email, password) => {
      const cred = await signInWithEmailAndPassword(firebase().auth, email, password);
      // Pick up claims granted since the last sign-in.
      await cred.user.getIdToken(true);
    },
    signOut: () => signOut(firebase().auth),
    resetPassword: (email) => sendPasswordResetEmail(firebase().auth, email),
    idToken: async () => (firebase().auth.currentUser ? firebase().auth.currentUser!.getIdToken() : null),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait a few minutes or reset your password.";
  if (code.includes("network")) return "Can't reach the server. Check your connection.";
  return "Sign-in failed. Try again.";
}
