import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "www");
const files = [
  "index.html",
  "manifest.json",
  "sw.js",
  "logom.png",
  "icon-192.png",
  "icon-512.png",
  "fonts/nunito-latin-ext.woff2",
  "fonts/nunito-latin.woff2"
];

fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  const src = path.join(root, f);
  const dest = path.join(out, f);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing web asset: ${src}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
console.log(`Synced ${files.length} web files -> www/`);
