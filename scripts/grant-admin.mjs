/**
 * Grants (or revokes) STRYKE administrator access.
 *
 * Admin access is a Firebase Auth custom claim (`admin: true`). Only someone with
 * server credentials for the project can set it — there is no sign-up page.
 *
 *   1. Create the user: Firebase console → Authentication → Users → Add user
 *      (email + strong password). Or pass --create to create it here.
 *   2. Run, with credentials for the project:
 *        GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *          node scripts/grant-admin.mjs owner@example.com --project your-project-id
 *      or with `gcloud auth application-default login` already done.
 *   3. The user signs out and back in at /admin/login.
 *
 *   Revoke:  node scripts/grant-admin.mjs owner@example.com --revoke --project your-project-id
 *   Emulator: FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/grant-admin.mjs you@test.com --create --project demo-stryke
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const email = args.find((a) => a.includes("@"));
const projectId = args.includes("--project") ? args[args.indexOf("--project") + 1] : process.env.GCLOUD_PROJECT;
const revoke = args.includes("--revoke");
const create = args.includes("--create");

if (!email) {
  console.error("Usage: node scripts/grant-admin.mjs <email> [--project <id>] [--create] [--revoke]");
  process.exit(1);
}

initializeApp(projectId ? { projectId } : undefined);
const auth = getAuth();

let user;
try {
  user = await auth.getUserByEmail(email);
} catch (err) {
  if (err.code !== "auth/user-not-found" || !create) {
    console.error(err.code === "auth/user-not-found" ? `No user ${email}. Create it in the console or pass --create.` : err.message);
    process.exit(1);
  }
  const password = randomBytes(12).toString("base64url");
  user = await auth.createUser({ email, password, emailVerified: false });
  console.log(`Created ${email} with temporary password: ${password}`);
  console.log("Sign in and change it (use “Forgot password?” on /admin/login).");
}

const claims = { ...(user.customClaims ?? {}) };
if (revoke) delete claims.admin;
else claims.admin = true;
await auth.setCustomUserClaims(user.uid, claims);
// Force existing sessions to pick up the change.
await auth.revokeRefreshTokens(user.uid);
console.log(`${revoke ? "Revoked" : "Granted"} admin for ${email} (uid ${user.uid}). They must sign in again.`);
process.exit(0);
