/* Daily To Do: day plans, any kind of list, reusable templates. Runs entirely in the browser (no server). */
"use strict";

// ============ helpers ============
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const haptic = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* unsupported */ } };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => dayStr(new Date());
const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
const weekdayName = (s) => parseDay(s).toLocaleDateString("en-CA", { weekday: "long" });
const longDate = (s) => parseDay(s).toLocaleDateString("en-CA", { month: "long", day: "numeric", ...(parseDay(s).getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
const shortDate = (s) => parseDay(s).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
const monIndex = (s) => (parseDay(s).getDay() + 6) % 7; // Monday = 0
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const validDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && dayStr(parseDay(s)) === s;
function fmtTime(t) { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; }
function relDay(s) {
  const t = today();
  return s === t ? "Today" : s === addDays(t, 1) ? "Tomorrow" : s === addDays(t, -1) ? "Yesterday" : "";
}
const dayLabel = (s) => relDay(s) || shortDate(s);
function daysText(days) {
  if (!days.length) return "Any day";
  if (days.length === 7) return "Every day";
  if (days.join() === "0,1,2,3,4") return "Weekdays";
  if (days.join() === "5,6") return "Weekends";
  return days.map((d) => DAY_SHORT[d]).join(", ");
}

// ============ wallpapers ============
const WALL = {
  "tahoe-dawn": ["Tahoe Dawn", "#7b6a76"], "tahoe-day": ["Tahoe Day", "#5d8fa6"], "tahoe-dusk": ["Tahoe Dusk", "#4d566f"], "tahoe-night": ["Tahoe Night", "#141a24"],
  "tahoe-light": ["Tahoe Light", "#4c7ac8"], "tahoe-dark": ["Tahoe Dark", "#14246a"], "sequoia-light": ["Sequoia Light", "#c27a73"], "sequoia-dark": ["Sequoia Dark", "#2a4d8c"],
  "sequoia-forest": ["Sequoia Forest", "#4b4b33"], "sonoma-light": ["Sonoma Light", "#7f9a83"], "sonoma-dark": ["Sonoma Dark", "#3d5e7d"], "sonoma-horizon": ["Sonoma Horizon", "#6f7149"],
  "ventura-light": ["Ventura Light", "#d18640"], "ventura-dark": ["Ventura Dark", "#7b3b2c"], "monterey-light": ["Monterey Light", "#b569c7"], "monterey-dark": ["Monterey Dark", "#4a2c8a"],
  "big-sur-color-day": ["Big Sur Colour", "#8269a1"], "big-sur-color-night": ["Big Sur Night", "#5a3e78"], "big-sur": ["Big Sur", "#4c6c75"],
  "catalina-day": ["Catalina", "#504d61"], "catalina-night": ["Catalina Night", "#19263e"], "mojave-day": ["Mojave", "#6d5e5a"], "mojave-night": ["Mojave Night", "#242d44"],
  "high-sierra": ["High Sierra", "#9b8873"], "sierra": ["Sierra", "#725d63"], "el-capitan": ["El Capitan", "#71747d"], "yosemite": ["Yosemite", "#947c75"],
  "mavericks": ["Mavericks", "#347883"], "aurora": ["Aurora", "#614468"], "andromeda": ["Andromeda", "#2a4069"],
  "golden-gate-bridge": ["Golden Gate", "#8b6a50"], "golden-gate-light": ["Golden Gate Light", "#b3a79b"], "golden-gate-dark": ["Golden Gate Dark", "#2b3044"],
  "tahoe-rocks": ["Tahoe Rocks", "#7f6c5a"], "evening-reflections": ["Reflections", "#8a8c9a"], "horizon": ["Horizon", "#b7c4cf"], "flowing-rock": ["Flowing Rock", "#b0603a"],
  "clownfish": ["Clownfish", "#4e7a32"], "earth": ["Earth", "#22385a"], "golden-palace": ["Golden Palace", "#59673c"], "cirques": ["Cirques", "#7d746c"], "rocks": ["Pebbles", "#a59e93"],
};
const WALL_KEYS = Object.keys(WALL);
function autoWall() { // Today's picture follows the time of day
  const h = new Date().getHours();
  return h < 5 ? "tahoe-night" : h < 9 ? "tahoe-dawn" : h < 17 ? "tahoe-day" : h < 20 ? "tahoe-dusk" : "tahoe-night";
}
function wallKey(k) { return k === "auto" || !WALL[k] ? autoWall() : k; }
function wallStyle(k, small = true) {
  const key = wallKey(k);
  return `background-image:url(img/${key}${small ? "-sm" : ""}.webp);--wc:${WALL[key][1]}`;
}

const I = {
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>',
  starOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l-8 8 8 8"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l8 8-8 8"/></svg>',
  back: '<svg viewBox="0 0 12 21" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L2 10.5 10 19"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l6 6-6 6"/></svg>',
  down: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5l4.5 4.5L11.5 5"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6h14M5 12h14M5 18h9"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 01-4 4H4"/></svg>',
  x: '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 2l6 6M8 2L2 8"/></svg>',
  xcircle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm3.5 12.1l-1.4 1.4L12 13.4l-2.1 2.1-1.4-1.4 2.1-2.1-2.1-2.1 1.4-1.4 2.1 2.1 2.1-2.1 1.4 1.4-2.1 2.1z"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h16M4 12h16M4 16h16"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  home: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="4" width="8.5" height="8.5" rx="2.4"/><rect x="15.5" y="4" width="8.5" height="8.5" rx="2.4"/><rect x="4" y="15.5" width="8.5" height="8.5" rx="2.4"/><rect x="15.5" y="15.5" width="8.5" height="8.5" rx="2.4"/></svg>',
  tabDay: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="14" cy="14" r="5"/><path d="M14 2.5v3M14 22.5v3M2.5 14h3M22.5 14h3M5.9 5.9l2.1 2.1M20 20l2.1 2.1M5.9 22.1L8 20M20 8l2.1-2.1"/></svg>',
  tabTpl: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="18" height="21" rx="3.5"/><path d="M10 9.5h8M10 14h8M10 18.5h5"/></svg>',
  tabMe: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="14" cy="14" r="11"/><circle cx="14" cy="11.5" r="4"/><path d="M6.5 22c1.8-3 4.5-4.5 7.5-4.5s5.7 1.5 7.5 4.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.5l2.2 11h10.6l2-8H7"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>',
};

// ============ storage: profiles live in this browser ============
const KEY = "dtd.v2";
const Store = {
  meta() { try { return JSON.parse(localStorage.getItem(KEY + ".profiles")) || { active: null, list: [] }; } catch { return { active: null, list: [] }; } },
  setMeta(m) { try { localStorage.setItem(KEY + ".profiles", JSON.stringify(m)); } catch { /* full or blocked */ } },
  load(id) { try { return JSON.parse(localStorage.getItem(`${KEY}.p.${id}`)); } catch { return null; } },
  write(id, data) {
    try { localStorage.setItem(`${KEY}.p.${id}`, JSON.stringify(data)); return true; }
    catch { toast("Couldn't save: this browser's storage is full or turned off."); return false; }
  },
  remove(id) { try { localStorage.removeItem(`${KEY}.p.${id}`); } catch { /* ignore */ } },
};
let D = null;         // the active profile's data
let PID = null;       // the active profile's id
let saveTimer;
function save() {
  if (!D) return;
  D.updated = new Date().toISOString();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => Store.write(PID, D), 120);
}
window.addEventListener("pagehide", () => { if (D) { clearTimeout(saveTimer); Store.write(PID, D); } });

function blankData(name) {
  return { v: 2, profile: { name, created: new Date().toISOString(), theme: "auto", todayImage: "auto", showDone: true }, lists: [], items: [], templates: [], applied: [], updated: null };
}
function seed(d) {
  const L = (name, emoji, image, kind) => { const l = { id: uid(), name, emoji, image, kind, pos: d.lists.length + 1 }; d.lists.push(l); return l; };
  const groceries = L("Groceries", "🛒", "sonoma-light", "shopping");
  L("Weekend", "🏡", "big-sur-color-day", "tasks");
  L("Work", "💼", "sequoia-dark", "tasks");
  const add = (list, title, extra = {}) => d.items.push({ id: uid(), list: list.id, title, notes: "", time: "", starred: false, done: false, pos: d.items.length + 1, created: Date.now(), ...extra });
  [["Milk", 1], ["Eggs", 1], ["Bananas", 6], ["Bread", 1], ["Chicken breasts", 2], ["Coffee", 1]].forEach(([t, q]) => add(groceries, t, { qty: q, cat: guessCat(t) }));
  d.templates.push(
    { id: uid(), name: "Saturday in Toronto", emoji: "🏙️", image: "golden-gate-bridge", target: "day", days: [5],
      items: [{ title: "Squash", time: "10:00" }, { title: "Groceries" }, { title: "Laundry" }, { title: "Clean room" }] },
    { id: uid(), name: "Saturday in Barrie", emoji: "🌲", image: "sequoia-forest", target: "day", days: [5],
      items: [{ title: "Raking garden" }, { title: "Drying" }, { title: "Lunch" }, { title: "Dinner" }] },
    { id: uid(), name: "Weekly staples", emoji: "🥛", image: "sonoma-horizon", target: groceries.id, days: [],
      items: [{ title: "Milk", qty: 1 }, { title: "Eggs", qty: 1 }, { title: "Bread", qty: 1 }, { title: "Bananas", qty: 6 }, { title: "Yogurt", qty: 2 }] },
  );
}

// ============ shopping: aisles ============
const CATS = ["Produce", "Bakery", "Dairy & Eggs", "Meat & Fish", "Pantry", "Frozen", "Drinks", "Snacks", "Household", "Personal care", "Other"];
const CAT_WORDS = {
  "Produce": "apple banana lettuce tomato onion garlic potato carrot pepper avocado berr spinach lemon lime fruit veg cucumber broccoli mushroom grape orange celery kale herb cilantro parsley salad zucchini corn pear peach melon ginger",
  "Bakery": "bread bagel bun tortilla wrap croissant muffin pita roll baguette",
  "Dairy & Eggs": "milk cheese yogurt yoghurt butter egg cream",
  "Meat & Fish": "chicken beef pork salmon fish turkey bacon sausage ham shrimp steak tuna mince lamb",
  "Pantry": "rice pasta noodle flour sugar oil cereal beans sauce spice salt pepper coffee tea oats peanut honey jam vinegar soup stock lentil can ",
  "Frozen": "frozen ice cream pizza",
  "Drinks": "juice water soda pop beer wine sparkling kombucha",
  "Snacks": "chips crackers chocolate cookie nuts popcorn bar candy",
  "Household": "paper towel toilet detergent soap dish sponge trash garbage bag foil wrap battery bulb cleaner",
  "Personal care": "shampoo toothpaste deodorant razor floss lotion conditioner sunscreen vitamin",
};
function guessCat(title) {
  const t = " " + title.toLowerCase() + " ";
  for (const c of Object.keys(CAT_WORDS)) if (CAT_WORDS[c].split(" ").some((w) => w && t.includes(w.trim().length > 3 ? w.trim() : ` ${w.trim()}`))) return c;
  return "Other";
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function parseQty(text) { // "2 milk", "milk x2", "milk ×2"
  let m = text.match(/^(\d{1,3})\s*x?\s+(.+)$/i);
  if (m) return { title: cap(m[2].trim()), qty: +m[1] };
  m = text.match(/^(.+?)\s*[x×]\s*(\d{1,3})$/i);
  if (m) return { title: cap(m[1].trim()), qty: +m[2] };
  return { title: cap(text.trim()), qty: 1 };
}

// ============ model ============
const listById = (id) => D.lists.find((l) => l.id === id);
const itemById = (id) => D.items.find((i) => i.id === id);
const tplById = (id) => D.templates.find((t) => t.id === id);
const nextPos = () => D.items.reduce((m, i) => Math.max(m, i.pos || 0), 0) + 1;
function dayItems(day) { return D.items.filter((i) => i.list === "day" && i.day === day); }
function listItems(id) { return D.items.filter((i) => i.list === id); }
function dueOn(day) { return D.items.filter((i) => i.list !== "day" && i.due === day); }
function overdue(day) { return D.items.filter((i) => !i.done && ((i.list === "day" && i.day < day) || (i.list !== "day" && i.due && i.due < day))); }
function addItem(f) {
  const it = { id: uid(), notes: "", time: "", starred: false, done: false, pos: nextPos(), created: Date.now(), ...f };
  D.items.push(it); save(); return it;
}
function setDone(it, done) { it.done = done; it.doneAt = done ? Date.now() : null; save(); }
function removeItem(it) { D.items = D.items.filter((x) => x !== it); save(); }
function sourceName(it) { return it.list === "day" ? dayLabel(it.day) : (listById(it.list) || {}).name || ""; }
function where(it) { return it.list === "day" ? `day:${it.day}` : `list:${it.list}`; }

function applyTemplate(t, key) {
  const [kind, ref] = key.split(/:(.+)/);
  const have = new Set(D.items.filter((i) => where(i) === key && !i.done).map((i) => i.title.trim().toLowerCase()));
  const a = { id: uid(), tpl: t.id, name: t.name, key, at: Date.now() };
  D.applied.push(a);
  let added = 0;
  for (const x of t.items) {
    if (!x.title || have.has(x.title.trim().toLowerCase())) continue;
    const f = { title: x.title, notes: x.notes || "", time: x.time || "", from: a.id };
    if (kind === "day") Object.assign(f, { list: "day", day: ref });
    else Object.assign(f, { list: ref, qty: x.qty || 1, cat: x.cat || guessCat(x.title) });
    addItem(f); added++;
  }
  save();
  return { a, added };
}
function unapply(aid) {
  D.items = D.items.filter((i) => !(i.from === aid && !i.done));
  D.applied = D.applied.filter((a) => a.id !== aid);
  save();
}
function suggestionsFor(day) { // day templates for this weekday; once one is used, the alternatives stop being offered
  const ts = D.templates.filter((t) => t.target === "day" && t.days.includes(monIndex(day)));
  const used = D.applied.filter((a) => a.key === `day:${day}`).map((a) => a.tpl);
  return ts.some((t) => used.includes(t.id)) ? [] : ts;
}

// ============ toast ============
let toastTimer;
function toast(msg, action) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  el.hidden = false; el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  if (action) $("button", el).onclick = () => { el.hidden = true; action.fn(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 5000 : 2600);
}

// ============ springs: interruptible, velocity-aware, critically damped by default ============
function spring({ from, to, velocity = 0, response = 0.35, damping = 1, onUpdate, onDone }) {
  if (reduceMotion.matches) { onUpdate(to); onDone && onDone(); return { stop() {} }; }
  const k = Math.pow((2 * Math.PI) / response, 2), c = (4 * Math.PI * damping) / response;
  let x = from, v = velocity, last = performance.now(), raf, stopped = false;
  const step = (now) => {
    if (stopped) return;
    let dt = Math.min(0.064, (now - last) / 1000); last = now;
    const n = Math.ceil(dt / 0.004); dt /= n;
    for (let i = 0; i < n; i++) { const a = -k * (x - to) - c * v; v += a * dt; x += v * dt; }
    if (Math.abs(x - to) < 0.3 && Math.abs(v) < 5) { onUpdate(to); onDone && onDone(); return; }
    onUpdate(x); raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return { stop() { stopped = true; cancelAnimationFrame(raf); } };
}
const project = (v, d = 0.998) => ((v / 1000) * d) / (1 - d);
const rubber = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));
function tracker() {
  const pts = [];
  return {
    add(x, y) { const t = performance.now(); pts.push({ x, y, t }); while (pts.length > 2 && t - pts[0].t > 100) pts.shift(); },
    v() { if (pts.length < 2) return { x: 0, y: 0 }; const a = pts[0], b = pts[pts.length - 1], dt = Math.max(1, b.t - a.t) / 1000; return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }; },
  };
}
const isDesktop = () => matchMedia("(min-width: 980px)").matches;

// ============ state & routing ============
const S = { route: { name: "home" }, editing: false, newIds: new Set(), lastHash: "" };
const appEl = $("#app");
function parseHash() {
  const h = location.hash.replace(/^#\/?/, "").split("/");
  if (h[0] === "day") return { name: "day", day: validDay(h[1]) ? h[1] : today() };
  if (h[0] === "today") return { name: "day", day: today() };
  if (h[0] === "list" && h[1]) return { name: "list", id: h[1] };
  if (["starred", "planned", "templates", "settings"].includes(h[0])) return { name: h[0] };
  return { name: "home" };
}
const DEPTH = { home: 0, templates: 0, settings: 0, day: 1, list: 1, starred: 1, planned: 1 };
function go(hash, replace = false) {
  if (location.hash === hash) { render(""); return; }
  replace ? location.replace(hash) : (location.hash = hash);
}
window.addEventListener("hashchange", () => {
  const prev = S.route; S.route = parseHash(); S.editing = false;
  const anim = DEPTH[S.route.name] > DEPTH[prev.name] ? "push" : DEPTH[S.route.name] < DEPTH[prev.name] ? "pop" : "fade-in";
  closeAllSheets(); render(anim); window.scrollTo(0, 0);
});

function applyTheme() {
  const t = (D && D.profile.theme) || "auto";
  const dark = t === "dark" || (t === "auto" && darkMQ.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#000000" : "#f2f2f7"));
}
darkMQ.addEventListener("change", applyTheme);

// ============ render ============
function render(anim = "fade-in") {
  applyTheme();
  if (!D) { renderWelcome(); $("#sidebar").innerHTML = ""; return; }
  const r = S.route;
  if (r.name === "day") renderDay(r.day, anim);
  else if (r.name === "list") { const l = listById(r.id); l ? renderList(l, anim) : go("#/", true); }
  else if (r.name === "starred" || r.name === "planned") renderSmart(r.name, anim);
  else if (r.name === "templates") renderTemplates(anim);
  else if (r.name === "settings") renderSettings(anim);
  else renderHome(anim);
  renderSidebar();
}

function tabbar() {
  const n = S.route.name;
  const cur = n === "day" ? "day" : n === "templates" ? "templates" : n === "settings" ? "settings" : "home";
  const b = (id, href, icon, label) => `<button type="button" data-go="${href}" class="${cur === id ? "on" : ""}" aria-current="${cur === id ? "page" : "false"}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabbar">${b("home", "#/", I.home, "Lists")}${b("day", "#/today", I.tabDay, "Today")}${b("templates", "#/templates", I.tabTpl, "Templates")}${b("settings", "#/settings", I.tabMe, "Profile")}</nav>`;
}
function bindCommon() {
  $$("[data-go]").forEach((b) => b.addEventListener("click", (e) => {
    e.preventDefault();
    const href = b.dataset.go;
    if (href === "#/today") go(`#/day/${today()}`); else go(href);
  }));
  const nav = $(".navbar");
  if (nav) { const on = () => nav.classList.toggle("scrolled", window.scrollY > 24); window.onscroll = on; on(); }
  else window.onscroll = null;
}

function counts(items) { const open = items.filter((i) => !i.done).length; return { open, done: items.length - open, total: items.length }; }
function ringSvg(done, total) {
  const r = 22, C = 2 * Math.PI * r, f = total ? done / total : 0;
  return `<div class="ring" aria-label="${done} of ${total} done"><svg viewBox="0 0 54 54"><circle class="t" cx="27" cy="27" r="${r}"/><circle class="p" cx="27" cy="27" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - f)}"/></svg><span>${total ? Math.round(f * 100) + "%" : "–"}</span></div>`;
}
function initials(name) { return (name || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }

// ----- sidebar (desktop) -----
function renderSidebar() {
  const sb = $("#sidebar");
  const r = S.route, t = today();
  const on = (cond) => (cond ? "on" : "");
  const starred = D.items.filter((i) => i.starred && !i.done).length;
  const planned = plannedItems().length;
  sb.innerHTML = `
    <div class="sb-head"><span class="avatar wall" style="${wallStyle(D.profile.todayImage)}">${esc(initials(D.profile.name))}</span><div><b>${esc(D.profile.name)}</b><small>${esc(longDate(t))}</small></div></div>
    <button class="sb-item ${on(r.name === "home")}" data-go="#/"><span class="ic" style="background:#8e8e93">${I.home.replace('stroke-width="1.8"', 'stroke-width="2.4"')}</span>All Lists</button>
    <button class="sb-item ${on(r.name === "day" && r.day === t)}" data-go="#/today"><span class="ic" style="background:#ff9500">${I.sun}</span>Today<span class="n">${counts(dayItems(t)).open || ""}</span></button>
    <button class="sb-item ${on(r.name === "starred")}" data-go="#/starred"><span class="ic" style="background:#ffcc00">${I.starOn}</span>Starred<span class="n">${starred || ""}</span></button>
    <button class="sb-item ${on(r.name === "planned")}" data-go="#/planned"><span class="ic" style="background:#ff3b30">${I.cal}</span>Planned<span class="n">${planned || ""}</span></button>
    <div class="sb-sep"></div><div class="sb-label">My Lists</div>
    ${D.lists.map((l) => `<button class="sb-item ${on(r.name === "list" && r.id === l.id)}" data-go="#/list/${l.id}"><span class="ic wall" style="${wallStyle(l.image)}">${esc(l.emoji)}</span>${esc(l.name)}<span class="n">${counts(listItems(l.id)).open || ""}</span></button>`).join("")}
    <button class="sb-item sb-add" id="sbNew"><span class="ic" style="background:none;color:var(--accent)">${I.plus}</span>New List</button>
    <div class="sb-sep"></div>
    <button class="sb-item ${on(r.name === "templates")}" data-go="#/templates"><span class="ic" style="background:#5856d6">${I.tabTpl}</span>Templates<span class="n">${D.templates.length || ""}</span></button>
    <button class="sb-item ${on(r.name === "settings")}" data-go="#/settings"><span class="ic" style="background:#8e8e93">${I.tabMe}</span>Profile & Settings</button>`;
  $$("[data-go]", sb).forEach((b) => b.onclick = () => { const h = b.dataset.go; go(h === "#/today" ? `#/day/${t}` : h); });
  $("#sbNew").onclick = () => editList(null);
}

// ===== Home =====
function plannedItems() {
  const t = today();
  return D.items.filter((i) => !i.done && ((i.list === "day" && i.day >= t) || (i.list !== "day" && i.due))).sort((a, b) => ((a.day || a.due) > (b.day || b.due) ? 1 : -1));
}
function listCard(l) {
  const c = counts(listItems(l.id));
  const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
  return `<button type="button" class="icard wall" style="${wallStyle(l.image)}" data-go="#/list/${l.id}" aria-label="${esc(l.name)}, ${c.open} left">
    <span class="badge">${esc(l.emoji || "📋")}</span>${c.open ? `<span class="count">${c.open}</span>` : ""}
    <span class="txt"><div class="name">${esc(l.name)}</div><div class="meta">${l.kind === "shopping" ? (c.open ? `${plural(c.open, "item")} to get` : "All in the cart") : c.total ? `${c.open} to do · ${c.done} done` : "Empty"}</div>
    <div class="bar"><i style="width:${pct}%"></i></div></span></button>`;
}
function renderHome(anim) {
  const t = today(), h = new Date().getHours();
  const hi = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const ti = dayItems(t), c = counts(ti), open = ti.filter((i) => !i.done).sort(sortTasks).slice(0, 3);
  const sug = suggestionsFor(t);
  const starred = D.items.filter((i) => i.starred && !i.done).length;
  appEl.innerHTML = `<div class="page home ${anim}">
    <div class="greet"><div><div class="d">${esc(weekdayName(t))}, ${esc(longDate(t))}</div><h1>${hi}, ${esc(D.profile.name.split(" ")[0])}</h1></div>
      <button type="button" class="avatar wall" style="${wallStyle(D.profile.todayImage)}" data-go="#/settings" aria-label="Profile">${esc(initials(D.profile.name))}</button></div>
    <div class="hero big tap wall" style="${wallStyle(D.profile.todayImage, false)}" data-go="#/today" role="link" tabindex="0" aria-label="Open today">
      <div class="tl"><span class="gpill">${I.sun.replace("<svg", '<svg width="14" height="14"')} My Day</span></div>
      <div class="row-b"><div><h1>Today</h1><div class="sub">${c.total ? `${c.done} of ${c.total} done` : "Nothing planned yet"}</div></div>${ringSvg(c.done, c.total)}</div>
      ${open.length ? `<div class="peek">${open.map((i) => `<div><i></i>${esc(i.title)}${i.time ? ` · ${fmtTime(i.time)}` : ""}</div>`).join("")}</div>` : ""}
    </div>
    ${sug.length ? suggestCard(t, sug) : ""}
    <div class="tiles">
      <button type="button" class="tile" data-go="#/starred"><span class="ic" style="background:var(--orange)">${I.starOn}</span><span class="n">${starred}</span><span class="l">Starred</span></button>
      <button type="button" class="tile" data-go="#/planned"><span class="ic" style="background:var(--red)">${I.cal}</span><span class="n">${plannedItems().length}</span><span class="l">Planned</span></button>
    </div>
    <div class="sechead"><h2>My Lists</h2><button type="button" id="newList">New List</button></div>
    <div class="grid2 cards-in">${D.lists.map(listCard).join("")}
      <button type="button" class="icard add" id="newList2"><div>${I.plus}New List</div></button></div>
    ${D.templates.length ? `<div class="sechead"><h2>Templates</h2><button type="button" data-go="#/templates">See All</button></div>
      <div class="hscroll">${D.templates.map((tp) => `<button type="button" class="icard wall" style="${wallStyle(tp.image)}" data-tpl="${tp.id}">
        <span class="badge">${esc(tp.emoji || "📋")}</span><span class="txt"><div class="name">${esc(tp.name)}</div><div class="meta">${plural(tp.items.length, "item")} · ${tp.target === "day" ? esc(daysText(tp.days)) : esc((listById(tp.target) || {}).name || "List")}</div></span></button>`).join("")}</div>` : ""}
  </div>${tabbar()}`;
  bindCommon();
  $("#newList").onclick = $("#newList2").onclick = () => editList(null);
  $$("[data-tpl]").forEach((b) => b.onclick = () => useTemplateMenu(tplById(b.dataset.tpl)));
  bindSuggest(t);
  const hero = $(".hero.tap"); hero.onkeydown = (e) => { if (e.key === "Enter") go(`#/day/${t}`); };
}
function suggestCard(day, sug) {
  const q = sug.length > 1 ? `It's ${weekdayName(day)}. Which plan?` : `Your ${weekdayName(day)} template`;
  return `<div class="suggest fade-in"><p>${esc(q)}</p><div class="choices">${sug.map((s) =>
    `<button type="button" class="tcard wall" style="${wallStyle(s.image)}" data-apply="${s.id}"><span class="e">${esc(s.emoji || "")}</span><b>${esc(s.name)}</b><small>${plural(s.items.length, "item")} · tap to add</small></button>`).join("")}</div></div>`;
}
function bindSuggest(day) {
  $$("[data-apply]").forEach((b) => b.onclick = () => {
    const t = tplById(b.dataset.apply);
    const { a, added } = applyTemplate(t, `day:${day}`);
    haptic(12);
    D.items.filter((i) => i.from === a.id).forEach((i) => S.newIds.add(i.id));
    if (S.route.name === "day") render(""); else go(`#/day/${day}`);
    toast(added ? `Added ${plural(added, "task")} from ${t.name}` : "Those are already on the list", { label: "Undo", fn: () => { unapply(a.id); render(""); } });
  });
}

// ===== Day =====
function sortTasks(a, b) { return (b.starred - a.starred) || ((a.time || "99") > (b.time || "99") ? 1 : (a.time || "99") < (b.time || "99") ? -1 : 0) || (a.pos - b.pos); }
function renderDay(day, anim) {
  const t = today(), rel = relDay(day);
  const items = dayItems(day);
  const open = S.editing ? items.filter((i) => !i.done).sort((a, b) => a.pos - b.pos) : items.filter((i) => !i.done).sort(sortTasks);
  const done = items.filter((i) => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const due = dueOn(day);
  const late = day === t && !S.editing ? overdue(t) : [];
  const sug = day >= t && !S.editing ? suggestionsFor(day) : [];
  const applied = D.applied.filter((a) => a.key === `day:${day}`);
  const c = counts(items.concat(due));
  const showDone = D.profile.showDone !== false;
  const img = day === t ? D.profile.todayImage : (D.profile.dayImages || {})[monIndex(day)] || D.profile.todayImage;

  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar">
      <button type="button" class="navbtn back" data-go="#/">${I.back}Lists</button>
      <div class="mid">${esc(weekdayName(day))}</div>
      <div class="navgroup">
        ${items.length ? `<button type="button" class="navbtn ${S.editing ? "bold" : ""}" id="edit">${S.editing ? "Done" : "Edit"}</button>` : ""}
        <button type="button" class="circbtn" id="more" aria-label="More">${I.more}</button>
      </div>
    </div>
    <div class="hero wall" style="${wallStyle(img, false)}" id="hero">
      <div class="tl">${day !== t ? `<button type="button" class="gbtn wide" id="goToday">Today</button>` : `<span class="gpill">${I.sun.replace("<svg", '<svg width="14" height="14"')} My Day</span>`}</div>
      <div class="tr"><button type="button" class="gbtn" id="prev" aria-label="Previous day">${I.left}</button><button type="button" class="gbtn" id="next" aria-label="Next day">${I.right}</button></div>
      <div class="row-b"><label class="datepick"><h1>${esc(weekdayName(day))}</h1><div class="sub">${esc(longDate(day))}${rel ? ` <span class="gpill">${rel}</span>` : ""}</div>
        <input type="date" id="pick" value="${day}" aria-label="Pick a date"></label>${c.total ? ringSvg(c.done, c.total) : ""}</div>
    </div>
    ${applied.length ? `<div class="applied">${applied.map((a) => { const tp = tplById(a.tpl); return `<span class="tchip">${esc((tp && tp.emoji) || "📋")} ${esc(a.name)}<button type="button" class="x" data-unapply="${a.id}" aria-label="Remove ${esc(a.name)}">${I.x}</button></span>`; }).join("")}</div>` : ""}
    ${sug.length ? suggestCard(day, sug) : ""}
    ${late.length ? `<div class="sechead small"><h2>From earlier · ${late.length}</h2><button type="button" id="carry">Move to today</button></div>
      <div class="tasks">${late.map((i) => taskRow(i, { src: true })).join("")}</div>` : ""}
    ${(late.length || due.length) && open.length ? `<div class="sechead small"><h2>${esc(rel || weekdayName(day))}</h2></div>` : ""}
    <div class="tasks ${S.editing ? "editing" : ""}" data-list="open" style="${late.length || due.length ? "" : "margin-top:14px"}">${open.map((i) => taskRow(i)).join("")}</div>
    ${due.length && !S.editing ? `<div class="sechead small"><h2>Due from your lists · ${due.length}</h2></div><div class="tasks">${due.sort((a, b) => a.done - b.done).map((i) => taskRow(i, { src: true })).join("")}</div>` : ""}
    ${!open.length && !done.length && !sug.length && !late.length && !due.length ? `<div class="empty"><div class="big">☀️</div>Nothing planned${rel ? " " + rel.toLowerCase() : ""}.<br>Tap <b>Add a Task</b>, or add a template from the ⋯ menu.</div>`
      : !open.length && done.length && !due.some((i) => !i.done) ? `<div class="empty"><div class="big">🎉</div>All done${rel === "Today" ? " for today" : ""}.</div>` : ""}
    ${doneSection(done, showDone)}
  </div>
  ${S.editing ? "" : `<div class="addbar"><button type="button" class="addbtn" id="add">${I.plus} Add a Task</button></div>`}
  ${tabbar()}`;
  S.newIds.clear();
  bindCommon();
  const nav = (n) => go(`#/day/${addDays(day, n)}`);
  $("#prev").onclick = () => nav(-1);
  $("#next").onclick = () => nav(1);
  $("#goToday") && ($("#goToday").onclick = () => go(`#/day/${t}`));
  $("#pick").onchange = (e) => validDay(e.target.value) && go(`#/day/${e.target.value}`);
  $("#edit") && ($("#edit").onclick = () => { S.editing = !S.editing; render(""); });
  $("#more").onclick = () => dayMenu(day);
  $("#add") && ($("#add").onclick = () => openComposer({ kind: "day", day }));
  $("#carry") && ($("#carry").onclick = () => {
    const moved = overdue(t);
    moved.forEach((i) => { if (i.list === "day") i.day = t; else i.due = t; i.pos = nextPos(); S.newIds.add(i.id); });
    save(); render(""); toast(`Moved ${plural(moved.length, "task")} to today`);
  });
  $$("[data-unapply]").forEach((b) => b.onclick = () => askUnapply(b.dataset.unapply));
  bindSuggest(day); bindDone(); bindRows();
  swipeHero($("#hero"), (dir) => nav(dir));
}
function doneSection(done, showDone, label = "Completed") {
  if (!done.length) return "";
  return `<button type="button" class="chip-toggle ${showDone ? "" : "closed"}" id="toggleDone" aria-expanded="${showDone}">${I.down} ${label} <span style="color:var(--label-2);font-weight:400">${done.length}</span></button>
    ${showDone ? `<div class="tasks" data-list="done">${done.map((i) => taskRow(i)).join("")}</div>` : ""}`;
}
function bindDone() { $("#toggleDone") && ($("#toggleDone").onclick = () => { D.profile.showDone = D.profile.showDone === false; save(); render(""); }); }
function askUnapply(aid) {
  const a = D.applied.find((x) => x.id === aid); if (!a) return;
  const n = D.items.filter((i) => i.from === aid && !i.done).length;
  actionSheet({ title: `Remove “${a.name}”? ${n ? `Its ${plural(n, "unfinished item")} will be removed.` : ""} Ticked-off items stay.`,
    actions: [{ label: "Remove Template", danger: true, fn: () => { unapply(aid); render(""); } }] });
}
function dayMenu(day) {
  const items = dayItems(day), open = items.filter((i) => !i.done);
  const acts = [{ label: "Add From a Template…", fn: () => pickTemplate(`day:${day}`) }];
  if (items.length) acts.push({ label: "Save Day as Template…", fn: () => editTemplate({ id: null, name: `${weekdayName(day)} plan`, emoji: "📋", image: wallKey(D.profile.todayImage), target: "day", days: [monIndex(day)], items: items.map((i) => ({ title: i.title, time: i.time, notes: i.notes })) }) });
  if (open.length) acts.push({ label: `Move Unfinished to ${day === today() ? "Tomorrow" : "Next Day"}`, fn: () => {
    open.forEach((i) => { i.day = addDays(day, 1); }); save(); render(""); toast(`Moved ${plural(open.length, "task")} to ${dayLabel(addDays(day, 1))}`);
  } });
  acts.push({ label: "Change Background…", fn: () => pickImage(D.profile.todayImage, (k) => { D.profile.todayImage = k; save(); render(""); }, true) });
  if (items.some((i) => i.done)) acts.push({ label: "Clear Completed", danger: true, fn: () => { D.items = D.items.filter((i) => !(i.list === "day" && i.day === day && i.done)); save(); render(""); } });
  actionSheet({ title: `${weekdayName(day)}, ${longDate(day)}`, actions: acts });
}

// ===== a list (tasks or shopping) =====
function renderList(l, anim) {
  const items = listItems(l.id);
  const shop = l.kind === "shopping";
  const openI = items.filter((i) => !i.done), done = items.filter((i) => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const c = counts(items);
  const applied = D.applied.filter((a) => a.key === `list:${l.id}`).slice(-3);
  let body;
  if (shop && !S.editing) {
    const groups = {};
    openI.forEach((i) => { (groups[i.cat || "Other"] ||= []).push(i); });
    body = CATS.filter((k) => groups[k]).map((k) => `<div class="grouphead">${esc(k)} <span class="c">${groups[k].length}</span></div>
      <div class="tasks">${groups[k].sort((a, b) => a.pos - b.pos).map((i) => taskRow(i)).join("")}</div>`).join("");
  } else {
    const o = S.editing ? openI.sort((a, b) => a.pos - b.pos) : openI.sort((a, b) => (b.starred - a.starred) || (a.due || "9") .localeCompare(b.due || "9") || a.pos - b.pos);
    body = `<div class="tasks ${S.editing ? "editing" : ""}" data-list="open">${o.map((i) => taskRow(i)).join("")}</div>`;
  }
  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar">
      <button type="button" class="navbtn back" data-go="#/">${I.back}Lists</button>
      <div class="mid">${esc(l.name)}</div>
      <div class="navgroup">
        ${items.length ? `<button type="button" class="navbtn ${S.editing ? "bold" : ""}" id="edit">${S.editing ? "Done" : "Edit"}</button>` : ""}
        <button type="button" class="circbtn" id="more" aria-label="More">${I.more}</button>
      </div>
    </div>
    <div class="hero wall" style="${wallStyle(l.image, false)}">
      <div class="tl"><span class="gpill">${shop ? I.cart.replace("<svg", '<svg width="14" height="14"') + " Shopping" : I.list.replace("<svg", '<svg width="14" height="14"') + " List"}</span></div>
      <div class="tr"><button type="button" class="gbtn" id="editList" aria-label="Edit list">${I.photo}</button></div>
      <div class="row-b"><div><h1>${esc(l.emoji || "")} ${esc(l.name)}</h1><div class="sub">${shop ? (c.open ? `${plural(c.open, "item")} to get` : c.total ? "Everything's in the cart" : "Nothing on the list") : c.total ? `${c.open} to do · ${c.done} done` : "No tasks yet"}</div></div>${c.total ? ringSvg(c.done, c.total) : ""}</div>
    </div>
    ${applied.length ? `<div class="applied">${applied.map((a) => `<span class="tchip">📋 ${esc(a.name)}<button type="button" class="x" data-unapply="${a.id}" aria-label="Remove ${esc(a.name)}">${I.x}</button></span>`).join("")}</div>` : ""}
    <div style="margin-top:14px">${body}</div>
    ${!items.length ? `<div class="empty"><div class="big">${esc(l.emoji || "📝")}</div>${shop ? "Add what you need. Type “2 milk” to set a quantity; items are sorted by aisle." : "Nothing here yet."}</div>`
      : !openI.length ? `<div class="empty"><div class="big">${shop ? "🛒" : "🎉"}</div>${shop ? "Got everything." : "All done."}</div>` : ""}
    ${doneSection(done, D.profile.showDone !== false, shop ? "In the cart" : "Completed")}
  </div>
  ${S.editing ? "" : `<div class="addbar"><button type="button" class="addbtn" id="add">${I.plus} ${shop ? "Add an Item" : "Add a Task"}</button></div>`}
  ${tabbar()}`;
  S.newIds.clear();
  bindCommon(); bindDone(); bindRows();
  $("#edit") && ($("#edit").onclick = () => { S.editing = !S.editing; render(""); });
  $("#more").onclick = () => listMenu(l);
  $("#editList").onclick = () => editList(l);
  $("#add") && ($("#add").onclick = () => openComposer({ kind: "list", list: l }));
  $$("[data-unapply]").forEach((b) => b.onclick = () => askUnapply(b.dataset.unapply));
}
function listMenu(l) {
  const items = listItems(l.id), shop = l.kind === "shopping";
  const acts = [{ label: "Edit List…", fn: () => editList(l) }, { label: "Add From a Template…", fn: () => pickTemplate(`list:${l.id}`) }];
  if (items.length) acts.push({ label: "Save as Template…", fn: () => editTemplate({ id: null, name: `${l.name} template`, emoji: l.emoji, image: l.image, target: l.id, days: [], items: items.map((i) => ({ title: i.title, notes: i.notes, qty: i.qty, cat: i.cat })) }) });
  if (items.some((i) => i.done)) {
    acts.push({ label: shop ? "Put Everything Back on the List" : "Uncheck All", fn: () => { items.forEach((i) => setDone(i, false)); render(""); toast("Everything's unchecked, ready to reuse"); } });
    acts.push({ label: shop ? "Clear the Cart" : "Clear Completed", danger: true, fn: () => { const gone = items.filter((i) => i.done); D.items = D.items.filter((i) => !gone.includes(i)); save(); render(""); toast(`Removed ${plural(gone.length, "item")}`, { label: "Undo", fn: () => { D.items.push(...gone); save(); render(""); } }); } });
  }
  acts.push({ label: "Share as Text…", fn: () => shareList(l) });
  actionSheet({ title: l.name, actions: acts });
}
async function shareList(l) {
  const open = listItems(l.id).filter((i) => !i.done);
  const text = `${l.name}\n` + open.map((i) => `• ${i.title}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join("\n");
  try {
    if (navigator.share) await navigator.share({ title: l.name, text });
    else { await navigator.clipboard.writeText(text); toast("Copied the list"); }
  } catch { /* cancelled */ }
}

// ===== Starred / Planned =====
function renderSmart(kind, anim) {
  const t = today();
  const items = kind === "starred" ? D.items.filter((i) => i.starred && !i.done).sort((a, b) => (a.day || a.due || "9").localeCompare(b.day || b.due || "9"))
    : plannedItems();
  let body;
  if (kind === "planned") {
    const g = {};
    items.forEach((i) => { const d = i.day || i.due; (g[d] ||= []).push(i); });
    body = Object.keys(g).sort().map((d) => `<div class="grouphead">${esc(d < t ? "Overdue · " + shortDate(d) : relDay(d) || shortDate(d))} <span class="c">${g[d].length}</span></div>
      <div class="tasks">${g[d].map((i) => taskRow(i, { src: true, noDate: true })).join("")}</div>`).join("");
  } else body = `<div class="tasks">${items.map((i) => taskRow(i, { src: true })).join("")}</div>`;
  const img = kind === "starred" ? "ventura-light" : "monterey-light";
  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar"><button type="button" class="navbtn back" data-go="#/">${I.back}Lists</button><div class="mid">${kind === "starred" ? "Starred" : "Planned"}</div><span style="width:44px"></span></div>
    <div class="hero wall" style="${wallStyle(img, false)}"><div class="tl"><span class="gpill">${kind === "starred" ? I.starOn.replace("<svg", '<svg width="14" height="14"') : I.cal.replace("<svg", '<svg width="14" height="14"')} Smart list</span></div>
      <div class="row-b"><div><h1>${kind === "starred" ? "Starred" : "Planned"}</h1><div class="sub">${kind === "starred" ? "Everything you've starred, from every list" : "Everything with a date, soonest first"}</div></div></div></div>
    <div style="margin-top:14px">${body}</div>
    ${!items.length ? `<div class="empty"><div class="big">${kind === "starred" ? "⭐️" : "📅"}</div>${kind === "starred" ? "Tap the star on any task to see it here." : "Tasks on future days, and list items with a due date, show up here."}</div>` : ""}
  </div>
  <div class="addbar"><button type="button" class="addbtn" id="add">${I.plus} Add to Today</button></div>${tabbar()}`;
  bindCommon(); bindRows();
  $("#add").onclick = () => openComposer({ kind: "day", day: t, starred: kind === "starred" });
}

// ===== rows =====
function taskRow(it, opts = {}) {
  const meta = [];
  if (opts.src) {
    const late = (it.list === "day" ? it.day : it.due) < today() && !it.done;
    if (it.list === "day" && !opts.noDate) meta.push(`<span class="${late ? "late" : "src"}">${I.sun} ${esc(dayLabel(it.day))}</span>`);
    else if (it.list !== "day") meta.push(`<span class="${late ? "late" : "src"}">${esc((listById(it.list) || {}).emoji || "")} ${esc(sourceName(it))}${it.due && !opts.noDate ? ` · ${esc(dayLabel(it.due))}` : ""}</span>`);
  } else if (it.list !== "day" && it.due) {
    meta.push(`<span class="${it.due < today() && !it.done ? "late" : ""}">${I.cal} ${esc(dayLabel(it.due))}</span>`);
  }
  if (it.time) meta.push(`<span>${I.clock} ${fmtTime(it.time)}</span>`);
  if (it.notes) meta.push(`<span>${I.note} ${esc(it.notes.split("\n")[0].slice(0, 40))}</span>`);
  if (it.from) meta.push(`<span title="From a template">${I.repeat}</span>`);
  const editing = S.editing && !opts.src;
  const shop = it.list !== "day" && (listById(it.list) || {}).kind === "shopping";
  return `<div class="row-wrap ${S.newIds.has(it.id) ? "row-in" : ""}" data-id="${it.id}">
    <div class="behind"><span>${it.list === "day" ? "Tomorrow" : "Today"}</span><span>Delete</span></div>
    <div class="row ${it.done ? "done" : ""}">
      ${editing ? `<button type="button" class="minus" data-act="del" aria-label="Delete ${esc(it.title)}">−</button>` :
        `<button type="button" class="check" data-act="done" role="checkbox" aria-checked="${it.done}" aria-label="Done: ${esc(it.title)}">${I.check}</button>`}
      <div class="body" data-act="open"><div class="title">${esc(it.title)}</div>${meta.length ? `<div class="meta">${meta.join("")}</div>` : ""}</div>
      ${shop && it.qty > 1 ? `<span class="qty">×${it.qty}</span>` : ""}
      ${editing ? `<span class="handle" aria-label="Drag to reorder">${I.grip}</span>` :
        `<button type="button" class="star ${it.starred ? "on" : ""}" data-act="star" aria-pressed="${it.starred}" aria-label="Star">${it.starred ? I.starOn : I.star}</button>`}
    </div></div>`;
}
function bindRows() { $$(".row-wrap").forEach(bindRow); }
function bindRow(wrap) {
  const it = itemById(wrap.dataset.id), row = $(".row", wrap);
  if (!it) return;
  let swiped = false;
  row.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (!act || swiped) return;
    const a = act.dataset.act;
    if (a === "done") {
      haptic(10);
      row.classList.toggle("done", !it.done); act.setAttribute("aria-checked", String(!it.done));
      setDone(it, !it.done);
      setTimeout(() => render(""), 380);
    } else if (a === "star") { haptic(6); it.starred = !it.starred; save(); render(""); }
    else if (a === "open") editItem(it);
    else if (a === "del") deleteItem(it);
  });
  row.addEventListener("pointerdown", (e) => { if (e.target.closest(".body")) row.classList.add("pressed"); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => row.addEventListener(ev, () => row.classList.remove("pressed")));
  if (S.editing) { const h = $(".handle", row); h && bindReorder(wrap, h); return; }

  // swipe left = delete; swipe right = next day (day plans) or due today (lists)
  let start = null, x = 0, mode = null, sp = null, tr;
  const W = () => row.offsetWidth;
  const set = (v) => { x = v; row.style.transform = `translateX(${v}px)`; wrap.classList.toggle("right", v > 0); };
  row.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".check,.star")) return;
    sp && sp.stop();
    start = { x: e.clientX - x, y: e.clientY, x0: e.clientX }; mode = null; swiped = false; tr = tracker(); tr.add(e.clientX, e.clientY);
  });
  row.addEventListener("pointermove", (e) => {
    if (!start) return;
    tr.add(e.clientX, e.clientY);
    const dx = e.clientX - start.x0, dy = e.clientY - start.y;
    if (!mode) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      mode = Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
      if (mode === "swipe") { row.setPointerCapture(e.pointerId); row.classList.remove("pressed"); swiped = true; }
    }
    if (mode !== "swipe") return;
    let v = e.clientX - start.x; const lim = W() * 0.9;
    if (Math.abs(v) > lim) v = Math.sign(v) * (lim + rubber(Math.abs(v) - lim, W()));
    set(v);
  });
  const end = () => {
    if (!start) return;
    const was = mode; start = null;
    if (was !== "swipe") return;
    const vx = tr.v().x, land = x + project(vx, 0.99), w = W();
    if (land < -w * 0.45) { haptic(12); sp = spring({ from: x, to: -w - 20, velocity: vx, response: 0.25, onUpdate: set, onDone: () => deleteItem(it) }); }
    else if (land > w * 0.4) {
      haptic(12);
      sp = spring({ from: x, to: w + 20, velocity: vx, response: 0.25, onUpdate: set, onDone: () => {
        if (it.list === "day") moveItemDay(it, addDays(it.day < today() ? today() : it.day, 1));
        else { const old = it.due; it.due = today(); save(); render(""); toast("Due today", { label: "Undo", fn: () => { it.due = old; save(); render(""); } }); }
      } });
    } else sp = spring({ from: x, to: 0, velocity: vx, response: 0.3, damping: 0.85, onUpdate: set });
    setTimeout(() => { swiped = false; }, 50);
  };
  row.addEventListener("pointerup", end); row.addEventListener("pointercancel", end);
}
function bindReorder(wrap, handle) {
  const list = wrap.parentElement;
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault(); handle.setPointerCapture(e.pointerId);
    const wraps = $$(".row-wrap", list), from = wraps.indexOf(wrap);
    const rects = wraps.map((w) => w.getBoundingClientRect());
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 8;
    const step = rects[from].height + gap, y0 = e.clientY;
    let to = from;
    wrap.style.zIndex = 3; wrap.style.position = "relative"; $(".row", wrap).classList.add("dragging");
    wraps.forEach((w) => { if (w !== wrap) w.style.transition = "transform .25s cubic-bezier(.2,.9,.3,1)"; });
    haptic(8);
    const move = (ev) => {
      let dy = ev.clientY - y0;
      const minDy = rects[0].top - rects[from].top, maxDy = rects[rects.length - 1].top - rects[from].top;
      if (dy < minDy) dy = minDy - rubber(minDy - dy, 200); if (dy > maxDy) dy = maxDy + rubber(dy - maxDy, 200);
      wrap.style.transform = `translateY(${dy}px) scale(1.02)`;
      const mid = rects[from].top + rects[from].height / 2 + dy;
      to = from;
      rects.forEach((r, i) => { if (i < from && mid < r.top + r.height / 2) to = Math.min(to, i); if (i > from && mid > r.top + r.height / 2) to = Math.max(to, i); });
      wraps.forEach((w, i) => { if (w === wrap) return; const s = from < to && i > from && i <= to ? -step : from > to && i < from && i >= to ? step : 0; w.style.transform = s ? `translateY(${s}px)` : ""; });
    };
    const up = () => {
      handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
      const ids = wraps.map((w) => w.dataset.id); ids.splice(to, 0, ids.splice(from, 1)[0]);
      const base = Math.min(...ids.map((id) => itemById(id).pos));
      ids.forEach((id, i) => { itemById(id).pos = base + i; });
      save(); render("");
    };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
  });
}
function swipeHero(el, fn) {
  let sx = null, sy = 0;
  el.addEventListener("touchstart", (e) => { if (e.target.closest("button")) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); fn(dx < 0 ? 1 : -1); }
  });
}
function deleteItem(it) {
  const idx = D.items.indexOf(it);
  removeItem(it); render("");
  toast(`Deleted “${it.title.slice(0, 28)}”`, { label: "Undo", fn: () => { D.items.splice(idx, 0, it); save(); S.newIds.add(it.id); render(""); } });
}
function moveItemDay(it, day) {
  const old = it.day; it.day = day; it.pos = nextPos(); save(); render("");
  toast(`Moved to ${dayLabel(day)}`, { label: "Undo", fn: () => { it.day = old; save(); render(""); } });
}

// ===== composer =====
function openComposer(ctx) {
  const shop = ctx.kind === "list" && ctx.list.kind === "shopping";
  const wrap = document.createElement("div");
  let starred = !!ctx.starred, time = "", due = "";
  const ph = shop ? "Add an item, e.g. 2 milk" : "Add a Task";
  wrap.innerHTML = `<div class="composer-scrim"></div><div class="composer" role="dialog" aria-label="${esc(ph)}">
    <div class="line"><span class="ring0"></span><input id="newTitle" placeholder="${esc(ph)}" enterkeyhint="done" maxlength="200" autocomplete="off"></div>
    <div class="tools">
      ${shop ? "" : `<button type="button" class="tool ${starred ? "star-on" : ""}" id="cStar" aria-pressed="${starred}" aria-label="Star">${starred ? I.starOn : I.star}</button>`}
      ${ctx.kind === "day" ? `<label class="tool" id="cTimeL">${I.clock}<span id="cTimeT">Time</span><input type="time" id="cTime" aria-label="Time"></label>` : ""}
      ${ctx.kind === "list" && !shop ? `<label class="tool" id="cDueL">${I.cal}<span id="cDueT">Due</span><input type="date" id="cDue" aria-label="Due date"></label>` : ""}
      <button type="button" class="sendbtn" id="cSend" disabled aria-label="Add">${I.up}</button>
    </div></div>`;
  document.body.appendChild(wrap);
  const inp = $("#newTitle", wrap);
  inp.focus(); // same tap as the button, so iOS opens the keyboard
  const close = () => wrap.remove();
  $(".composer-scrim", wrap).onclick = close;
  inp.oninput = () => { $("#cSend", wrap).disabled = !inp.value.trim(); };
  const starBtn = $("#cStar", wrap);
  starBtn && (starBtn.onclick = () => { starred = !starred; starBtn.classList.toggle("star-on", starred); starBtn.innerHTML = starred ? I.starOn : I.star; starBtn.setAttribute("aria-pressed", starred); inp.focus(); });
  $("#cTime", wrap) && ($("#cTime", wrap).onchange = (e) => { time = e.target.value; $("#cTimeT", wrap).textContent = time ? fmtTime(time) : "Time"; $("#cTimeL", wrap).classList.toggle("on", !!time); });
  $("#cDue", wrap) && ($("#cDue", wrap).onchange = (e) => { due = e.target.value; $("#cDueT", wrap).textContent = due ? dayLabel(due) : "Due"; $("#cDueL", wrap).classList.toggle("on", !!due); });
  const send = () => {
    const raw = inp.value.trim();
    if (!raw) { close(); return; }
    let it;
    if (ctx.kind === "day") it = addItem({ list: "day", day: ctx.day, title: raw, starred, time });
    else if (shop) {
      const p = parseQty(raw);
      const dup = listItems(ctx.list.id).find((i) => i.title.toLowerCase() === p.title.toLowerCase());
      if (dup) { // already on the list: bring it back (or update the quantity) instead of adding a duplicate
        const wasDone = dup.done;
        if (wasDone) { setDone(dup, false); dup.qty = p.qty; } else if (p.qty > 1) dup.qty = p.qty;
        save(); it = dup; toast(wasDone ? `${dup.title} is back on the list` : `${dup.title} is already on the list`);
      } else it = addItem({ list: ctx.list.id, title: p.title, qty: p.qty, cat: guessCat(p.title) });
    } else it = addItem({ list: ctx.list.id, title: raw, starred, due: due || undefined });
    S.newIds.add(it.id);
    inp.value = ""; $("#cSend", wrap).disabled = true;
    render(""); haptic(6); inp.focus();
  };
  $("#cSend", wrap).onclick = send;
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } if (e.key === "Escape") close(); });
}

// ===== edit an item =====
function editItem(it) {
  const l = it.list !== "day" ? listById(it.list) : null;
  const shop = l && l.kind === "shopping";
  const listOpts = `<option value="day" ${it.list === "day" ? "selected" : ""}>☀️ Day plan</option>` + D.lists.map((x) => `<option value="${x.id}" ${x.id === it.list ? "selected" : ""}>${esc(x.emoji)} ${esc(x.name)}</option>`).join("");
  const sheet = openSheet({
    title: shop ? "Item" : "Details", left: { label: "Cancel" },
    right: { label: "Done", bold: true, fn: () => {
      const title = $("#eTitle").value.trim();
      if (!title) { toast("Give it a name."); return false; }
      const list = $("#eList").value, date = $("#eDate").value;
      it.title = title; it.notes = $("#eNotes").value; it.starred = $("#eStar").checked;
      it.time = $("#eTime") ? $("#eTime").value : it.time;
      if (shop) { it.qty = Math.max(1, Math.min(999, parseInt($("#eQty").value, 10) || 1)); it.cat = $("#eCat").value; }
      if (list === "day") { const was = it.list; it.list = "day"; it.day = validDay(date) ? date : (it.day || it.due || today()); delete it.due; if (was !== "day") it.pos = nextPos(); }
      else { if (it.list !== list) { it.pos = nextPos(); if ((listById(list) || {}).kind === "shopping") { it.qty = it.qty || 1; it.cat = it.cat || guessCat(it.title); } } it.list = list; it.due = validDay(date) ? date : undefined; delete it.day; }
      save(); render("");
    } },
    html: `<div class="group">
        <div class="cell"><input id="eTitle" class="bigtitle" value="${esc(it.title)}" maxlength="200" aria-label="Name"></div>
        <div class="cell"><textarea id="eNotes" placeholder="Notes" maxlength="2000" aria-label="Notes">${esc(it.notes)}</textarea></div>
      </div>
      ${shop ? `<div class="group">
        <label class="cell"><span class="icon-sq" style="--ic:var(--accent)">#</span><span class="grow">Quantity</span><input type="number" id="eQty" min="1" max="999" value="${it.qty || 1}" inputmode="numeric"></label>
        <label class="cell"><span class="icon-sq" style="--ic:#34c759">${I.cart}</span><span class="grow">Aisle</span><select id="eCat" class="pill">${CATS.map((c) => `<option ${c === (it.cat || "Other") ? "selected" : ""}>${c}</option>`).join("")}</select></label></div>` : ""}
      <div class="group">
        <label class="cell"><span class="icon-sq" style="--ic:#5856d6">${I.list}</span><span class="grow">List</span><select id="eList" class="pill">${listOpts}</select></label>
        <label class="cell"><span class="icon-sq" style="--ic:#ff3b30">${I.cal}</span><span class="grow" id="eDateL">${it.list === "day" ? "Day" : "Due"}</span><input type="date" id="eDate" value="${it.list === "day" ? it.day : it.due || ""}"></label>
        ${shop ? "" : `<label class="cell"><span class="icon-sq" style="--ic:#007aff">${I.clock}</span><span class="grow">Time</span><input type="time" id="eTime" value="${esc(it.time)}"></label>`}
        <label class="cell"><span class="icon-sq" style="--ic:#ff9500">${I.starOn}</span><span class="grow">Starred</span><span class="switch"><input type="checkbox" id="eStar" ${it.starred ? "checked" : ""}><span></span></span></label>
      </div>
      <div class="group">
        ${it.list === "day" ? `<button type="button" class="cell" id="eNext"><span class="grow blue">Move to Next Day</span></button>` : ""}
        <button type="button" class="cell" id="eDone"><span class="grow blue">${it.done ? (shop ? "Put Back on the List" : "Mark as Not Done") : shop ? "Got It" : "Mark as Done"}</span></button>
        <button type="button" class="cell" id="eDup"><span class="grow blue">Duplicate</span></button>
        <button type="button" class="cell danger" id="eDel"><span class="grow">Delete</span></button>
      </div>`,
  });
  $("#eList").onchange = (e) => { $("#eDateL").textContent = e.target.value === "day" ? "Day" : "Due"; if (e.target.value === "day" && !$("#eDate").value) $("#eDate").value = today(); };
  $("#eDel").onclick = () => { sheet.close(); deleteItem(it); };
  $("#eDone").onclick = () => { sheet.close(); setDone(it, !it.done); render(""); };
  $("#eDup").onclick = () => { sheet.close(); const c = addItem({ ...it, id: uid(), done: false, doneAt: null, from: undefined }); S.newIds.add(c.id); render(""); };
  $("#eNext") && ($("#eNext").onclick = () => { sheet.close(); moveItemDay(it, addDays(it.day, 1)); });
}

// ===== lists: create / edit =====
const EMOJIS = ["📋", "✅", "🛒", "🥦", "🏠", "🏡", "🏙️", "🌲", "💼", "🏋️", "🎾", "🧹", "🍳", "📚", "💻", "✈️", "🎁", "🎉", "💊", "🐶", "🚗", "💡", "🎬", "❤️"];
function editList(l) {
  const isNew = !l;
  const d = l ? { ...l } : { name: "", emoji: "📋", image: WALL_KEYS[(D.lists.length * 7 + 3) % WALL_KEYS.length], kind: "tasks" };
  const sheet = openSheet({
    title: isNew ? "New List" : "Edit List", left: { label: "Cancel" },
    right: { label: isNew ? "Create" : "Save", bold: true, fn: () => {
      d.name = $("#lName").value.trim();
      if (!d.name) { toast("Give the list a name."); $("#lName").focus(); return false; }
      if (isNew) { const nl = { id: uid(), pos: D.lists.length + 1, ...d }; D.lists.push(nl); save(); go(`#/list/${nl.id}`); }
      else { Object.assign(l, d); if (d.kind === "shopping") listItems(l.id).forEach((i) => { i.qty = i.qty || 1; i.cat = i.cat || guessCat(i.title); }); save(); render(""); }
    } },
    html: `<div class="preview wall" id="lPrev" style="${wallStyle(d.image, false)}"><b id="lPrevT">${esc(d.emoji)} ${esc(d.name || "New List")}</b>
        <button type="button" class="gbtn" id="lImg" aria-label="Change picture">${I.photo}</button></div>
      <div class="group"><div class="cell"><input id="lName" class="bigtitle" value="${esc(d.name)}" placeholder="List name, e.g. Groceries" maxlength="60" aria-label="List name"></div>
        <div class="emojis">${EMOJIS.map((e) => `<button type="button" data-emoji="${e}" class="${e === d.emoji ? "on" : ""}">${e}</button>`).join("")}</div></div>
      <div class="sechead small"><h2>Kind of list</h2></div>
      <div class="group"><div class="cell" style="padding:10px 12px"><div class="seg" style="flex:1"><button type="button" data-kind="tasks" class="${d.kind === "tasks" ? "on" : ""}">✅ To-dos</button><button type="button" data-kind="shopping" class="${d.kind === "shopping" ? "on" : ""}">🛒 Shopping</button></div></div></div>
      <p class="foot" id="kindNote"></p>
      <div class="group" style="margin-top:22px"><button type="button" class="cell" id="lPick"><span class="icon-sq" style="--ic:#5856d6">${I.photo}</span><span class="grow">Picture</span><span class="val" id="lImgName">${esc(WALL[wallKey(d.image)][0])}</span>${I.chev}</button></div>
      ${isNew ? "" : `<div class="group" style="margin-top:22px"><button type="button" class="cell danger" id="lDel"><span class="grow">Delete List</span></button></div>`}`,
  });
  const root = sheet.el;
  const note = () => { $("#kindNote").textContent = d.kind === "shopping" ? "Quantities, items sorted by aisle, and checked items move to the cart so the list can be reused." : "Tasks with optional due dates, stars and notes."; };
  note();
  const upd = () => { $("#lPrevT").textContent = `${d.emoji} ${$("#lName").value.trim() || "New List"}`; };
  $("#lName").oninput = upd;
  $$("[data-emoji]", root).forEach((b) => b.onclick = () => { d.emoji = b.dataset.emoji; $$("[data-emoji]", root).forEach((x) => x.classList.toggle("on", x === b)); upd(); });
  $$("[data-kind]", root).forEach((b) => b.onclick = () => { d.kind = b.dataset.kind; $$("[data-kind]", root).forEach((x) => x.classList.toggle("on", x === b)); note(); });
  $("#lImg").onclick = $("#lPick").onclick = () => pickImage(d.image, (k) => { d.image = k; $("#lPrev").setAttribute("style", wallStyle(k, false)); $("#lImgName").textContent = WALL[k][0]; });
  $("#lDel") && ($("#lDel").onclick = () => {
    const n = listItems(l.id).length;
    actionSheet({ title: `Delete “${l.name}”${n ? ` and its ${plural(n, "item")}` : ""}? This can't be undone.`, actions: [{ label: "Delete List", danger: true, fn: () => {
      D.items = D.items.filter((i) => i.list !== l.id); D.lists = D.lists.filter((x) => x !== l);
      D.templates.forEach((t) => { if (t.target === l.id) t.target = "day"; });
      save(); sheet.close(); go("#/");
    } }] });
  });
  if (isNew) setTimeout(() => $("#lName").focus(), reduceMotion.matches ? 0 : 320);
}

// ===== image picker =====
function pickImage(current, onPick, allowAuto = false) {
  const sheet = openSheet({
    title: "Choose a Picture", right: { label: "Done", bold: true },
    html: `<div class="pickgrid">${allowAuto ? `<button type="button" class="auto ${current === "auto" ? "on" : ""}" data-k="auto">Changes through the day</button>` : ""}
      ${WALL_KEYS.map((k) => `<button type="button" class="wall ${k === current ? "on" : ""}" data-k="${k}" style="${wallStyle(k)}" aria-label="${esc(WALL[k][0])}" title="${esc(WALL[k][0])}"></button>`).join("")}</div>
      <p class="foot">macOS wallpapers.</p>`,
  });
  $$("[data-k]", sheet.el).forEach((b) => b.onclick = () => {
    $$("[data-k]", sheet.el).forEach((x) => x.classList.toggle("on", x === b));
    haptic(6); onPick(b.dataset.k); setTimeout(() => sheet.close(), 180);
  });
}

// ===== Templates =====
function renderTemplates(anim) {
  const ts = D.templates;
  appEl.innerHTML = `<div class="page home ${anim}">
    <div class="navbar"><span style="width:44px"></span><div class="mid">Templates</div><button type="button" class="circbtn" id="newTpl" aria-label="New template">${I.plus}</button></div>
    <div class="largetitle"><h1>Templates</h1><div class="sub">Reusable lists for routines: a Toronto Saturday, a Barrie Saturday, weekly groceries.</div></div>
    ${ts.length ? `<div class="grid2 cards-in">${ts.map((t) => `<button type="button" class="icard wall" style="${wallStyle(t.image)}" data-tpl="${t.id}">
        <span class="badge">${esc(t.emoji || "📋")}</span><span class="count">${t.items.length}</span>
        <span class="txt"><div class="name">${esc(t.name)}</div><div class="meta">${t.target === "day" ? `☀️ ${esc(daysText(t.days))}` : `${esc((listById(t.target) || {}).emoji || "")} ${esc((listById(t.target) || {}).name || "List")}`}</div></span></button>`).join("")}
        <button type="button" class="icard add" id="newTpl2"><div>${I.plus}New Template</div></button></div>`
      : `<div class="empty"><div class="big">🗂️</div>No templates yet.</div><div class="btnrow"><button type="button" class="btn secondary" id="newTpl2">New Template</button></div>`}
    <p class="foot" style="margin-top:16px">Day templates are offered on the days you pick. When two share a day, you choose which one to add, and nothing is added until you tap it. List templates (like weekly staples) fill a list in one tap.</p>
  </div>${tabbar()}`;
  bindCommon();
  $("#newTpl").onclick = $("#newTpl2").onclick = () => editTemplate({ id: null, name: "", emoji: "📋", image: "sonoma-light", target: "day", days: [], items: [] });
  $$("[data-tpl]").forEach((b) => b.onclick = () => useTemplateMenu(tplById(b.dataset.tpl)));
}
function useTemplateMenu(t) {
  const acts = [];
  if (t.target === "day") {
    acts.push({ label: "Add to Today", fn: () => doApply(t, `day:${today()}`) });
    acts.push({ label: "Add to Tomorrow", fn: () => doApply(t, `day:${addDays(today(), 1)}`) });
  } else if (listById(t.target)) acts.push({ label: `Add to ${listById(t.target).name}`, fn: () => doApply(t, `list:${t.target}`) });
  acts.push({ label: "Edit Template…", fn: () => editTemplate(t) });
  actionSheet({ title: `${t.emoji || ""} ${t.name} · ${plural(t.items.length, "item")}`, actions: acts });
}
function doApply(t, key) {
  const { a, added } = applyTemplate(t, key);
  haptic(12);
  D.items.filter((i) => i.from === a.id).forEach((i) => S.newIds.add(i.id));
  const [kind, ref] = key.split(/:(.+)/);
  go(kind === "day" ? `#/day/${ref}` : `#/list/${ref}`);
  toast(added ? `Added ${plural(added, "item")} from ${t.name}` : "Those are already on the list", { label: "Undo", fn: () => { unapply(a.id); render(""); } });
}
function pickTemplate(key) {
  if (!D.templates.length) { toast("No templates yet. Make one in Templates."); return; }
  actionSheet({ title: "Add a template", actions: D.templates.map((t) => ({ label: `${t.emoji || ""} ${t.name}`.trim(), fn: () => doApply(t, key) })) });
}
function editTemplate(src) {
  const t = JSON.parse(JSON.stringify(src));
  if (!t.items.length) t.items.push({ title: "" });
  const isNew = !t.id;
  const shopT = () => t.target !== "day" && (listById(t.target) || {}).kind === "shopping";
  const itemsHtml = () => t.items.map((it, i) => `<div class="cell item-cell" data-i="${i}">
      <input class="t" value="${esc(it.title)}" placeholder="Item" maxlength="200" aria-label="Item ${i + 1}">
      ${t.target === "day" ? `<input type="time" value="${esc(it.time || "")}" aria-label="Time for item ${i + 1}">` : shopT() ? `<input type="number" min="1" max="999" value="${it.qty || 1}" aria-label="Quantity for item ${i + 1}">` : ""}
      <button type="button" class="rm" aria-label="Remove item">${I.xcircle}</button></div>`).join("");
  const collect = () => {
    t.name = $("#tName").value.trim();
    t.items = $$(".item-cell").map((c) => {
      const old = t.items[+c.dataset.i] || {};
      const x = { title: $("input.t", c).value.trim(), notes: old.notes || "" };
      const tm = $("input[type=time]", c), q = $("input[type=number]", c);
      if (tm) x.time = tm.value; else if (old.time) x.time = old.time;
      if (q) x.qty = Math.max(1, parseInt(q.value, 10) || 1); else if (old.qty) x.qty = old.qty;
      return x;
    });
  };
  const targetOpts = () => `<option value="day" ${t.target === "day" ? "selected" : ""}>☀️ A day plan</option>` + D.lists.map((l) => `<option value="${l.id}" ${l.id === t.target ? "selected" : ""}>${esc(l.emoji)} ${esc(l.name)}</option>`).join("");
  const sheet = openSheet({
    title: isNew ? "New Template" : "Edit Template", left: { label: "Cancel" },
    right: { label: isNew ? "Create" : "Save", bold: true, fn: () => {
      collect();
      if (!t.name) { toast("Give the template a name."); $("#tName").focus(); return false; }
      t.items = t.items.filter((x) => x.title);
      if (isNew) { t.id = uid(); D.templates.push(t); } else Object.assign(tplById(t.id), t);
      save(); render(""); toast(isNew ? "Template created" : "Template saved");
    } },
    html: `<div class="preview wall" id="tPrev" style="${wallStyle(t.image, false)}"><b id="tPrevT">${esc(t.emoji)} ${esc(t.name || "New Template")}</b>
        <button type="button" class="gbtn" id="tImg" aria-label="Change picture">${I.photo}</button></div>
      <div class="group"><div class="cell"><input id="tName" class="bigtitle" value="${esc(t.name)}" placeholder="Name, e.g. Saturday in Toronto" maxlength="60" aria-label="Template name"></div>
        <div class="emojis">${EMOJIS.map((e) => `<button type="button" data-emoji="${e}" class="${e === t.emoji ? "on" : ""}">${e}</button>`).join("")}</div></div>
      <div class="sechead small"><h2>Adds to</h2></div>
      <div class="group"><label class="cell"><span class="icon-sq" style="--ic:#5856d6">${I.list}</span><span class="grow">Goes into</span><select id="tTarget" class="pill">${targetOpts()}</select></label></div>
      <div id="tDays" ${t.target === "day" ? "" : "hidden"}>
        <div class="sechead small"><h2>Offer on</h2></div>
        <div class="group"><div class="days">${DAY_LETTERS.map((l, i) => `<button type="button" data-day="${i}" class="${t.days.includes(i) ? "on" : ""}" aria-pressed="${t.days.includes(i)}" aria-label="${DAY_SHORT[i]}">${l}</button>`).join("")}</div></div>
        <p class="foot">On these days, Today asks which plan you want. Nothing is added until you tap it.</p>
      </div>
      <div class="sechead small"><h2>Items</h2></div>
      <div class="group" id="items">${itemsHtml()}</div>
      <div class="group" style="margin-top:8px"><button type="button" class="cell" id="addItem"><span class="icon-sq">${I.plus}</span><span class="grow blue">Add Item</span></button></div>
      ${isNew ? "" : `<div class="group" style="margin-top:22px"><button type="button" class="cell danger" id="tDel"><span class="grow">Delete Template</span></button></div>`}`,
  });
  const root = sheet.el;
  const upd = () => { $("#tPrevT").textContent = `${t.emoji} ${$("#tName").value.trim() || "New Template"}`; };
  $("#tName").oninput = upd;
  $$("[data-emoji]", root).forEach((b) => b.onclick = () => { t.emoji = b.dataset.emoji; $$("[data-emoji]", root).forEach((x) => x.classList.toggle("on", x === b)); upd(); });
  $("#tImg").onclick = () => pickImage(t.image, (k) => { t.image = k; $("#tPrev").setAttribute("style", wallStyle(k, false)); });
  $$("[data-day]", root).forEach((b) => b.onclick = () => {
    const d = +b.dataset.day; t.days = t.days.includes(d) ? t.days.filter((x) => x !== d) : [...t.days, d].sort();
    b.classList.toggle("on"); b.setAttribute("aria-pressed", t.days.includes(d));
  });
  const redraw = () => { $("#items").innerHTML = itemsHtml(); bindItems(); };
  const bindItems = () => $$(".item-cell", root).forEach((c) => {
    $(".rm", c).onclick = () => { collect(); t.items.splice(+c.dataset.i, 1); if (!t.items.length) t.items.push({ title: "" }); redraw(); };
    $("input.t", c).onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("#addItem").click(); } };
  });
  bindItems();
  $("#tTarget").onchange = (e) => { collect(); t.target = e.target.value; $("#tDays").hidden = t.target !== "day"; redraw(); };
  $("#addItem").onclick = () => { collect(); t.items.push({ title: "" }); redraw(); const last = $$(".item-cell input.t", root).pop(); last.focus(); last.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  $("#tDel") && ($("#tDel").onclick = () => actionSheet({ title: `Delete “${t.name}”? Items it already added stay where they are.`,
    actions: [{ label: "Delete Template", danger: true, fn: () => { D.templates = D.templates.filter((x) => x.id !== t.id); save(); sheet.close(); render(""); } }] }));
  if (isNew && !t.name) setTimeout(() => $("#tName").focus(), reduceMotion.matches ? 0 : 320);
}

// ===== Profile & settings =====
function renderSettings(anim) {
  const p = D.profile, m = Store.meta();
  const others = m.list.filter((x) => x.id !== PID);
  const nItems = D.items.length;
  const last = p.lastBackup ? new Date(p.lastBackup).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "Never";
  appEl.innerHTML = `<div class="page home ${anim}">
    <div class="navbar"><span></span><div class="mid">Profile</div><span></span></div>
    <div class="largetitle"><h1>Profile</h1></div>
    <div class="hero wall" style="${wallStyle(p.todayImage, false)};min-height:180px;align-items:center;justify-content:center;text-align:center">
      <div class="avatar big" style="background:rgba(255,255,255,.25);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)">${esc(initials(p.name))}</div>
      <h1 style="font-size:26px">${esc(p.name)}</h1><div class="sub" style="justify-content:center">${D.lists.length} lists · ${plural(nItems, "item")} · ${plural(D.templates.length, "template")}</div></div>
    <div class="sechead small"><h2>Name</h2></div>
    <div class="group"><div class="cell"><input id="pName" value="${esc(p.name)}" maxlength="40" aria-label="Name" enterkeyhint="done"></div></div>
    <div class="sechead small"><h2>Appearance</h2></div>
    <div class="group">
      <div class="cell" style="padding:10px 12px"><div class="seg" style="flex:1">${["auto", "light", "dark"].map((k) => `<button type="button" data-th="${k}" class="${(p.theme || "auto") === k ? "on" : ""}">${k === "auto" ? "Automatic" : k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div></div>
      <button type="button" class="cell" id="pToday"><span class="thumb-sq wall" style="${wallStyle(p.todayImage)}"></span><span class="grow">Today's picture<div class="sub">${p.todayImage === "auto" ? "Changes through the day" : esc(WALL[p.todayImage][0])}</div></span>${I.chev}</button>
    </div>
    <div class="sechead small"><h2>Backup & other devices</h2></div>
    <div class="group">
      <button type="button" class="cell" id="pExport"><span class="icon-sq" style="--ic:#34c759">⬇︎</span><span class="grow">Download Backup<div class="sub">Last backup: ${esc(last)}</div></span>${I.chev}</button>
      <label class="cell" style="cursor:pointer"><span class="icon-sq" style="--ic:#007aff">⬆︎</span><span class="grow">Restore From Backup<div class="sub">Replaces this profile's lists</div></span>${I.chev}<input type="file" id="pImport" accept="application/json,.json" hidden></label>
    </div>
    <p class="foot">Everything is saved in this browser only, nothing is sent anywhere. To move your lists to your phone or laptop, download a backup here and restore it there. On iPhone, add the app to your Home Screen (Share → Add to Home Screen) so Safari keeps your lists.</p>
    <div class="sechead small"><h2>Profiles on this device</h2></div>
    <div class="group">
      <div class="cell"><span class="avatar wall" style="${wallStyle(p.todayImage)};width:32px;height:32px;font-size:13px">${esc(initials(p.name))}</span><span class="grow">${esc(p.name)}<div class="sub">Current</div></span><span class="blue">✓</span></div>
      ${others.map((o) => `<button type="button" class="cell" data-switch="${o.id}"><span class="avatar" style="background:#8e8e93;width:32px;height:32px;font-size:13px">${esc(initials(o.name))}</span><span class="grow">${esc(o.name)}<div class="sub">Switch to this profile</div></span>${I.chev}</button>`).join("")}
      <button type="button" class="cell" id="pAdd"><span class="icon-sq">${I.plus}</span><span class="grow blue">Add a Profile</span></button>
    </div>
    <div class="group" style="margin-top:22px"><button type="button" class="cell danger" id="pDel"><span class="grow">Delete This Profile</span></button></div>
    <p class="foot" style="text-align:center;margin-top:18px">Daily To Do · runs entirely in your browser</p>
  </div>${tabbar()}`;
  bindCommon();
  const nm = $("#pName");
  nm.onblur = () => { const v = nm.value.trim(); if (v && v !== p.name) { p.name = v; const mm = Store.meta(); (mm.list.find((x) => x.id === PID) || {}).name = v; Store.setMeta(mm); save(); render(""); toast("Name saved"); } else nm.value = p.name; };
  nm.onkeydown = (e) => { if (e.key === "Enter") nm.blur(); };
  $$("[data-th]").forEach((b) => b.onclick = () => { p.theme = b.dataset.th; save(); render(""); });
  $("#pToday").onclick = () => pickImage(p.todayImage, (k) => { p.todayImage = k; save(); render(""); }, true);
  $("#pExport").onclick = exportBackup;
  $("#pImport").onchange = (e) => importBackup(e.target.files[0]);
  $$("[data-switch]").forEach((b) => b.onclick = () => switchProfile(b.dataset.switch));
  $("#pAdd").onclick = () => { S.adding = true; D = null; render(); };
  $("#pDel").onclick = () => actionSheet({ title: `Delete ${p.name}'s profile and all its lists on this device? Download a backup first if you might want them.`,
    actions: [{ label: "Delete Profile", danger: true, fn: () => {
      const mm = Store.meta(); Store.remove(PID); mm.list = mm.list.filter((x) => x.id !== PID); mm.active = mm.list[0] ? mm.list[0].id : null; Store.setMeta(mm);
      if (mm.active) switchProfile(mm.active); else { D = null; PID = null; render(); }
    } }] });
}
function exportBackup() {
  D.profile.lastBackup = new Date().toISOString(); save();
  const blob = new Blob([JSON.stringify({ app: "daily-to-do", ...D }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `daily-to-do-${D.profile.name.toLowerCase().replace(/\W+/g, "-")}-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Backup downloaded"); render("");
}
function validBackup(x) { return x && Array.isArray(x.lists) && Array.isArray(x.items) && Array.isArray(x.templates) && x.profile; }
function importBackup(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let x; try { x = JSON.parse(r.result); } catch { toast("That file isn't a Daily To Do backup."); return; }
    if (!validBackup(x)) { toast("That file isn't a Daily To Do backup."); return; }
    actionSheet({ title: `Replace this profile's lists with the backup (${x.lists.length} lists, ${plural(x.items.length, "item")})?`, actions: [{ label: "Restore Backup", danger: true, fn: () => {
      const keepName = D.profile.name;
      D = { ...blankData(keepName), ...x, applied: x.applied || [] }; delete D.app;
      D.profile = { ...blankData(keepName).profile, ...x.profile };
      save(); Store.write(PID, D);
      const mm = Store.meta(); (mm.list.find((y) => y.id === PID) || {}).name = D.profile.name; Store.setMeta(mm);
      render(); toast("Backup restored");
    } }] });
  };
  r.readAsText(file);
}
function switchProfile(id) {
  const data = Store.load(id); if (!data) { toast("That profile couldn't be loaded."); return; }
  if (D) Store.write(PID, D);
  const mm = Store.meta(); mm.active = id; Store.setMeta(mm);
  D = data; PID = id; go("#/"); render();
}

