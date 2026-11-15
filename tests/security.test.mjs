import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const syncScript = fs.readFileSync(path.join(root, "scripts", "sync-web.mjs"), "utf8");
const manifestXml = fs.readFileSync(path.join(root, "android", "app", "src", "main", "AndroidManifest.xml"), "utf8");
const filePathsXml = fs.readFileSync(path.join(root, "android", "app", "src", "main", "res", "xml", "file_paths.xml"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];
const markup = html.slice(0, html.lastIndexOf("<script>"));

// Static security & offline integrity checks
assert.match(html, /http-equiv="Content-Security-Policy"/, "CSP meta tag must exist");
assert.match(html, /default-src 'self'/, "CSP must lock default-src to 'self'");
assert.match(html, /object-src 'none'/, "CSP must disable object-src");
assert.ok(!/fonts\.googleapis\.com/i.test(html), "External Google Fonts link must be removed");
assert.ok(!/<\s*(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*["']https?:/i.test(markup), "No external script/link URLs in HTML");
assert.ok(!/<[^>]+\bon[a-z]+\s*=/i.test(markup), "No inline on* event handlers in HTML markup");

for (const fontFile of ["fonts/nunito-latin-ext.woff2", "fonts/nunito-latin.woff2"]) {
  const full = path.join(root, fontFile);
  assert.ok(fs.existsSync(full) && fs.statSync(full).size > 1024, `Missing or invalid font: ${fontFile}`);
  assert.ok(sw.includes(fontFile), `sw.js ASSETS must precache ${fontFile}`);
  assert.ok(syncScript.includes(fontFile), `sync-web.mjs must copy ${fontFile}`);
}

assert.match(manifestXml, /android:allowBackup="false"/, "AndroidManifest must disable allowBackup");
assert.match(filePathsXml, /<cache-path\b/, "file_paths.xml must permit cache-path for share");
assert.ok(!/<external-path\b/i.test(filePathsXml), "file_paths.xml must not expose external-path");

function mkEl(id) {
  return {
    id, textContent: "", _innerHTML: "", value: "", hidden: false,
    className: "", children: [], dataset: {}, style: { setProperty() {}, removeProperty() {} },
    clientWidth: 320, clientHeight: 245, parentNode: true, complete: true, naturalWidth: 64,
    classList: {
      _s: new Set(["on"]),
      add(...a) { a.forEach(x => this._s.add(x)); },
      remove(...a) { a.forEach(x => this._s.delete(x)); },
      toggle(x, f) { f === undefined ? (this._s.has(x) ? this._s.delete(x) : this._s.add(x)) : (f ? this._s.add(x) : this._s.delete(x)); },
      contains(x) { return this._s.has(x); }
    },
    set innerHTML(v) { this._innerHTML = v; },
    get innerHTML() { return this._innerHTML; },
    querySelector() { return mkEl("sub"); },
    querySelectorAll() { return []; },
    insertAdjacentHTML() {},
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    getBoundingClientRect() { return { width: 320, height: 245, top: 0, left: 0 }; },
    appendChild() {},
    remove() {}
  };
}

const els = new Map();
const getEl = (s) => (els.has(s) ? els.get(s) : (els.set(s, mkEl(s)), els.get(s)));

const ctx = {
  Date, Math, Number, String, Object, Array, Set, JSON, Error, RegExp, Promise, console,
  encodeURIComponent, decodeURIComponent, escape, unescape,
  setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {},
  requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
  navigator: { vibrate: () => {} },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: {
    hidden: false, documentElement: mkEl("html"), body: mkEl("body"), readyState: "complete",
    querySelector: getEl, querySelectorAll: () => [], getElementById: id => getEl("#" + id),
    createElement: () => mkEl("c"), addEventListener: () => {}
  },
  window: { addEventListener: () => {}, scrollTo: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }), Capacitor: null },
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  AudioContext: null, webkitAudioContext: null
};
ctx.getElBySel = getEl;

vm.createContext(ctx);
vm.runInContext(script, ctx);

vm.runInContext(`
const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); };
const T = today();
const payload = JSON.parse('{"__proto__":{"polluted":true},"evilKey":"drop","goal":-50,"ml":0,"plant":"<script>","theme":"hack","fishFed":{"0":999},"days":{},"logs":{"' + T + '":[{"t":"<img src=x onerror=1>","ml":200,"hr":9}]}}');
importSafeState(payload);

assert(!("evilKey" in S), "Unknown keys should be stripped from imported state");
assert(S.goal === 1, "Goal must clamp to >= 1, got " + S.goal);
assert(S.ml === 50, "ml must clamp to >= 50, got " + S.ml);
assert(S.plant === "aycicegi", "Invalid plant should fall back to aycicegi");
assert(S.theme === "", "Invalid theme should fall back to auto");
assert(S.fishFed["0"] === 15, "fishFed must clamp to MAX_FISH_FED=15");
assert(!Object.prototype.polluted, "Prototype must not be polluted");

chart();
const logHtml = getElBySel("#todayLog").innerHTML;
assert(!logHtml.includes("<img"), "XSS payload in log time must NOT render raw HTML tag: " + logHtml);
assert(logHtml.includes("&lt;img"), "XSS payload must be HTML-escaped: " + logHtml);
`, ctx);

console.log("ALL SECURITY & SANITIZATION TESTS PASSED");
