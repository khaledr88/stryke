import { AppError } from "./errors";
import type { z } from "zod";

export interface Actor {
  uid: string;
  email: string | null;
}

export interface AuthContext {
  uid: string;
  token: Record<string, unknown>;
}

/** Admin access is granted only through the `admin` custom claim (set with scripts/grant-admin.mjs). */
export function requireAdmin(auth: AuthContext | null | undefined): Actor {
  if (!auth) throw new AppError("unauthenticated", "Sign in as an administrator.");
  if (auth.token.admin !== true) throw new AppError("permission-denied", "This account is not an administrator.");
  return { uid: auth.uid, email: (auth.token.email as string | undefined) ?? null };
}

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fields[key]) fields[key] = issue.message;
    }
    const first = result.error.issues[0];
    throw new AppError("invalid-argument", first ? first.message : "Invalid request.", { fields });
  }
  return result.data;
}
