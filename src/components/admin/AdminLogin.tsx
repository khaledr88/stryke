"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { authErrorMessage, useAdminAuth } from "@/lib/admin/auth";
import { Btn, ErrorBox, FieldShell, TextInput } from "./ui";

export function AdminLogin() {
  const { status, signIn, signOut, resetPassword, user } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "admin") router.replace("/admin");
  }, [status, router]);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <LogoMark className="pointer-events-none absolute -right-32 -bottom-32 h-auto w-[640px] opacity-[0.04]" sizes="640px" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark className="h-9 w-auto" sizes="60px" />
          <Wordmark className="h-5 w-auto" sizes="160px" />
        </div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em] text-white">Admin sign in</h1>
        <p className="mt-1 text-sm text-steel">Store administrators only. There is no public sign-up.</p>

        {status === "not-admin" && (
          <div className="mt-6">
            <ErrorBox>
              {user?.email} is signed in but isn’t an administrator. Ask the store owner to grant access, then sign in again.
              <div className="mt-3">
                <Btn size="sm" onClick={() => signOut()}>
                  Sign out
                </Btn>
              </div>
            </ErrorBox>
          </div>
        )}

        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setInfo(null);
            setBusy(true);
            try {
              await signIn(email.trim(), password);
            } catch (err) {
              setError(authErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FieldShell label="Email">
            <TextInput type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FieldShell>
          <FieldShell label="Password">
            <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FieldShell>
          {error && <ErrorBox>{error}</ErrorBox>}
          {info && <p className="text-sm text-success">{info}</p>}
          <Btn type="submit" variant="primary" className="w-full" loading={busy || status === "loading"}>
            <Lock className="size-4" /> Sign in
          </Btn>
          <button
            type="button"
            className="w-full text-center text-sm text-steel underline-offset-4 hover:text-white hover:underline"
            onClick={async () => {
              if (!email) return setError("Enter your email first.");
              try {
                await resetPassword(email.trim());
              } catch {
                // Don't reveal whether the account exists.
              }
              setInfo("If that email belongs to an account, a reset link is on its way.");
            }}
          >
            Forgot password?
          </button>
        </form>
      </div>
    </main>
  );
}