// ===== welcome (first run, or adding a profile) =====
function renderWelcome() {
  const m = Store.meta();
  const bg = autoWall();
  appEl.innerHTML = `<div class="welcome wall" style="${wallStyle(bg, false)}"><div class="in fade-in">
    <img class="logo" src="icons/icon-192.png" alt="">
    <h1>${S.adding ? "New profile" : "Daily To Do"}</h1>
    <p>Plan your day, keep shopping lists and reuse routines with templates.</p>
    <form id="wForm" novalidate>
      <div class="field"><input id="wName" placeholder="Your name" autocomplete="given-name" maxlength="40" aria-label="Your name"></div>
      <div class="field"><label><span style="flex:1">Start with examples<br><small style="opacity:.8">Groceries, Weekend, Work, and Toronto & Barrie Saturday templates</small></span><span class="switch"><input type="checkbox" id="wSeed" checked><span></span></span></label></div>
      <button class="btn" type="submit">Get Started</button>
      ${m.list.length ? `<button type="button" class="link" id="wBack">Back to ${esc((m.list.find((x) => x.id === m.active) || m.list[0]).name)}</button>` : `<label class="link" style="cursor:pointer">Restore from a backup file<input type="file" id="wImport" accept="application/json,.json" hidden></label>`}
    </form></div></div>`;
  $("#tabbar") && $("#tabbar").remove();
  $("#wForm").onsubmit = (e) => {
    e.preventDefault();
    const name = $("#wName").value.trim();
    if (!name) { $("#wName").focus(); toast("What should we call you?"); return; }
    createProfile(name, $("#wSeed").checked);
  };
  $("#wBack") && ($("#wBack").onclick = () => { S.adding = false; switchProfile(m.active || m.list[0].id); });
  $("#wImport") && ($("#wImport").onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { const x = JSON.parse(r.result); if (!validBackup(x)) throw 0; const id = createProfile(x.profile.name || "Me", false); D = { ...blankData(x.profile.name), ...x }; delete D.app; Store.write(id, D); render(); toast("Backup restored"); }
      catch { toast("That file isn't a Daily To Do backup."); }
    };
    r.readAsText(f);
  });
}
function createProfile(name, withSeed) {
  const id = uid();
  D = blankData(name); PID = id;
  if (withSeed) seed(D);
  Store.write(id, D);
  const m = Store.meta(); m.list.push({ id, name }); m.active = id; Store.setMeta(m);
  S.adding = false;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { /* not supported */ }
  if (location.hash && location.hash !== "#/") go("#/", true); else { S.route = { name: "home" }; render(); }
  return id;
}

