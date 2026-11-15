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
  "icon-512.png"
];

fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing web asset: ${src}`);
  }
  fs.copyFileSync(src, path.join(out, f));
}
console.log(`Synced ${files.length} web files -> www/`);
