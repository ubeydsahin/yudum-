import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1];

function mkEl(id) {
  return {
    id, textContent: "", innerHTML: "", value: "", hidden: false,
    className: "", children: [], dataset: {}, style: { setProperty() {}, removeProperty() {} },
    complete: true, naturalWidth: 64,
    classList: {
      _s: new Set(),
      add(...a) { a.forEach(x => this._s.add(x)); },
      remove(...a) { a.forEach(x => this._s.delete(x)); },
      toggle(x, f) { f === undefined ? (this._s.has(x) ? this._s.delete(x) : this._s.add(x)) : (f ? this._s.add(x) : this._s.delete(x)); },
      contains(x) { return this._s.has(x); }
    },
    querySelector() { return mkEl(""); },
    querySelectorAll() { return []; },
    insertAdjacentHTML() { this.children.push(mkEl("child")); },
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    getBoundingClientRect() { return { width: 320, height: 300, top: 0, left: 0 }; },
    appendChild(c) { this.children.push(c); }
  };
}

const els = new Map();
const getEl = (sel) => {
  if (!els.has(sel)) els.set(sel, mkEl(sel));
  return els.get(sel);
};
const store = {};
let mockHr = 8;
let mockMin = 30;
const RealDate = Date;
class MockDate extends RealDate {
  constructor(...a) { super(...(a.length ? a : [2026, 10, 15, mockHr, mockMin, 0])); }
  getHours() { return mockHr; }
  getMinutes() { return mockMin; }
}
MockDate.now = () => new RealDate(2026, 10, 15, mockHr, mockMin, 0).getTime();

const ctx = {
  Date: MockDate,
  Math, Number, String, Object, Array, Set, JSON, Error, RegExp,
  encodeURIComponent, decodeURIComponent, escape, unescape, console,
  setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {}, requestAnimationFrame: () => 1,
  navigator: { vibrate: () => {} },
  localStorage: {
    getItem: k => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => delete store[k]
  },
  document: {
    documentElement: mkEl("html"),
    body: mkEl("body"),
    readyState: "complete",
    querySelector: getEl,
    querySelectorAll: () => [],
    getElementById: id => getEl("#" + id),
    createElement: () => mkEl("new"),
    addEventListener: () => {}
  },
  window: { addEventListener: () => {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }), Capacitor: null },
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  AudioContext: null, webkitAudioContext: null
};

ctx.setMockTime = (hr, min) => { mockHr = hr; mockMin = min; };
ctx.getElBySel = getEl;

vm.createContext(ctx);
vm.runInContext(script, ctx);

vm.runInContext(`
const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); };
const T = today();

// 1. Cup options
assert(JSON.stringify(cupOptions()) === JSON.stringify([100, 200, 330, 500, 750, 1000]), "cupOptions mismatch");

// 2. Morning window ready state
render();
const mb = getElBySel("#mornBanner");
assert(!mb.hidden && mb.textContent.includes("Günaydın Bonusu hazır"), "mornBanner ready text: " + mb.textContent);

// 3. 100 ml morning sip still receives +3 drops & +15 XP
S.cup = 100;
drink();
assert(dayMl(T) === 100, "100ml logged");
assert(S.drops === 3 && S.xp === 15, "100ml morn bonus got drops=" + S.drops + " xp=" + S.xp);
assert(S.morn[T] === 1, "S.morn[T] set");
assert(!mb.hidden && mb.className.includes("done") && mb.textContent.includes("alındı"), "mornBanner done text: " + mb.textContent);

// 4. Undo resets morning bonus cleanly
undo();
assert(dayMl(T) === 0 && S.drops === 0 && S.xp === 0 && !S.morn[T], "undo failed to reset morning bonus");
assert(!mb.hidden && !mb.className.includes("done"), "mornBanner reverted to ready");

// 5. Re-drink 750 ml in morning => 3 units (600ml) + 3 morn + 3 "am" quest = 9 drops, 15 + 15 = 30 XP
S.cup = 750;
drink();
assert(dayMl(T) === 750 && S.drops === 9 && S.xp === 30, "750ml morning got drops=" + S.drops + " xp=" + S.xp);
assert(getElBySel("#drinkLbl").textContent === "💧 Spor şişe içtim", "750ml label mismatch: " + getElBySel("#drinkLbl").textContent);

// 6. Second drink same morning does not double-award bonus
S.cup = 200;
drink();
assert(S.drops === 13 && S.xp === 35, "second drink drops/xp got " + S.drops + "/" + S.xp);

// 7. Afternoon window (12:30): no morning bonus on unclaimed fresh day, 1000ml test
setMockTime(12, 30);
delete S.dayMl[T]; delete S.days[T]; delete S.logs[T]; delete S.done[T]; S.tq = {}; S.am = {};
S.morn = { "2026-11-12": 1, "2026-11-13": 1, "2026-11-14": 1 };
S.drops = 0; S.xp = 0; S.cup = 1000;
render();
assert(mb.hidden === true, "mornBanner should be hidden in afternoon when unclaimed");
assert(getElBySel("#drinkLbl").textContent === "💧 Büyük şişe içtim", "1000ml label mismatch");
drink();
assert(S.drops === 8 && S.xp === 25 && !S.morn[T], "afternoon 1000ml drops/xp mismatch: " + S.drops + "/" + S.xp);

// 8. Erkenci Kuş badge unlocked with 3 days
rewards();
const badgesHtml = getElBySel("#badges").innerHTML;
assert(badgesHtml.includes("Erkenci Kuş"), "Erkenci Kuş badge missing");
assert(!badgesHtml.includes('class="bdg lk"><i aria-hidden="true">☀️</i><b>Erkenci Kuş'), "Erkenci Kuş should be unlocked at 3 days");
`, ctx);

console.log("ALL STAGE 1 RUNTIME ASSERTIONS PASSED");