// ============ sheets ============
const sheetsEl = $("#sheets");
const openSheets = [];
function openSheet({ title, left, right, html, onClose }) {
  const scrim = document.createElement("div"); scrim.className = "scrim";
  const el = document.createElement("div"); el.className = "sheet";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title || "");
  el.innerHTML = `<div class="grab" aria-hidden="true"></div><header>
      <button type="button" class="navbtn" data-left>${esc(left ? left.label : "")}</button><h3>${esc(title || "")}</h3>
      <button type="button" class="navbtn ${right && right.bold ? "bold" : ""}" data-right>${esc(right ? right.label : "")}</button>
    </header><div class="scroll">${html}</div>`;
  sheetsEl.append(scrim, el);
  document.body.style.overflow = "hidden";
  const desk = isDesktop();
  let y = 0, sp = null, closed = false;
  const H = () => (desk ? window.innerHeight : el.offsetHeight);
  const set = (v) => { y = v; el.style.transform = desk ? `translate(-50%, calc(-50% + ${v}px))` : `translateY(${v}px)`; scrim.style.opacity = String(Math.max(0, 1 - v / H())); };
  set(H());
  sp = spring({ from: y, to: 0, response: 0.36, damping: 1, onUpdate: set });
  const api = {
    el,
    close(velocity = 0) {
      if (closed) return; closed = true; sp && sp.stop();
      if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur();
      sp = spring({ from: y, to: H() + 20, velocity, response: 0.3, onUpdate: set, onDone: () => {
        el.remove(); scrim.remove(); openSheets.splice(openSheets.indexOf(api), 1);
        if (!openSheets.length) document.body.style.overflow = "";
        onClose && onClose();
      } });
    },
  };
  openSheets.push(api);
  scrim.onclick = () => api.close();
  const leftBtn = $("[data-left]", el), rightBtn = $("[data-right]", el);
  if (!left) leftBtn.style.visibility = "hidden";
  if (!right) rightBtn.style.visibility = "hidden";
  leftBtn.onclick = () => { left && left.fn && left.fn(); api.close(); };
  rightBtn.onclick = () => { if (!right) return; const r = right.fn ? right.fn() : undefined; if (r !== false) api.close(); };
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") api.close(); });
  if (!desk) {
    const drag = (handle) => handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      sp && sp.stop(); handle.setPointerCapture(e.pointerId);
      const y0 = e.clientY - y, tr = tracker(); tr.add(0, e.clientY);
      const move = (ev) => { tr.add(0, ev.clientY); let v = ev.clientY - y0; if (v < 0) v = -rubber(-v, H()); set(v); };
      const up = () => {
        handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
        const vy = tr.v().y;
        if (y + project(vy) > H() * 0.5 && vy > -100) api.close(vy);
        else sp = spring({ from: y, to: 0, velocity: vy, response: 0.3, damping: 0.85, onUpdate: set });
      };
      handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
    });
    drag($(".grab", el)); drag($("header", el));
  }
  return api;
}
function closeAllSheets() { [...openSheets].forEach((s) => s.close()); }
function actionSheet({ title, actions }) {
  const scrim = document.createElement("div"); scrim.className = "scrim";
  const el = document.createElement("div"); el.className = "sheet"; el.style.background = "transparent"; el.style.boxShadow = "none";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="actions"><div class="group">${title ? `<div class="title">${esc(title)}</div>` : ""}${actions.map((a, i) =>
    `<button type="button" data-i="${i}" class="${a.danger ? "danger" : ""}">${esc(a.label)}</button>`).join("")}</div>
    <div class="group"><button type="button" class="cancel" data-cancel>Cancel</button></div></div>`;
  sheetsEl.append(scrim, el);
  const desk = isDesktop();
  let y = 0, sp;
  const H = () => (desk ? window.innerHeight : el.offsetHeight);
  const set = (v) => { y = v; el.style.transform = desk ? `translate(-50%, calc(-50% + ${v}px))` : `translateY(${v}px)`; scrim.style.opacity = String(Math.max(0, 1 - v / H())); };
  set(H());
  sp = spring({ from: y, to: 0, response: 0.32, onUpdate: set });
  let done = false;
  const close = (fn) => { if (done) return; done = true; sp.stop(); sp = spring({ from: y, to: H() + 10, response: 0.28, onUpdate: set, onDone: () => { el.remove(); scrim.remove(); } }); fn && fn(); };
  scrim.onclick = () => close();
  $("[data-cancel]", el).onclick = () => close();
  $$("[data-i]", el).forEach((b) => b.onclick = () => close(actions[+b.dataset.i].fn));
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  setTimeout(() => { const f = $("[data-i]", el); f && f.focus({ preventScroll: true }); }, 50);
}

// ============ start ============
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !D) return;
  const t = today();
  if (S.lastToday && S.lastToday !== t) { // a new day: refresh pictures, counts and suggestions
    if (S.route.name === "day" && S.route.day === S.lastToday) go(`#/day/${t}`, true);
    else if (!openSheets.length && !$(".composer")) render("");
  }
  S.lastToday = t;
});
window.addEventListener("storage", (e) => { // another tab changed the data
  if (D && e.key === `${KEY}.p.${PID}` && e.newValue) { try { D = JSON.parse(e.newValue); if (!openSheets.length && !$(".composer")) render(""); } catch { /* ignore */ } }
});

(function boot() {
  const m = Store.meta();
  if (m.active) { D = Store.load(m.active); PID = D ? m.active : null; }
  S.route = parseHash(); S.lastToday = today();
  render();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
