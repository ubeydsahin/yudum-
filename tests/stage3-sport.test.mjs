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
      _s: new Set(id === "#t0" ? ["tab", "on"] : id.startsWith("#t") ? ["tab"] : []),
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

const tabs = ["t0", "t1", "t2", "t3", "t4"].map(id => {
  const e = getEl("#" + id);
  e.id = id;
  return e;
});
const navBtns = ["0", "1", "4", "2", "3"].map((t, i) => {
  const b = mkEl("nav" + i);
  b.dataset = { t };
  if (t === "0") b.classList.add("on");
  return b;
});

const store = {};
const nativeCalls = [];
const mockPlugin = {
  async getStatus() { nativeCalls.push("getStatus"); return { available: true, sensorType: "counter", permission: "granted", running: false, enabled: false, steps: 0, day: "2026-11-15" }; },
  async start() { nativeCalls.push("start"); return { available: true, sensorType: "counter", permission: "granted", running: true, enabled: true, steps: 1200, day: "2026-11-15" }; },
  async stop() { nativeCalls.push("stop"); return { available: true, sensorType: "counter", permission: "granted", running: false, enabled: false, steps: 1200, day: "2026-11-15" }; },
  async addListener() { nativeCalls.push("addListener"); return { remove() {} }; }
};

const ctx = {
  Date, Math, Number, String, Object, Array, Set, JSON, Error, RegExp, Promise,
  encodeURIComponent, decodeURIComponent, escape, unescape, console,
  setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {},
  requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
  navigator: { vibrate: () => {} },
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => delete store[k] },
  document: {
    hidden: false,
    documentElement: mkEl("html"),
    body: mkEl("body"),
    readyState: "complete",
    querySelector: (s) => s === ".tab.on" ? (tabs.find(t => t.classList.contains("on")) || tabs[0]) : getEl(s),
    querySelectorAll: (s) => s === ".tab" ? tabs : s === "#nav button" ? navBtns : [],
    getElementById: id => getEl("#" + id),
    createElement: () => mkEl("crumb"),
    addEventListener: () => {}
  },
  window: {
    addEventListener: () => {},
    scrollTo: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    Capacitor: { isNativePlatform: () => true, Plugins: { StepCounter: mockPlugin } }
  },
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  AudioContext: null, webkitAudioContext: null
};
ctx.getElBySel = getEl;
ctx.tabs = tabs;
ctx.navBtns = navBtns;
ctx.nativeCalls = nativeCalls;

vm.createContext(ctx);
vm.runInContext(script, ctx);

