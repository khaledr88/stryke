/**
 * Seeds STRYKE's starting data.
 *
 *   Emulators (safe default):
 *     FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/seed.ts --samples
 *
 *   A real project (taxonomy + default content only, never sample products):
 *     GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx tsx scripts/seed.ts --project <id> --production
 *
 * Flags:
 *   --samples     also add clearly-labelled sample products and sample delivery fees (emulator only)
 *   --overwrite   replace existing taxonomy/settings/homepage documents
 *   --production  required to write to a real (non-emulator) project
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { seedHomepage, seedSampleProducts, seedSettings, seedTaxonomy } from "./lib/seedData";

const args = new Set(process.argv.slice(2));
const projectArg = process.argv.find((a, i) => process.argv[i - 1] === "--project");
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = projectArg || process.env.GCLOUD_PROJECT || (emulator ? "demo-stryke" : undefined);

if (!emulator && !args.has("--production")) {
  console.error("Refusing to seed a real project without --production. Set FIRESTORE_EMULATOR_HOST to seed the emulator.");
  process.exit(1);
}
if (!emulator && args.has("--samples")) {
  console.error("Sample products are for the emulator only. Remove --samples.");
  process.exit(1);
}

initializeApp({ projectId });
const db = getFirestore();
const overwrite = args.has("--overwrite");

const taxonomy = await seedTaxonomy(db, { overwrite });
const settings = await seedSettings(db, { sampleDelivery: args.has("--samples"), overwrite });
const homepage = await seedHomepage(db, { overwrite });
console.log(`Taxonomy documents written: ${taxonomy}`);
console.log(`Store settings ${settings ? "written" : "kept (already exist)"}`);
console.log(`Homepage ${homepage ? "written" : "kept (already exists)"}`);
if (args.has("--samples")) {
  const n = await seedSampleProducts(db);
  console.log(`Sample products written: ${n}`);
}
console.log(`Done (${emulator ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}` : `project ${projectId}`}).`);
process.exit(0);
