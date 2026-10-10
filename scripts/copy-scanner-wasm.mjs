// Copies the QR decoder (zxing WebAssembly) from node_modules into public/vendor so the
// scanner loads it from our own site instead of a third-party CDN. Runs automatically
// before "npm run dev" and "npm run build".
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = path.join(root, "node_modules", "zxing-wasm");
// must match ZXING_WASM_VERSION, which the scanner uses to build the file name
const version = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8")).version;

const source = path.join(pkgDir, "dist", "reader", "zxing_reader.wasm");
const targetDir = path.join(root, "public", "vendor");
const target = path.join(targetDir, `zxing_reader-${version}.wasm`);

if (!existsSync(source)) {
  console.error(`QR decoder not found at ${source}. Run "npm install" first.`);
  process.exit(1);
}
mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
console.log(`QR decoder ready: public/vendor/zxing_reader-${version}.wasm`);
