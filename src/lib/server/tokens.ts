import "server-only";
import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from "jose";

/**
 * Verifies Firebase Auth ID tokens and App Check tokens with `jose`, following
 * Firebase's documented checks (signature against Google's public keys, issuer,
 * audience, expiry). We do this ourselves instead of using firebase-admin/auth,
 * whose token verifier fails to load on some serverless Node runtimes.
 */

const ID_TOKEN_KEYS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);
const APP_CHECK_KEYS = createRemoteJWKSet(new URL("https://firebaseappcheck.googleapis.com/v1/jwks"));

function projectId(): string {
  const id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  if (!id) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");
  return id;
}

export interface VerifiedIdToken extends JWTPayload {
  sub: string;
  email?: string;
  admin?: boolean;
}

export async function verifyIdToken(token: string): Promise<VerifiedIdToken> {
  const pid = projectId();

  // The Auth emulator issues unsigned tokens. Accept them only for demo projects
  // while the emulator is configured — never in a real deployment.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST && pid.startsWith("demo-")) {
    const payload = decodeJwt(token) as VerifiedIdToken;
    if (payload.aud !== pid || !payload.sub) throw new Error("Invalid emulator token");
    return payload;
  }

  const { payload } = await jwtVerify(token, ID_TOKEN_KEYS, {
    issuer: `https://securetoken.google.com/${pid}`,
    audience: pid,
    algorithms: ["RS256"],
  });
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Token has no subject");
  const authTime = (payload as { auth_time?: number }).auth_time;
  if (typeof authTime === "number" && authTime > Date.now() / 1000 + 60) throw new Error("Token auth_time is in the future");
  return payload as VerifiedIdToken;
}

export async function verifyAppCheckToken(token: string): Promise<void> {
  const projectNumber = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  if (!projectNumber) throw new Error("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is not set");
  await jwtVerify(token, APP_CHECK_KEYS, {
    issuer: `https://firebaseappcheck.googleapis.com/${projectNumber}`,
    audience: [`projects/${projectNumber}`, `projects/${projectId()}`],
    algorithms: ["RS256"],
  });
}
