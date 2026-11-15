import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];

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
    insertAdjacentHTML() { this.children.push(mkEl("child")); },
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    getBoundingClientRect() { return { width: 320, height: 245, top: 0, left: 0 }; },
    appendChild(c) { c.parentNode = this; this.children.push(c); },
    remove() { this.parentNode = null; }
  };
}

const els = new Map();
const getEl = (sel) => {
  if (!els.has(sel)) els.set(sel, mkEl(sel));
  return els.get(sel);
};
const store = {};
let rafQueue = [];

const ctx = {
  Date, Math, Number, String, Object, Array, Set, JSON, Error, RegExp,
  encodeURIComponent, decodeURIComponent, escape, unescape, console,
  setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {},
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame: () => { rafQueue = []; },
  navigator: { vibrate: () => {} },
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => delete store[k] },
  document: {
    hidden: false,
    documentElement: mkEl("html"),
    body: mkEl("body"),
    readyState: "complete",
    querySelector: getEl,
    querySelectorAll: () => [],
    getElementById: id => getEl("#" + id),
    createElement: () => mkEl("crumb"),
    addEventListener: () => {}
  },
  window: { addEventListener: () => {}, scrollTo: () => {}, matchMedia: () => ({ matches: true, addEventListener: () => {} }), Capacitor: null },
  matchMedia: () => ({ matches: true, addEventListener: () => {} }),
  AudioContext: null, webkitAudioContext: null
};
ctx.getElBySel = getEl;
ctx.runFrames = (count, dtMs = 32) => {
  let t = 1000;
  for (let i = 0; i < count; i++) {
    t += dtMs;
    const fns = rafQueue.splice(0, rafQueue.length);
    fns.forEach(fn => fn(t));
  }
};

vm.createContext(ctx);
vm.runInContext(script, ctx);

vm.runInContext(`
const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); };

// Give user 3 sea creatures (24+ cups total history)
S.days = { "2026-11-10": 15, "2026-11-11": 15 };
S.dayMl = { "2026-11-10": 3000, "2026-11-11": 3000 };
aquarium();

assert(AQ.fish.length === 3, "Expected 3 fish, got " + AQ.fish.length);
const f0 = AQ.fish[0];
assert(f0.scaleX < 1 && f0.scaleY < 0.8 && f0.spdMul > 1.1, "Fish must start skinny and fast! sx=" + f0.scaleX + " sy=" + f0.scaleY + " spd=" + f0.spdMul);
const startX = f0.x;
runFrames(20, 32);
assert(Math.abs(f0.x - startX) > 5, "Fish did not swim during idle frames! start=" + startX + " now=" + f0.x);

// Force fish 0 onto right side facing RIGHT, then drop food behind it on LEFT
f0.x = 220;
f0.y = 140;
f0.facing = 1;
AQ.fish[1].x = 240; AQ.fish[1].facing = 1;
AQ.fish[2].x = 250; AQ.fish[2].facing = 1;

feedTank(getElBySel("#tank"), 18, 65);
assert(AQ.crumbs.length === 5, "Expected 5 dropped crumbs, got " + AQ.crumbs.length);
assert(f0.facing === -1, "Fish 0 failed to flip left (-1) immediately when food dropped to its left! facing=" + f0.facing);

// Simulate frames and verify fish steer toward food and consume ALL crumbs
runFrames(120, 32);
assert(AQ.crumbs.length === 0, "Expected all 5 crumbs eaten within 3.8s, remaining=" + AQ.crumbs.length);

// Verify eaten crumbs made fish gain weight and persist across re-render
const totalFed = Object.values(S.fishFed).reduce((a, b) => a + b, 0);
assert(totalFed === 5, "Expected total fishFed === 5 after 5 crumbs eaten, got " + totalFed);
const fedFish = AQ.fish.find(f => f.fed > 0);
assert(fedFish && fedFish.scaleY > 0.72 && fedFish.scaleX > 0.90 && fedFish.spdMul < 1.18, "Fed fish should gain weight and slow down!");
assert(fedFish.dirEl.style.transform.includes("scale("), "dirEl transform should include scale(sx,sy)");

// Progressive stage checks (Zayif -> Normal -> Tombul -> Sisman -> Balon)
const st0 = fishChub(0), st1 = fishChub(3), st2 = fishChub(6), st3 = fishChub(10), st4 = fishChub(15);
assert(st0.sy < st1.sy && st1.sy < st2.sy && st2.sy < st3.sy && st3.sy < st4.sy, "Fish belly scale must rise stage by stage");
assert(st0.spd > st1.spd && st1.spd > st2.spd && st2.spd > st3.spd && st3.spd > st4.spd, "Fish swim speed must drop stage by stage");
assert(st4.full === true && st4.spd <= 0.2 && st4.sy >= 1.8, "Final stage should bloat like a balloon and crawl slowly");

// Re-render aquarium and confirm persisted weight remains
const prevIdx = fedFish.idx, prevFed = fedFish.fed, prevSy = fedFish.scaleY;
aquarium();
assert(AQ.fish[prevIdx].fed === prevFed, "Persisted fed count should reload on aquarium()");
assert(AQ.fish[prevIdx].scaleY >= prevSy - 0.02, "Persisted scaleY should reload on aquarium()");

// Balloon state test: max out ALL fish to balloon, verify slow speed + NO eating
S.fishFed = { 0: MAX_FISH_FED, 1: MAX_FISH_FED, 2: MAX_FISH_FED };
aquarium();
assert(AQ.fish.every(f => f.fed === MAX_FISH_FED && f.spdMul <= 0.2 && f.scaleY >= 1.8), "All fish should load as slow balloons");
AQ.fish[0].x = 220; AQ.fish[0].facing = 1;
feedTank(getElBySel("#tank"), 18, 65);
assert(AQ.crumbs.length === 5, "Crumbs should still drop when tank is fed");
assert(AQ.fish[0].facing === 1, "Ballooned fish must NOT flip toward food!");
assert(pickCrumbForFish(AQ.fish[0], [0,0,0,0,0]) === -1, "Ballooned fish must refuse chasing crumbs");
runFrames(150, 32);
assert(AQ.crumbs.length === 5, "Ballooned fish must NOT eat any crumbs!");
assert(S.fishFed[0] === MAX_FISH_FED, "Ballooned fish fed count must stay capped at MAX_FISH_FED");
getElBySel("#aq").onclick({ target: { closest: s => s === "#feedTankBtn" ? {} : null } });
assert(getElBySel("#toast").textContent.includes("Balıklar balon gibi şişti"), "Balloon toast should NOT be overwritten: " + getElBySel("#toast").textContent);
`, ctx);

console.log("ALL STAGE 2 SKINNY -> BALLOON FISH TESTS PASSED");