await vm.runInContext(`(async () => {
const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); };
const T = today();

// 1. Tab switching to Sport (t4)
go(4);
assert(tabs[4].classList.contains("on"), "#t4 should be active on go(4)");
assert(!tabs[0].classList.contains("on"), "#t0 should be inactive on go(4)");
assert(navBtns[2].classList.contains("on") && navBtns[2].dataset.t === "4", "3rd nav button (Spor, data-t=4) should be active");
assert(getElBySel("#sportHero").innerHTML.includes("sport-ring"), "sportHero should render SVG ring");
assert(getElBySel("#sportTiers").innerHTML.includes("3.000") || getElBySel("#sportTiers").innerHTML.includes("3,000"), "sportTiers should render tiers");

// 2. sportWaterExtraMl formula bounds
assert(sportWaterExtraMl(0) === 0, "0 steps -> 0 extra ml");
assert(sportWaterExtraMl(1499) === 0, "1499 steps -> 0 extra ml");
assert(sportWaterExtraMl(1500) === 100, "1500 steps -> 100 extra ml");
assert(sportWaterExtraMl(3000) === 200, "3000 steps -> 200 extra ml");
assert(sportWaterExtraMl(5000) === 300, "5000 steps -> 300 extra ml");
assert(sportWaterExtraMl(20000) === 1000, "20000 steps capped at 1000 extra ml");

// 3. Manual steps & 3000 tier reward once-per-day
const dropsBefore = S.drops;
const xpBefore = S.xp;
addManualSteps(500);
addManualSteps(1500);
assert(daySteps(T) === 2000, "Expected 2000 steps, got " + daySteps(T));
assert(S.drops === dropsBefore, "No tier reward before 3000 steps");
assert(!getElBySel("#sportUndo").hidden, "#sportUndo should be visible after manual step add");

addManualSteps(3000);
assert(daySteps(T) === 5000, "Expected 5000 steps, got " + daySteps(T));
assert(S.drops === dropsBefore + 2, "Expected +2 drops at 3000 tier");
assert(S.xp === xpBefore + 15, "Expected +15 XP at 3000 tier");
assert(getElBySel("#sportAdvice").innerHTML.includes("+300 ml"), "sportAdvice should mention +300 ml extra water");

// 4. Undo manual steps & non-duplication on re-add
undoManualSteps();
assert(daySteps(T) === 2000, "Expected 2000 steps after undo, got " + daySteps(T));
assert(S.drops === dropsBefore + 2, "Earned 3000 tier drops should stay after undo");
addManualSteps(3000);
assert(daySteps(T) === 5000, "Expected 5000 steps after re-add");
assert(S.drops === dropsBefore + 2, "3000 tier drops must NOT duplicate on re-add");

// 5. paceInfo sport guidance
const goalMl = S.goal * S.ml;
const pNeed = paceInfo(goalMl, goalMl);
assert(pNeed.includes("adım attın") && pNeed.includes("+300 ml"), "paceInfo should prompt extra sport water when base goal met: " + pNeed);
const pDone = paceInfo(goalMl + 300, goalMl);
assert(pDone.includes("Günlük hedefine ulaştın"), "paceInfo should celebrate when base + sport goal met: " + pDone);

// 6. Native step merging (hw + manual) and day rollover tiers
applyNativeStepStatus({ available: true, sensorType: "counter", permission: "granted", running: true, enabled: true, steps: 2500, day: T });
assert(daySteps(T) === 7500, "Expected 2500 hw + 5000 manual = 7500, got " + daySteps(T));
assert(S.drops === dropsBefore + 2 + 4, "Expected 6000 tier +4 drops triggered");
assert(S.xp === xpBefore + 15 + 25, "Expected 6000 tier +25 XP triggered");

// Day rollover
const dropsPreRoll = S.drops;
applyNativeStepStatus({ available: true, sensorType: "counter", permission: "granted", running: true, enabled: true, steps: 6200, day: "2099-01-01" });
assert(daySteps("2099-01-01") === 6200, "Rollover day should have 6200 hw steps");
assert(S.drops === dropsPreRoll + 2 + 4, "Rollover day should award both 3000 and 6000 tiers (+6 drops)");

// 7. Sport badges in rewards()
rewards();
assert(getElBySel("#badges").innerHTML.includes("İlk Adım") && !getElBySel("#badges").innerHTML.includes('rz lock"><span class="e">👟'), "İlk Adım badge should unlock >= 3000 steps");
assert(getElBySel("#badges").innerHTML.includes('rz lock"><span class="e">🏃</span>Sportif Gün'), "Sportif Gün badge should still be locked < 10000 steps");
S.steps["2099-01-02"] = 10000;
rewards();
assert(!getElBySel("#badges").innerHTML.includes('rz lock"><span class="e">🏃</span>Sportif Gün'), "Sportif Gün badge should unlock at 10000 steps");

// 8. Native start/stop bridge invocation
await syncNativeSteps(true);
assert(nativeCalls.includes("start"), "syncNativeSteps(true) should invoke StepCounter.start()");
await syncNativeSteps("stop");
assert(nativeCalls.includes("stop"), "syncNativeSteps('stop') should invoke StepCounter.stop()");

console.log("ALL STAGE 3 UNIT & BRIDGE ASSERTIONS PASSED");
})();`, ctx);
