// Bundles the functions (and the shared domain code in ../shared) into lib/index.js.
// firebase-admin / firebase-functions stay external so deploy installs them normally.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [path.join(here, "src/index.ts")],
  outfile: path.join(here, "lib/index.js"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  external: ["firebase-admin", "firebase-admin/*", "firebase-functions", "firebase-functions/*"],
  alias: { "@shared": path.join(here, "../shared") },
  logLevel: "info",
});
