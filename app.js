/* Daily To Do — My Day, lists for anything, templates and rules. Runs entirely in the browser. */
"use strict";

// ================= helpers =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const haptic = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* unsupported */ } };
const plural = (n, w, p) => `${n} ${n === 1 ? w : p || w + "s"}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const isDesktop = () => matchMedia("(min-width: 980px)").matches;

const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => dayStr(new Date());
const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
const validDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && dayStr(parseDay(s)) === s;
const weekdayName = (s) => parseDay(s).toLocaleDateString("en-CA", { weekday: "long" });
const longDate = (s) => parseDay(s).toLocaleDateString("en-CA", { month: "long", day: "numeric", ...(parseDay(s).getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
const shortDate = (s) => parseDay(s).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
const monIndex = (s) => (parseDay(s).getDay() + 6) % 7; // Monday = 0
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function fmtTime(t) { if (!t) return ""; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? ":" + pad(m) : ""} ${h < 12 ? "AM" : "PM"}`; }
function relDay(s) { const t = today(); return s === t ? "Today" : s === addDays(t, 1) ? "Tomorrow" : s === addDays(t, -1) ? "Yesterday" : ""; }
const dayLabel = (s) => relDay(s) || shortDate(s);
const nextWeekday = (from, wd, includeToday = true) => { for (let i = includeToday ? 0 : 1; i < 8; i++) { const d = addDays(from, i); if (monIndex(d) === wd) return d; } return from; };
function daysText(days) {
  if (!days || !days.length) return "Any day";
  if (days.length === 7) return "Every day";
  if (days.join() === "0,1,2,3,4") return "Weekdays";
  if (days.join() === "5,6") return "Weekends";
  return days.map((d) => DAY_SHORT[d]).join(", ");
}

// ================= glyphs (SF Symbols–style line icons) =================
const G = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke-width="2"/>',
  plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  chevL: '<path d="M15 4.5L7.5 12l7.5 7.5" stroke-width="2.4"/>',
  chevR: '<path d="M9 4.5l7.5 7.5L9 19.5" stroke-width="2.2"/>',
  chevD: '<path d="M5 8.5l7 7 7-7" stroke-width="2.4"/>',
  more: '<circle cx="12" cy="12" r="9.5"/><circle cx="7.6" cy="12" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="16.4" cy="12" r=".9" fill="currentColor"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5L7 7M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5"/>',
  star: '<path d="M12 3.3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.7l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  starFill: '<path d="M12 3.3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.7l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  calToday: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><rect x="7" y="13" width="3.5" height="3.5" rx=".8" fill="currentColor" stroke="none"/>',
  calTomorrow: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15.2h6M13 13l2.2 2.2L13 17.4"/>',
  calWeek: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8.5 13l2 2-2 2M13 13l2 2-2 2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11.5V10a4 4 0 014-4h12M7 21l-3-3 3-3"/><path d="M20 12.5V14a4 4 0 01-4 4H4"/>',
  note: '<path d="M14.5 3.5H7a3 3 0 00-3 3v11a3 3 0 003 3h10a3 3 0 003-3V9z"/><path d="M14.5 3.5V9H20M8 13h8M8 16.5h5"/>',
  trash: '<path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7M6.5 6.5l.9 12.2a2 2 0 002 1.8h5.2a2 2 0 002-1.8l.9-12.2M10 10.5v6M14 10.5v6"/>',
  pencil: '<path d="M4 20l1-4.2L16.3 4.5a2 2 0 012.8 0l.4.4a2 2 0 010 2.8L8.2 19zM14 6.8l3.2 3.2"/>',
  photo: '<rect x="3" y="4.5" width="18" height="15" rx="3.5"/><circle cx="9" cy="10" r="1.8"/><path d="M21 15.5l-4.8-4.8L7 19.5"/>',
  list: '<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><circle cx="5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="5" cy="17.5" r="1.2" fill="currentColor" stroke="none"/>',
  checklist: '<path d="M3.5 6.5l1.8 1.8L8.5 5M3.5 13l1.8 1.8L8.5 11.5M11.5 7h9M11.5 13.5h9M11.5 19.5h9"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  rows: '<rect x="3.5" y="4.5" width="17" height="6" rx="2"/><rect x="3.5" y="13.5" width="17" height="6" rx="2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20.5 20.5" stroke-width="2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18" stroke-width="2.4"/>',
  xFill: '<circle cx="12" cy="12" r="9.5" fill="currentColor" stroke="none"/><path d="M9 9l6 6M15 9l-6 6" stroke="var(--card, #fff)" stroke-width="1.8"/>',
  grip: '<path d="M4.5 8.5h15M4.5 12h15M4.5 15.5h15"/>',
  arrowUp: '<path d="M12 19V5.5M6 11l6-6 6 6" stroke-width="2.4"/>',
  share: '<path d="M12 3.5v11M8 7l4-4 4 4"/><path d="M8.5 10.5H7a2.5 2.5 0 00-2.5 2.5v5A2.5 2.5 0 007 20.5h10a2.5 2.5 0 002.5-2.5v-5a2.5 2.5 0 00-2.5-2.5h-1.5"/>',
  printer: '<path d="M7 8.5V4h10v4.5"/><rect x="3.5" y="8.5" width="17" height="8" rx="2.5"/><path d="M7 14h10v6H7z"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 00-2.5-2.5H6A2.5 2.5 0 003.5 6v7A2.5 2.5 0 006 15.5h2.5"/>',
  sort: '<path d="M7 4.5v15M3.5 16l3.5 3.5 3.5-3.5M14 6h6.5M14 11h4.5M14 16h2.5"/>',
  stack: '<rect x="4" y="9" width="16" height="11" rx="2.5"/><path d="M6.5 6h11M9 3h6"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0012 3z"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.3 0-3.2 2.2-5.3 3.6-7.4.5 1.6 1.4 2.6 2.4 3 .2-2.9 1.6-5.5 3.9-7.3-.3 3.1 1.1 4.6 2.6 6.4 1.2 1.5 2.5 3.1 2.5 5.4C20.5 18.4 17 21 12 21z"/><path d="M12 21c-1.8 0-3-1.2-3-2.9 0-1.9 1.6-2.9 2.6-4.4.9 1.4 3.4 2.4 3.4 4.4 0 1.7-1.2 2.9-3 2.9z"/>',
  tray: '<path d="M3.5 13.5l2.6-7.2a2 2 0 011.9-1.3h8a2 2 0 011.9 1.3l2.6 7.2v4a2.5 2.5 0 01-2.5 2.5H6a2.5 2.5 0 01-2.5-2.5z"/><path d="M3.5 13.5h5l1 2h5l1-2h5"/>',
  wand: '<path d="M4 20L15 9M13 7l4 4"/><path d="M18.5 3v3M17 4.5h3M6 3v2M5 4h2M20 13v2M19 14h2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8l1.6 2.3 2.7-.6.6 2.7 2.3 1.6-1.2 2.5 1.2 2.5-2.3 1.6-.6 2.7-2.7-.6L12 21.2l-1.6-2.3-2.7.6-.6-2.7-2.3-1.6 1.2-2.5-1.2-2.5 2.3-1.6.6-2.7 2.7.6z"/>',
  person: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5"/>',
  download: '<path d="M12 3.5v11.5M7.5 10.5L12 15l4.5-4.5M4.5 17v1.5a2 2 0 002 2h11a2 2 0 002-2V17"/>',
  upload: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M4.5 17v1.5a2 2 0 002 2h11a2 2 0 002-2V17"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M4 4l16 16M10 5.7c.6-.1 1.3-.2 2-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 01-2.9 3.7M6.4 6.9C3.9 8.7 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/>',
  number: '<path d="M9.5 3.5l-2 17M16.5 3.5l-2 17M4.5 8.5h16M3.5 15.5h16"/>',
  tag: '<path d="M3.5 12.3V5a1.5 1.5 0 011.5-1.5h7.3l8.2 8.2a1.6 1.6 0 010 2.2l-6.6 6.6a1.6 1.6 0 01-2.2 0z"/><circle cx="8" cy="8" r="1.4"/>',
  arrowRight: '<path d="M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5"/>',
  sparkles: '<path d="M10 3l1.7 4.8L16.5 9.5l-4.8 1.7L10 16l-1.7-4.8L3.5 9.5l4.8-1.7zM18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z"/>',
  bolt: '<path d="M13 2.5L4.5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
  cart: '<path d="M2.5 4h2.6l2.3 11h10.4l2-8H6.3"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="16.5" cy="19.5" r="1.4"/>',
  bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M8.5 10V7a3.5 3.5 0 017 0v3"/>',
  house: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5v10h13v-10M10 19.5v-5h4v5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3 12.5h18"/>',
  heart: '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0112 7a4.5 4.5 0 018 2.5C20 15.3 12 20 12 20z"/>',
  book: '<path d="M4 5.5A2 2 0 016 3.5h13v15H6a2 2 0 00-2 2z"/><path d="M4 20.5a2 2 0 012-2h13v2.5"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.5" rx="1.5"/><path d="M5 12.5V20h14v-7.5M12 8v12M12 8S10.5 3.5 8 4.2C6 4.8 7 8 12 8zM12 8s1.5-4.5 4-3.8C18 4.8 17 8 12 8z"/>',
  plane: '<path d="M10.5 13.5L3 11l1.5-1.5 7.5.5 4-4.5c1-1 2.5-1.3 3-.8s.2 2-.8 3l-4.5 4 .5 7.5L12.7 21l-2.5-7.5L7 16.5v2.5L5.5 20l-.8-3.2L1.5 16 3 14.5h2.5z"/>',
  car: '<path d="M3.5 16.5v-4l2-5a2 2 0 011.9-1.3h9.2a2 2 0 011.9 1.3l2 5v4z"/><path d="M3.5 12.5h17M6 16.5v2M18 16.5v2"/><circle cx="7.5" cy="14.5" r=".8" fill="currentColor"/><circle cx="16.5" cy="14.5" r=".8" fill="currentColor"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
  paw: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15.5" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M12.5 11.5c-3 0-6 4-6 6.5 0 1.5 1 2.5 2.5 2.5 1.5 0 2.3-.8 3.5-.8s2 .8 3.5.8 2.5-1 2.5-2.5c0-2.5-3-6.5-6-6.5z"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  film: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M7.5 4v16M16.5 4v16M3.5 9h4M3.5 15h4M16.5 9h4M16.5 15h4"/>',
  cup: '<path d="M4.5 8.5h12v6a5 5 0 01-5 5h-2a5 5 0 01-5-5z"/><path d="M16.5 10.5h1.5a2.5 2.5 0 010 5h-1.5M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3"/>',
  fork: '<path d="M7 3v7a2.5 2.5 0 005 0V3M9.5 3v18M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  pill: '<rect x="2.6" y="8.2" width="18.8" height="7.6" rx="3.8" transform="rotate(-45 12 12)"/><path d="M9.3 9.3l5.4 5.4"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 015.2-2.3l-2.7 2.7.5 2.1 2.1.5 2.7-2.7a4 4 0 01-5.3 5.2L8.5 20a2.1 2.1 0 01-3-3z"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5c2-1 4-1 6 0s4 1 7 0v9c-3 1-5 1-7 0s-4-1-6 0"/>',
  cap: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5M21.5 9.5v5"/>',
  game: '<path d="M7 7.5h10a4.5 4.5 0 014.4 5.5l-1 4a2.5 2.5 0 01-4.3 1.1L14 16h-4l-2.1 2.1a2.5 2.5 0 01-4.3-1.1l-1-4A4.5 4.5 0 017 7.5z"/><path d="M8 10.5v3M6.5 12h3"/><circle cx="16" cy="11" r=".9" fill="currentColor"/><circle cx="17.5" cy="13" r=".9" fill="currentColor"/>',
  tent: '<path d="M2.5 20.5L12 4l9.5 16.5zM9 20.5L12 14l3 6.5"/>',
  building: '<path d="M4.5 21V5.5A1.5 1.5 0 016 4h7a1.5 1.5 0 011.5 1.5V21M14.5 9H18a1.5 1.5 0 011.5 1.5V21M3 21h18M8 8h3M8 12h3M8 16h3"/>',
  tree: '<path d="M12 21v-4M12 3l-6 8h3l-4 6h14l-4-6h3z"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  baby: '<circle cx="12" cy="12" r="8.5"/><path d="M9 10.5h.01M15 10.5h.01M9.5 15c1.4 1 3.6 1 5 0M12 3.5c-1.5 1-1.5 2.5 0 3"/>',
  bandage: '<rect x="2.6" y="8" width="18.8" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M10 10h.01M14 14h.01M12 12h.01M10 14h.01M14 10h.01"/>',
  tabDay: '<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5" stroke-width="2"/>',
  tabLists: '<rect x="3" y="3.5" width="18" height="17" rx="4.5"/><path d="M10 9h7.5M10 15h7.5" stroke-width="2"/><circle cx="6.8" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="6.8" cy="15" r="1.3" fill="currentColor" stroke="none"/>',
  tabTpl: '<rect x="6" y="7" width="14.5" height="14" rx="3" fill="currentColor" stroke="none"/><path d="M3.5 16V6.5a3 3 0 013-3h9.5"/>',
  tabSearch: '<circle cx="10.5" cy="10.5" r="6.3" stroke-width="2.2"/><path d="M15.3 15.3l5 5" stroke-width="2.6"/>',
  tabHabits: '<circle cx="12" cy="12" r="8.8" stroke-width="2" opacity=".35"/><path d="M12 3.2a8.8 8.8 0 11-8.3 5.9" stroke-width="2.6"/><circle cx="12" cy="12" r="3.3" fill="currentColor" stroke="none"/>',
  code: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.6 4.5l-3.2 15"/>',
  drop: '<path d="M12 3.5s6 6.4 6 11a6 6 0 01-12 0c0-4.6 6-11 6-11z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  skip: '<path d="M5 6l7 6-7 6zM13 6l7 6-7 6z"/>',
  archive: '<rect x="3.5" y="4" width="17" height="4.5" rx="1.5"/><path d="M5 8.5v9.5a2 2 0 002 2h10a2 2 0 002-2V8.5M10 12.5h4"/>',
  minus: '<path d="M5 12h14" stroke-width="2"/>',
};
function g(name, cls = "") {
  return `<svg class="g ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[name] || G.list}</svg>`;
}
const LIST_GLYPHS = ["list", "checklist", "cart", "bag", "house", "building", "briefcase", "star", "heart", "book", "cap", "gift", "plane", "car", "tent", "dumbbell", "leaf", "tree", "paw", "baby", "music", "film", "game", "cup", "fork", "pill", "bandage", "wrench", "money", "flag", "sun", "moon", "bolt", "sparkles", "calendar", "bulb", "code", "drop", "target"];
const COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be", "#32ade6", "#007aff", "#5856d6", "#af52de", "#ff2d55", "#a2845e", "#8e8e93"];
const lic = (icon, color, cls = "") => `<span class="lic ${cls}" style="--c:${color || COLORS[6]}">${g(icon || "list")}</span>`;
const licSm = (icon, color, px = 22) => `<span class="lic" style="--c:${color || COLORS[6]};width:${px}px;height:${px}px">${g(icon || "list", "xs")}</span>`;

// ================= wallpapers =================
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
function autoWall() { const h = new Date().getHours(); return h < 5 ? "tahoe-night" : h < 9 ? "tahoe-dawn" : h < 17 ? "tahoe-day" : h < 20 ? "tahoe-dusk" : "tahoe-night"; }
const wallKey = (k) => (k === "auto" || !WALL[k] ? autoWall() : k);
function wallStyle(k, small = true) { const key = wallKey(k); return `background-image:url(img/${key}${small ? "-sm" : ""}.webp);--wc:${WALL[key][1]}`; }
// Pictures live in their own layer. When a page redraws, the layer that's already on screen is moved into
// the new page instead of being rebuilt, so iOS never repaints (and flashes) a wallpaper it was already showing.
const IMG_KEEP = new Map(); // holding decoded images stops Safari from dropping them between redraws
function keepImg(url) { if (!IMG_KEEP.has(url)) { const im = new Image(); im.decoding = "async"; im.src = url; IMG_KEEP.set(url, im); } }
function takeLayers(...roots) {
  const m = new Map();
  roots.forEach((r) => r && $$(".wimg", r).forEach((n) => { const k = n.dataset.src; (m.get(k) || m.set(k, []).get(k)).push(n); }));
  return m;
}
function giveLayers(old, ...roots) {
  roots.forEach((r) => r && $$(".wall", r).forEach((el) => {
    const bg = el.style.backgroundImage; if (!bg || bg === "none") return;
    const url = bg.replace(/^url\(["']?|["']?\)$/g, ""); keepImg(url);
    el.style.backgroundImage = "none";
    const reuse = (old.get(url) || []).shift();
    if (reuse) el.prepend(reuse);
    else { const i = document.createElement("i"); i.className = "wimg"; i.dataset.src = url; i.style.backgroundImage = `url("${url}")`; el.prepend(i); }
  }));
}
const syncClock = () => document.documentElement.style.setProperty("--kb", `-${((performance.now() / 1000) % 64).toFixed(2)}s`); // slow drifts carry on where they were

// ================= storage =================
const KEY = "dtd.v2";
const Store = {
  meta() { try { return JSON.parse(localStorage.getItem(KEY + ".profiles")) || { active: null, list: [] }; } catch { return { active: null, list: [] }; } },
  setMeta(m) { try { localStorage.setItem(KEY + ".profiles", JSON.stringify(m)); } catch { /* blocked */ } },
  load(id) { try { return JSON.parse(localStorage.getItem(`${KEY}.p.${id}`)); } catch { return null; } },
  write(id, data) { try { localStorage.setItem(`${KEY}.p.${id}`, JSON.stringify(data)); return true; } catch { toast("Couldn't save: this browser's storage is full or turned off."); return false; } },
  remove(id) { try { localStorage.removeItem(`${KEY}.p.${id}`); } catch { /* ignore */ } },
};
let D = null, PID = null, saveTimer;
function save() { if (!D) return; D.updated = new Date().toISOString(); clearTimeout(saveTimer); saveTimer = setTimeout(() => Store.write(PID, D), 120); }
window.addEventListener("pagehide", () => { if (D) { clearTimeout(saveTimer); Store.write(PID, D); } });

function blankData(name) {
  return { v: 3, profile: { name, created: new Date().toISOString(), theme: "auto", todayImage: "auto", showDone: true, homeView: "cards" }, lists: [], items: [], templates: [], applied: [], rules: [], habits: [], updated: null };
}
function newList(f) { return { id: uid(), name: "", icon: "list", color: COLORS[6], image: "sonoma-light", sort: "manual", group: "none", qty: false, showDone: true, pos: (D ? D.lists.length : 0) + 1, ...f }; }
const EMOJI_GLYPH = { "🛒": "cart", "🥦": "leaf", "🏠": "house", "🏡": "house", "🏙️": "building", "🌲": "tree", "💼": "briefcase", "🏋️": "dumbbell", "🎾": "dumbbell", "📚": "book", "💻": "briefcase", "✈️": "plane", "🎁": "gift", "🎉": "sparkles", "💊": "pill", "🐶": "paw", "🚗": "car", "💡": "bulb", "🎬": "film", "❤️": "heart", "☀️": "sun", "🌙": "moon", "🥛": "bag", "✅": "checklist" };
function migrate(d) { // older saves → today's shape
  if (!d) return d;
  d.rules = d.rules || []; d.applied = d.applied || []; d.habits = d.habits || [];
  d.habits.forEach((h) => { h.log = h.log || {}; h.skip = h.skip || {}; h.sched = h.sched || { type: "daily" }; h.target = h.target || 1; h.tod = h.tod || "any"; });
  d.profile = { theme: "auto", todayImage: "auto", showDone: true, homeView: "cards", ...d.profile };
  d.lists.forEach((l, i) => {
    if (!l.icon) l.icon = EMOJI_GLYPH[l.emoji] || "list";
    if (!l.color) l.color = COLORS[(i * 5 + 6) % COLORS.length];
    if (l.kind === "shopping") { l.qty = true; l.group = l.group || "section"; }
    l.sort = l.sort || "manual"; l.group = l.group || "none"; if (l.showDone === undefined) l.showDone = true;
    delete l.kind; delete l.emoji;
  });
  d.items.forEach((i) => { if (i.cat && !i.section) i.section = i.cat === "Other" ? "" : i.cat; delete i.cat; if (i.qty === 1) delete i.qty; });
  d.templates.forEach((t, i) => { if (!t.icon) t.icon = EMOJI_GLYPH[t.emoji] || "list"; if (!t.color) t.color = COLORS[(i * 3 + 6) % COLORS.length]; delete t.emoji;
    t.items.forEach((x) => { if (x.cat && !x.section) x.section = x.cat === "Other" ? "" : x.cat; delete x.cat; }); });
  d.v = 3;
  return d;
}

// ================= model =================
const listById = (id) => D.lists.find((l) => l.id === id);
const itemById = (id) => D.items.find((i) => i.id === id);
const tplById = (id) => D.templates.find((t) => t.id === id);
const nextPos = () => D.items.reduce((m, i) => Math.max(m, i.pos || 0), 0) + 1;
const listItems = (id) => D.items.filter((i) => i.list === id);
const myDayItems = (day) => D.items.filter((i) => (i.list === "day" && i.day === day) || (i.list !== "day" && i.myDay === day));
const dueOn = (day) => D.items.filter((i) => i.list !== "day" && i.due === day && i.myDay !== day);
const overdue = (day) => D.items.filter((i) => !i.done && ((i.list === "day" && i.day < day) || (i.list !== "day" && i.due && i.due < day && i.myDay !== day)));
const dateOf = (i) => (i.list === "day" ? i.day : i.due);
function addItem(f) { const it = { id: uid(), notes: "", time: "", starred: false, done: false, pos: nextPos(), created: Date.now(), ...f }; D.items.push(it); save(); return it; }
function sourceName(it) { return it.list === "day" ? "My Day" : (listById(it.list) || {}).name || ""; }
function where(it) { return it.list === "day" ? `day:${it.day}` : `list:${it.list}`; }

// repeating tasks
const REPEATS = { daily: "Every day", weekdays: "Weekdays", weekly: "Every week", monthly: "Every month", yearly: "Every year" };
function nextDate(d, rep) {
  if (rep === "daily") return addDays(d, 1);
  if (rep === "weekdays") { let n = addDays(d, 1); while (monIndex(n) > 4) n = addDays(n, 1); return n; }
  if (rep === "weekly") return addDays(d, 7);
  const x = parseDay(d);
  if (rep === "monthly") { const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + 1); x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return dayStr(x); }
  if (rep === "yearly") { x.setFullYear(x.getFullYear() + 1); return dayStr(x); }
  return d;
}
function setDone(it, done) {
  it.done = done; it.doneAt = done ? Date.now() : null;
  if (done && it.repeat && !it.spawned) { // the next one appears straight away, like To Do and Reminders
    it.spawned = true;
    const base = dateOf(it) || today();
    const n = { ...it, id: uid(), done: false, doneAt: null, spawned: false, pos: nextPos(), created: Date.now() };
    if (it.list === "day") n.day = nextDate(base, it.repeat); else { n.due = nextDate(base, it.repeat); delete n.myDay; }
    D.items.push(n);
    toast(`Repeats: next one ${dayLabel(n.list === "day" ? n.day : n.due)}`);
  }
  save();
}

// templates
function applyTemplate(t, key) {
  const [kind, ref] = key.split(/:(.+)/);
  const have = new Set(D.items.filter((i) => where(i) === key && !i.done).map((i) => i.title.trim().toLowerCase()));
  const a = { id: uid(), tpl: t.id, name: t.name, key, at: Date.now() };
  D.applied.push(a);
  let added = 0;
  for (const x of t.items) {
    if (!x.title || have.has(x.title.trim().toLowerCase())) continue;
    const f = { title: x.title, notes: x.notes || "", time: x.time || "", from: a.id };
    if (x.qty > 1) f.qty = x.qty; if (x.section) f.section = x.section;
    if (kind === "day") Object.assign(f, { list: "day", day: ref }); else f.list = ref;
    addItem(f); added++;
  }
  save();
  return { a, added };
}
function unapply(aid) { D.items = D.items.filter((i) => !(i.from === aid && !i.done)); D.applied = D.applied.filter((a) => a.id !== aid); save(); }
function suggestionsFor(day) {
  const ts = D.templates.filter((t) => t.target === "day" && (t.days || []).includes(monIndex(day)));
  const used = D.applied.filter((a) => a.key === `day:${day}`).map((a) => a.tpl);
  return ts.some((t) => used.includes(t.id)) ? [] : ts;
}

// rules: "every Saturday, start this list fresh"
const RULE_ACTIONS = {
  reset: ["Start fresh", "Uncheck everything so the list can be reused", "repeat"],
  clear: ["Remove completed", "Delete the items that are ticked off", "trash"],
  template: ["Add from a template", "Add a template's items to the list", "stack"],
  myday: ["Send to My Day", "Add the list's unfinished items to My Day", "sun"],
};
const ordinal = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
function ruleWhen(r) {
  if (r.freq === "daily") return "Every day";
  if (r.freq === "monthly") return `Monthly on the ${ordinal(r.date)}`;
  const d = r.days || [];
  return d.length === 1 ? `Every ${DAY_LONG[d[0]]}` : daysText(d);
}
function ruleText(r) {
  const what = r.action === "template" ? `add “${(tplById(r.tpl) || {}).name || "a template"}”` : RULE_ACTIONS[r.action][0].toLowerCase();
  return `${ruleWhen(r)}: ${what}`;
}
function lastOccurrence(r, t) {
  if (r.freq === "daily") return t;
  if (r.freq === "weekly") { for (let i = 0; i < 7; i++) { const d = addDays(t, -i); if ((r.days || []).includes(monIndex(d))) return d; } return null; }
  if (r.freq === "monthly") {
    const x = parseDay(t), clamp = (y, m) => Math.min(r.date, new Date(y, m + 1, 0).getDate());
    let d = new Date(x.getFullYear(), x.getMonth(), clamp(x.getFullYear(), x.getMonth()));
    if (d > x) { const p = new Date(x.getFullYear(), x.getMonth() - 1, 1); d = new Date(p.getFullYear(), p.getMonth(), clamp(p.getFullYear(), p.getMonth())); }
    return dayStr(d);
  }
  return null;
}
function runRule(r) {
  const l = listById(r.list); if (!l) return 0;
  const items = listItems(l.id);
  let n = 0;
  if (r.action === "reset") items.filter((i) => i.done).forEach((i) => { i.done = false; i.doneAt = null; n++; });
  else if (r.action === "clear") { const gone = items.filter((i) => i.done); n = gone.length; D.items = D.items.filter((i) => !gone.includes(i)); }
  else if (r.action === "template") { const t = tplById(r.tpl); if (t) n = applyTemplate(t, `list:${l.id}`).added; }
  else if (r.action === "myday") items.filter((i) => !i.done && i.myDay !== today()).forEach((i) => { i.myDay = today(); n++; });
  return n;
}
function runRules() {
  if (!D) return;
  const t = today(), ran = [];
  for (const r of D.rules) {
    if (r.on === false) continue;
    const occ = lastOccurrence(r, t);
    if (occ && (!r.last || r.last < occ)) { runRule(r); r.last = t; ran.push(r); }
  }
  if (ran.length) {
    save();
    const l = listById(ran[0].list);
    setTimeout(() => toast(ran.length === 1 && l ? `${l.name}: ${RULE_ACTIONS[ran[0].action][0].toLowerCase()} (${ruleWhen(ran[0]).toLowerCase()})` : `${plural(ran.length, "rule")} ran for today`), 400);
  }
}

// streaks
function doneDays() {
  const s = new Set(); D.items.forEach((i) => { if (i.done && i.doneAt) s.add(dayStr(new Date(i.doneAt))); });
  (D.habits || []).forEach((h) => Object.keys(h.log).forEach((d) => { if (hMet(h, d)) s.add(d); }));
  return s;
}

// ================= habits =================
// Built on what the best trackers share: one-tap rings (Streaks), done / count / amount goals (Habitify),
// every day, chosen days or N times a week (Loop), skips that don't break a streak (Way of Life),
// a strength score that forgives a missed day (Loop) and a year-at-a-glance grid (HabitKit).
const TOD = { any: "Any Time", morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
const TOD_ORDER = ["morning", "afternoon", "evening", "any"];
const UNITS = ["times", "pages", "min", "glasses", "km", "steps", "reps", "hours"];
const HABIT_PRESETS = [
  { name: "Gym", icon: "dumbbell", color: "#ff3b30", target: 1, unit: "", sched: { type: "weekly", times: 4 }, tod: "morning" },
  { name: "Read", icon: "book", color: "#ff9500", target: 20, unit: "pages", sched: { type: "daily" }, tod: "evening" },
  { name: "Code", icon: "code", color: "#5856d6", target: 30, unit: "min", sched: { type: "days", days: [0, 1, 2, 3, 4] }, tod: "any" },
  { name: "Eat 3 meals", icon: "fork", color: "#34c759", target: 3, unit: "times", sched: { type: "daily" }, tod: "any" },
  { name: "Chores", icon: "house", color: "#00c7be", target: 1, unit: "", sched: { type: "daily" }, tod: "evening" },
  { name: "Drink water", icon: "drop", color: "#32ade6", target: 8, unit: "glasses", sched: { type: "daily" }, tod: "any" },
  { name: "Meditate", icon: "leaf", color: "#af52de", target: 10, unit: "min", sched: { type: "daily" }, tod: "morning" },
  { name: "Lights out by 11", icon: "moon", color: "#007aff", target: 1, unit: "", sched: { type: "daily" }, tod: "evening" },
];
const habitById = (id) => (D.habits || []).find((h) => h.id === id);
const hVal = (h, d) => h.log[d] || 0;
const hMet = (h, d) => hVal(h, d) >= (h.target || 1);
const hFrac = (h, d) => Math.min(1, hVal(h, d) / (h.target || 1));
const isCheckH = (h) => (h.target || 1) === 1 && (!h.unit || h.unit === "times");
const isAmountH = (h) => !!h.unit && h.unit !== "times";
const weekStart = (d) => addDays(d, -monIndex(d));
const unitText = (h, n) => (!h.unit || h.unit === "times" ? (n === 1 ? "time" : "times") : h.unit);
const activeHabits = () => (D.habits || []).filter((h) => !h.archived).sort((a, b) => (a.pos || 0) - (b.pos || 0));
function weekDone(h, d) { const s = weekStart(d); let n = 0; for (let i = 0; i < 7; i++) if (hMet(h, addDays(s, i))) n++; return n; }
function scheduledOn(h, d) { if (d < h.created) return false; return h.sched.type === "days" ? (h.sched.days || []).includes(monIndex(d)) : true; }
function habitDueOn(h, d) { // shows on that day's rings
  if (h.archived || !scheduledOn(h, d)) return false;
  if (h.sched.type === "weekly") return hVal(h, d) > 0 || weekDone(h, d) < h.sched.times;
  return true;
}
function schedText(h) {
  const s = h.sched;
  if (s.type === "weekly") return s.times >= 7 ? "Every day" : `${s.times}× a week`;
  if (s.type === "days") return daysText(s.days);
  return "Every day";
}
const goalText = (h) => (isCheckH(h) ? "" : `${h.target} ${unitText(h, h.target)}`);
function hStreak(h) {
  const t = today();
  if (h.sched.type === "weekly") {
    let ws = weekStart(t), n = 0;
    if (weekDone(h, ws) >= h.sched.times) n++;
    ws = addDays(ws, -7);
    for (let k = 0; k < 520 && ws >= weekStart(h.created) && weekDone(h, ws) >= h.sched.times; k++) { n++; ws = addDays(ws, -7); }
    return n;
  }
  let d = t, n = 0;
  if (!hMet(h, d)) d = addDays(d, -1); // today isn't over yet
  for (let k = 0; k < 3660 && d >= h.created; k++) {
    if (hMet(h, d)) n++;
    else if (scheduledOn(h, d) && !h.skip[d]) break;
    d = addDays(d, -1);
  }
  return n;
}
function hBest(h) {
  const t = today(); let best = 0, run = 0;
  if (h.sched.type === "weekly") {
    for (let ws = weekStart(h.created); ws <= t; ws = addDays(ws, 7)) { if (weekDone(h, ws) >= h.sched.times) best = Math.max(best, ++run); else if (ws !== weekStart(t)) run = 0; }
    return best;
  }
  for (let d = h.created; d <= t; d = addDays(d, 1)) {
    if (hMet(h, d)) best = Math.max(best, ++run);
    else if (scheduledOn(h, d) && !h.skip[d] && d !== t) run = 0;
  }
  return best;
}
function hStrength(h) { // 0–100, rises with each check-in, eases down after a miss
  const t = today(); let s = 0;
  if (h.sched.type === "weekly") {
    const a = 1 - Math.pow(0.5, 1 / 4);
    for (let ws = weekStart(h.created); ws <= t; ws = addDays(ws, 7)) {
      const f = Math.min(1, weekDone(h, ws) / h.sched.times);
      if (ws === weekStart(t) && f < 1) continue;
      s = s * (1 - a) + a * f;
    }
  } else {
    const a = 1 - Math.pow(0.5, 1 / 13);
    for (let d = h.created; d <= t; d = addDays(d, 1)) {
      if (!scheduledOn(h, d) || h.skip[d] || (d === t && !hMet(h, d))) continue;
      s = s * (1 - a) + a * hFrac(h, d);
    }
  }
  return Math.round(s * 100);
}
const hTotal = (h) => Object.keys(h.log).filter((d) => hMet(h, d)).length;
function newHabit(f = {}) { return { id: uid(), name: "", icon: "target", color: COLORS[5], target: 1, unit: "", sched: { type: "daily" }, tod: "any", created: weekStart(today()), log: {}, skip: {}, pos: (D.habits.length || 0) + 1, ...JSON.parse(JSON.stringify(f)) }; }
function setHabit(h, d, v, { quiet = false } = {}) {
  const before = hVal(h, d), wasMet = hMet(h, d), old = { v: before, skip: h.skip[d] };
  v = Math.max(0, Math.min(9999, Math.round(v * 100) / 100));
  if (v) h.log[d] = v; else delete h.log[d];
  if (v) delete h.skip[d];
  save();
  const nowMet = hMet(h, d);
  if (nowMet && !wasMet) {
    S.pop = `h:${h.id}:${d}`; haptic([10, 30, 14]);
    const due = activeHabits().filter((x) => habitDueOn(x, d) || hVal(x, d) > 0);
    if (due.length > 1 && due.every((x) => hMet(x, d)) && d === today()) setTimeout(confetti, 260);
  } else haptic(8);
  afterHabit();
  if (quiet) return;
  const st = hStreak(h), unit = h.sched.type === "weekly" ? "week" : "day";
  const msg = nowMet && !wasMet ? `${h.name}: done${st > 1 ? ` · ${st}-${unit} streak` : ""}` : isCheckH(h) ? `${h.name}: not done` : `${h.name}: ${v} of ${h.target} ${unitText(h, h.target)}`;
  toast(msg, { label: "Undo", fn: () => { if (old.v) h.log[d] = old.v; else delete h.log[d]; if (old.skip) h.skip[d] = true; save(); afterHabit(); } });
}
function afterHabit() { const p = S.pop; render(""); S.pop = p; openSheets.forEach((s) => s.refresh && s.refresh()); S.pop = null; }
function nudgeHabit(h, d, anchor) { // what one tap on a ring does
  if (d > today()) { toast("You can't log a day that hasn't happened yet."); return; }
  if (isCheckH(h)) { setHabit(h, d, hMet(h, d) ? 0 : 1); return; }
  if (!isAmountH(h)) { setHabit(h, d, hVal(h, d) + 1); return; }
  const v = hVal(h, d), steps = [...new Set([Math.round(h.target / 4), Math.round(h.target / 2), h.target].filter((x) => x > 0))];
  menu(anchor, [
    ...steps.map((x) => ({ label: `+${x} ${h.unit}`, icon: "plus", fn: () => setHabit(h, d, v + x) })),
    ...(v < h.target ? [{ label: "Log the Full Goal", icon: "check", fn: () => setHabit(h, d, h.target) }] : []),
    { sep: true },
    { label: "Details", icon: "target", fn: () => habitSheet(h, d) },
    ...(v ? [{ label: "Reset to 0", icon: "x", red: true, fn: () => setHabit(h, d, 0) }] : []),
  ], `${h.name} · ${v} of ${h.target} ${h.unit}`);
}
function toggleSkip(h, d) {
  if (h.skip[d]) delete h.skip[d]; else { h.skip[d] = true; delete h.log[d]; }
  save(); afterHabit(); haptic(6);
  toast(h.skip[d] ? `${h.name}: skipped, your streak is safe` : `${h.name}: skip removed`);
}
// a ring that grows from where it last was
function hRing(h, d, size = 56) {
  const f = hFrac(h, d), met = f >= 1, key = `h:${h.id}:${d}`;
  const r = size / 2 - 4, C = 2 * Math.PI * r, from = S.rings[key] ?? 0;
  const burst = S.pop === key ? "burst" : "";
  return `<span class="hring ${met ? "met" : ""} ${h.skip[d] ? "skipped" : ""} ${burst}" style="--c:${h.color};width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}"><circle class="t" cx="${size / 2}" cy="${size / 2}" r="${r}"/><circle class="p" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - from)}" data-k="${key}" data-f="${f}" data-c="${C}"/></svg>
    <span class="ic">${g(h.skip[d] ? "skip" : h.icon)}</span><i class="sparks"></i></span>`;
}
function streak() {
  const s = doneDays(); let d = today(), n = 0;
  if (!s.has(d)) d = addDays(d, -1);
  while (s.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// ================= natural-language quick add =================
const WD_RE = "(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday|rsday)?";
const WD_IDX = { mon: 0, tue: 1, tues: 1, wed: 2, thu: 3, thur: 3, thurs: 3, fri: 4, sat: 5, sun: 6 };
function parseQuick(text, { list, off = new Set() } = {}) {
  let s = " " + text + " ";
  const r = {};
  const take = (re, fn, kind) => { if (off.has(kind)) return; const m = s.match(re); if (m) { fn(m); s = s.replace(m[0], " "); } };
  const t0 = today();
  take(/\s(!{1,2})\s*$/, () => { r.starred = true; }, "star");
  take(new RegExp(`\\s(?:every|each)\\s+${WD_RE}\\s`, "i"), (m) => { r.repeat = "weekly"; r.date = nextWeekday(t0, WD_IDX[m[1].toLowerCase()]); }, "repeat");
  take(/\s(?:every\s*day|daily)\s/i, () => { r.repeat = "daily"; }, "repeat");
  take(/\s(?:every\s*weekday|weekdays)\s/i, () => { r.repeat = "weekdays"; }, "repeat");
  take(/\s(?:every\s*week|weekly)\s/i, () => { r.repeat = "weekly"; }, "repeat");
  take(/\s(?:every\s*month|monthly)\s/i, () => { r.repeat = "monthly"; }, "repeat");
  take(/\s(?:every\s*year|yearly|annually)\s/i, () => { r.repeat = "yearly"; }, "repeat");
  take(/\s(?:today|tonight)\s/i, (m) => { r.date = t0; if (/tonight/i.test(m[0]) && !r.time) r.time = "19:00"; }, "date");
  take(/\s(?:tomorrow|tmrw|tmr)\s/i, () => { r.date = addDays(t0, 1); }, "date");
  take(/\snext\s+week\s/i, () => { r.date = nextWeekday(t0, 0, false); }, "date");
  take(/\sin\s+(\d{1,2})\s+days?\s/i, (m) => { r.date = addDays(t0, +m[1]); }, "date");
  take(new RegExp(`\\s(?:on\\s+|next\\s+)?${WD_RE}\\s`, "i"), (m) => { r.date = nextWeekday(t0, WD_IDX[m[1].toLowerCase()], !/next/i.test(m[0])); }, "date");
  take(/\s(?:at\s+)?(noon|midnight)\s/i, (m) => { r.time = /noon/i.test(m[1]) ? "12:00" : "00:00"; }, "time");
  take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)\s/i, (m) => { if (+m[1] > 12) return; let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; r.time = `${pad(h)}:${m[2] || "00"}`; }, "time");
  take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\s/, (m) => { r.time = `${pad(+m[1])}:${m[2]}`; }, "time");
  take(/\sat\s+(\d{1,2})\s/i, (m) => { let h = +m[1]; if (h > 23) return; if (h >= 1 && h <= 7) h += 12; r.time = `${pad(h % 24)}:00`; }, "time");
  if (list && list.qty) {
    take(/^\s(\d{1,3})\s*x?\s+(?=\S)/i, (m) => { r.qty = +m[1]; }, "qty");
    take(/\s[x×]\s?(\d{1,3})\s*$/i, (m) => { r.qty = +m[1]; }, "qty");
  }
  r.title = cap(s.replace(/\s+/g, " ").trim());
  if (r.repeat && !r.date) r.date = t0;
  return r;
}
function parsedChips(p) {
  const c = [];
  if (p.date) c.push(["date", g("calendar", "xs") + esc(dayLabel(p.date))]);
  if (p.time) c.push(["time", g("clock", "xs") + esc(fmtTime(p.time))]);
  if (p.repeat) c.push(["repeat", g("repeat", "xs") + esc(REPEATS[p.repeat])]);
  if (p.starred) c.push(["star", g("starFill", "xs") + "Starred"]);
  if (p.qty > 1) c.push(["qty", "×" + p.qty]);
  return c;
}

// ================= toast & confetti =================
let toastTimer;
function toast(msg, action) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  el.hidden = false; el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  if (action) $("button", el).onclick = () => { el.hidden = true; action.fn(); };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, action ? 5000 : 2600);
}
function confetti() {
  if (reduceMotion.matches) return;
  const c = document.createElement("canvas"); c.id = "confetti"; document.body.appendChild(c);
  const dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr; const x = c.getContext("2d"); x.scale(dpr, dpr);
  const cols = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#32ade6", "#5856d6", "#ff2d55"];
  const ps = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * 80, y: H * .62, vx: (Math.random() - .5) * 13, vy: -(Math.random() * 13 + 8), r: Math.random() * 6.28, vr: (Math.random() - .5) * .35, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0] }));
  const t0 = performance.now();
  const step = (t) => {
    const k = (t - t0) / 1000; x.clearRect(0, 0, W, H);
    ps.forEach((p) => { p.vy += .42; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - k / 2.2); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); x.restore(); });
    k < 2.3 ? requestAnimationFrame(step) : c.remove();
  };
  requestAnimationFrame(step); haptic([12, 40, 12]);
}

// ================= springs =================
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

// ================= routing =================
const S = { route: { name: "lists" }, editing: false, newIds: new Set(), q: "", rings: {}, pop: null, tab: null };
const appEl = $("#app");
function parseHash() {
  const h = location.hash.replace(/^#\/?/, "").split("/");
  if (h[0] === "day") return { name: "day", day: validDay(h[1]) ? h[1] : today() };
  if (h[0] === "today") return { name: "day", day: today() };
  if (h[0] === "list" && h[1]) return { name: "list", id: h[1] };
  if (["starred", "planned", "all", "templates", "settings", "search", "habits"].includes(h[0])) return { name: h[0] };
  return { name: "lists" };
}
const DEPTH = { lists: 0, templates: 0, search: 0, day: 0, habits: 0, settings: 1, list: 1, starred: 1, planned: 1, all: 1 };
function go(hash, replace = false) { if (location.hash === hash) { render(""); return; } replace ? location.replace(hash) : (location.hash = hash); }
window.addEventListener("hashchange", () => {
  const prev = S.route; S.route = parseHash(); S.editing = false;
  const TABS = ["day", "habits", "lists", "templates", "search"];
  const ti = (n) => TABS.indexOf(n === "day" || n === "habits" || n === "templates" || n === "search" ? n : "lists");
  const a = prev.name === "day" && S.route.name === "day" ? (S.route.day > prev.day ? "push" : S.route.day < prev.day ? "pop" : "fade-in")
    : DEPTH[S.route.name] > DEPTH[prev.name] ? "push" : DEPTH[S.route.name] < DEPTH[prev.name] ? "pop"
    : ti(S.route.name) !== ti(prev.name) ? (ti(S.route.name) > ti(prev.name) ? "tab-r" : "tab-l") : "fade-in";
  closeAllSheets(); closeMenu();
  const show = (x) => { render(x); window.scrollTo(0, 0); };
  if (document.startViewTransition && !reduceMotion.matches && a !== "fade-in") { // a real cross-slide between pages where the browser can do it
    const root = document.documentElement; root.dataset.vt = a;
    try { const vt = document.startViewTransition(() => show("enter")); vt.finished.finally(() => { if (root.dataset.vt === a) delete root.dataset.vt; }); }
    catch { delete root.dataset.vt; show(a); }
  } else show(a);
});
function applyTheme() {
  const t = (D && D.profile.theme) || "auto";
  const dark = t === "dark" || (t === "auto" && darkMQ.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $$('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#000000" : "#f2f2f7"));
}
darkMQ.addEventListener("change", applyTheme);

// ================= render =================
function render(anim = "fade-in") {
  applyTheme();
  const layers = takeLayers(appEl, $("#sidebar"));
  if (!D) { $("#sidebar").innerHTML = ""; renderWelcome(); return; }
  const r = S.route;
  if (r.name === "day") renderDay(r.day, anim);
  else if (r.name === "list") { const l = listById(r.id); l ? renderList(l, anim) : go("#/", true); }
  else if (["starred", "planned", "all"].includes(r.name)) renderSmart(r.name, anim);
  else if (r.name === "templates") renderTemplates(anim);
  else if (r.name === "settings") renderSettings(anim);
  else if (r.name === "search") renderSearch(anim);
  else if (r.name === "habits") renderHabits(anim);
  else renderLists(anim);
  renderSidebar();
  giveLayers(layers, appEl, $("#sidebar"));
  animateRings(appEl); S.pop = null;
}
function tabbar() {
  const n = S.route.name;
  const cur = ["day", "habits", "templates", "search"].includes(n) ? n : "lists";
  const bounce = S.tab && S.tab !== cur; S.tab = cur;
  const b = (id, href, icon, label) => `<button type="button" data-go="${href}" class="${cur === id ? "on" : ""} ${cur === id && bounce ? "bounce" : ""}" aria-current="${cur === id ? "page" : "false"}">${g(icon)}<span>${label}</span></button>`;
  return `<nav class="tabbar" aria-label="Tabs">${b("day", "#/today", "tabDay", "My Day")}${b("habits", "#/habits", "tabHabits", "Habits")}${b("lists", "#/", "tabLists", "Lists")}${b("templates", "#/templates", "tabTpl", "Templates")}${b("search", "#/search", "tabSearch", "Search")}</nav>`;
}
function bindCommon() {
  $$("[data-go]", appEl).forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); const h = b.dataset.go; go(h === "#/today" ? `#/day/${today()}` : h); }));
  const nav = $(".navbar"), par = heroParallax();
  window.onscroll = () => { if (nav) nav.classList.toggle("scrolled", window.scrollY > 20); if (par) par(); };
  if (nav) nav.classList.toggle("scrolled", window.scrollY > 20);
}
const counts = (items) => { const open = items.filter((i) => !i.done).length; return { open, done: items.length - open, total: items.length }; };
function ringSvg(done, total, key = "ring") {
  const r = 21, C = 2 * Math.PI * r, f = total ? done / total : 0, from = S.rings[key] ?? 0;
  return `<div class="ring" role="img" aria-label="${done} of ${total} done"><svg viewBox="0 0 52 52"><circle class="t" cx="26" cy="26" r="${r}"/><circle class="p" cx="26" cy="26" r="${r}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - from)}" data-k="${key}" data-f="${f}" data-c="${C}"/></svg><span data-countto="${Math.round(f * 100)}" data-from="${Math.round(from * 100)}" data-suffix="%">${Math.round(from * 100)}%</span></div>`;
}
// ---------- motion helpers ----------
function animateRings(root = document) { // rings and numbers ease from their last value to the new one
  const els = $$("circle[data-k]", root);
  els.forEach((c) => { S.rings[c.dataset.k] = +c.dataset.f; });
  const go2 = () => {
    els.forEach((c) => { c.style.strokeDashoffset = String(+c.dataset.c * (1 - +c.dataset.f)); });
    $$("[data-countto]", root).forEach((el) => countUp(el, +el.dataset.from || 0, +el.dataset.countto, el.dataset.suffix || ""));
  };
  reduceMotion.matches ? go2() : requestAnimationFrame(() => requestAnimationFrame(go2));
}
function countUp(el, from, to, suffix = "") {
  if (from === to || reduceMotion.matches) { el.textContent = to + suffix; return; }
  const t0 = performance.now(), dur = 650;
  const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e) + suffix; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function heroParallax() { // the picture drifts a little slower than the page
  const hero = $(".hero", appEl); if (!hero || reduceMotion.matches) return;
  const set = () => { const y = Math.min(window.scrollY, 300); hero.style.setProperty("--py", `${(y * 0.18).toFixed(1)}px`); };
  set(); return set;
}
const initials = (n) => (n || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const avatar = (cls = "", style = "") => `<span class="avatar wall ${cls}" style="${wallStyle(D.profile.todayImage)};${style}">${esc(initials(D.profile.name))}</span>`;
const SMART = {
  day: { name: "My Day", icon: "sun", color: "#ff9500" },
  starred: { name: "Starred", icon: "starFill", color: "#ff9500", image: "ventura-light" },
  planned: { name: "Planned", icon: "calendar", color: "#ff3b30", image: "monterey-light" },
  all: { name: "All", icon: "tray", color: "#5856d6", image: "big-sur" },
};
function plannedItems() { const t = today(); return D.items.filter((i) => !i.done && ((i.list === "day" && i.day >= t) || (i.list !== "day" && i.due))).sort((a, b) => (dateOf(a) > dateOf(b) ? 1 : -1)); }
function smartCount(k) {
  if (k === "day") return counts(myDayItems(today())).open;
  if (k === "starred") return D.items.filter((i) => i.starred && !i.done).length;
  if (k === "planned") return plannedItems().length;
  return D.items.filter((i) => !i.done).length;
}
const inlineMore = () => g("more", "xs inline");

// ---------- sidebar (desktop) ----------
function renderSidebar() {
  const sb = $("#sidebar"), r = S.route, t = today();
  const on = (c) => (c ? "on" : "");
  const sm = (k, href, active) => `<button class="sb-item ${on(active)}" data-go="${href}">${lic(SMART[k].icon, SMART[k].color)}${SMART[k].name}<span class="n">${smartCount(k) || ""}</span></button>`;
  sb.innerHTML = `<button class="sb-head" data-go="#/settings" style="text-align:left">${avatar()}<div><b>${esc(D.profile.name)}</b><small>${esc(weekdayName(t))}, ${esc(longDate(t))}</small></div></button>
    ${sm("day", "#/today", r.name === "day" && r.day === t)}${sm("starred", "#/starred", r.name === "starred")}${sm("planned", "#/planned", r.name === "planned")}${sm("all", "#/all", r.name === "all")}
    <button class="sb-item ${on(r.name === "habits")}" data-go="#/habits">${lic("target", "#ff2d55")}Habits<span class="n">${habitsLeft(t) || ""}</span></button>
    <button class="sb-item ${on(r.name === "search")}" data-go="#/search">${lic("search", "#8e8e93")}Search</button>
    <div class="sb-sep"></div><div class="sb-label">My Lists</div>
    ${D.lists.map((l) => `<button class="sb-item ${on(r.name === "list" && r.id === l.id)}" data-go="#/list/${l.id}">${lic(l.icon, l.color)}${esc(l.name)}<span class="n">${counts(listItems(l.id)).open || ""}</span></button>`).join("")}
    <button class="sb-item" id="sbNew" style="color:var(--accent)">${g("plus")}New List</button>
    <div class="sb-sep"></div>
    <button class="sb-item ${on(r.name === "templates")}" data-go="#/templates">${lic("stack", "#5856d6")}Templates<span class="n">${D.templates.length || ""}</span></button>
    <button class="sb-item ${on(r.name === "settings")}" data-go="#/settings">${lic("gear", "#8e8e93")}Profile & Settings</button>`;
  $$("[data-go]", sb).forEach((b) => b.onclick = () => { const h = b.dataset.go; go(h === "#/today" ? `#/day/${t}` : h); });
  $("#sbNew").onclick = () => editList(null);
}

// ================= Lists (home) =================
function listCard(l) {
  const c = counts(listItems(l.id)), pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
  const rule = D.rules.find((r) => r.list === l.id && r.on !== false);
  return `<button type="button" class="icard wall" style="${wallStyle(l.image)}" data-go="#/list/${l.id}" aria-label="${esc(l.name)}, ${c.open} open">
    ${lic(l.icon, l.color)}${c.open ? `<span class="num">${c.open}</span>` : ""}
    <span class="txt"><div class="name">${esc(l.name)}</div><div class="meta">${rule ? g("repeat", "xs") : ""}${c.total ? `${c.done} of ${c.total} done` : "Empty"}</div><div class="bar"><i style="width:${pct}%"></i></div></span></button>`;
}
function renderLists(anim) {
  const view = D.profile.homeView || "cards";
  const tile = (k, href) => { const n = smartCount(k); return `<button type="button" class="tile" data-go="${href}">${lic(SMART[k].icon, SMART[k].color, "md")}<span class="n" ${anim && n ? `data-countto="${n}" data-from="0"` : ""}>${anim && n ? 0 : n}</span><span class="l">${SMART[k].name}</span></button>`; };
  appEl.innerHTML = `<div class="page nobar ${anim}">
    <div class="navbar"><div class="side"></div><div class="mid">Lists</div><div class="side r">
      <button type="button" class="nb" id="viewBtn" aria-label="${view === "cards" ? "Show as rows" : "Show as cards"}">${g(view === "cards" ? "rows" : "grid")}</button>
      <button type="button" class="nb" id="newList" aria-label="New list">${g("plus")}</button></div></div>
    <button type="button" class="who" data-go="#/settings" aria-label="Profile">${avatar()}<b>${esc(D.profile.name)}</b></button>
    <div class="tiles stagger">${tile("day", "#/today")}${tile("starred", "#/starred")}${tile("planned", "#/planned")}${tile("all", "#/all")}</div>
    <div class="sh"><h2>My Lists</h2></div>
    ${view === "cards" ? `<div class="cards stagger">${D.lists.map(listCard).join("")}<button type="button" class="icard add" id="newList2"><div>${g("plusCircle", "l")}New List</div></button></div>`
      : `<div class="group ic">${D.lists.map((l) => `<button type="button" class="cell" data-go="#/list/${l.id}">${lic(l.icon, l.color)}<span class="grow t">${esc(l.name)}</span><span class="count">${counts(listItems(l.id)).open || ""}</span>${g("chevR", "chev")}</button>`).join("")}
         <button type="button" class="cell" id="newList2"><span class="lic" style="--c:var(--fill);color:var(--accent)">${g("plus")}</span><span class="grow blue">New List</span></button></div>`}
    ${D.templates.length ? `<div class="sh"><h2>Templates</h2><button type="button" data-go="#/templates">See All</button></div>
      <div class="hs">${D.templates.map((t) => `<button type="button" class="icard wall" style="${wallStyle(t.image)}" data-tpl="${t.id}">${lic(t.icon, t.color)}<span class="txt"><div class="name">${esc(t.name)}</div><div class="meta">${plural(t.items.length, "item")}</div></span></button>`).join("")}</div>` : ""}
  </div>${tabbar()}`;
  bindCommon();
  $("#newList").onclick = $("#newList2").onclick = () => editList(null);
  $("#viewBtn").onclick = () => { D.profile.homeView = view === "cards" ? "rows" : "cards"; save(); render(""); };
  $$("[data-tpl]").forEach((b) => b.onclick = () => templateMenu(b, tplById(b.dataset.tpl)));
}

// ================= My Day =================
const sortDay = (a, b) => (b.starred - a.starred) || ((a.time || "99") < (b.time || "99") ? -1 : (a.time || "99") > (b.time || "99") ? 1 : 0) || (a.pos - b.pos);
function renderDay(day, anim) {
  const t = today(), rel = relDay(day);
  const items = myDayItems(day);
  const open = items.filter((i) => !i.done).sort(S.editing ? (a, b) => a.pos - b.pos : sortDay);
  const done = items.filter((i) => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const due = dueOn(day), late = day === t && !S.editing ? overdue(t) : [];
  const sug = day >= t && !S.editing ? suggestionsFor(day) : [];
  const applied = D.applied.filter((a) => a.key === `day:${day}`);
  const c = counts(items), st = streak();
  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar"><div class="side">${day !== t ? `<button type="button" class="nb" id="goToday">${g("chevL")}Today</button>` : ""}</div><div class="mid">${esc(rel || weekdayName(day))}</div>
      <div class="side r">${items.length ? `<button type="button" class="nb ${S.editing ? "b" : ""}" id="edit">${S.editing ? "Done" : "Edit"}</button>` : ""}<button type="button" class="nb" id="more" aria-label="More">${g("more")}</button></div></div>
    <div class="hero wall" style="${wallStyle(D.profile.todayImage, false)}" id="hero">
      <div class="top"><div class="gbtns"><span class="gpill glass">${g("sun", "s")} My Day</span>${st >= 1 ? `<span class="gpill glass flame" title="Days in a row with something done">${g("flame", "s")} ${st}</span>` : ""}</div>
        <div class="gbtns"><button type="button" class="gbtn glass" id="prev" aria-label="Previous day">${g("chevL")}</button><button type="button" class="gbtn glass" id="next" aria-label="Next day">${g("chevR")}</button></div></div>
      <div class="bot"><label class="datepick"><h1>${esc(weekdayName(day))}</h1><div class="sub">${esc(longDate(day))}${rel ? ` <span class="gpill glass">${rel}</span>` : ""}</div><input type="date" id="pick" value="${day}" aria-label="Pick a date"></label>${c.total ? ringSvg(c.done, c.total, `day:${day}`) : ""}</div>
    </div>
    ${applied.length ? `<div class="chips">${applied.map((a) => { const tp = tplById(a.tpl); return `<span class="chip">${licSm(tp ? tp.icon : "stack", tp ? tp.color : "#8e8e93", 20)}${esc(a.name)}<button type="button" class="x" data-unapply="${a.id}" aria-label="Remove ${esc(a.name)}">${g("x")}</button></span>`; }).join("")}</div>` : ""}
    ${sug.length ? suggestCard(day, sug) : ""}
    ${S.editing ? "" : habitStrip(day)}
    ${late.length ? `<div class="gh late">${g("clock", "s")} Earlier <span class="c">${late.length}</span><span style="flex:1"></span><button type="button" class="nb" id="carry" style="font-weight:600;font-size:15px;min-height:30px">Move to Today</button></div><div class="tasks">${late.map((i) => taskRow(i, { src: true })).join("")}</div>` : ""}
    ${(late.length || due.length) && open.length ? `<div class="gh">${esc(rel || weekdayName(day))} <span class="c">${open.length}</span></div>` : ""}
    <div class="tasks ${S.editing ? "editing" : ""}" style="${late.length || due.length ? "" : "margin-top:14px"}">${open.map((i) => taskRow(i, { src: i.list !== "day" })).join("")}</div>
    ${due.length && !S.editing ? `<div class="gh">${g("calendar", "s")} Due from your lists <span class="c">${due.length}</span></div><div class="tasks">${due.sort((a, b) => a.done - b.done).map((i) => taskRow(i, { src: true, noDate: true })).join("")}</div>` : ""}
    ${!open.length && !done.length && !sug.length && !late.length && !due.length ? `<div class="empty">${lic("sun", "#ff9500")}<b>Focus on your day</b>Add a task, or open ${inlineMore()} for suggestions.<br>Try typing “Gym tomorrow 7am”.</div>`
      : !open.length && done.length && !due.some((i) => !i.done) && !late.length ? `<div class="empty">${lic("check", "#34c759")}<b>All done${rel === "Today" ? " for today" : ""}</b>${st > 1 ? `That's ${st} days in a row.` : "Nice work."}</div>` : ""}
    ${doneSection(done, D.profile.showDone !== false)}
  </div>
  ${S.editing ? "" : `<div class="addbar"><button type="button" class="addbtn" id="add">${g("plus")} Add a Task</button></div>`}${tabbar()}`;
  S.newIds.clear(); bindCommon(); bindDone(); bindRows(); bindHabits();
  const nav = (n) => go(`#/day/${addDays(day, n)}`);
  $("#prev").onclick = () => nav(-1); $("#next").onclick = () => nav(1);
  $("#goToday") && ($("#goToday").onclick = () => go(`#/day/${t}`));
  $("#pick").onchange = (e) => validDay(e.target.value) && go(`#/day/${e.target.value}`);
  $("#edit") && ($("#edit").onclick = () => { S.editing = !S.editing; render(""); });
  $("#more").onclick = (e) => dayMenu(e.currentTarget, day);
  $("#add") && ($("#add").onclick = () => openComposer({ kind: "day", day }));
  $("#carry") && ($("#carry").onclick = () => {
    const moved = overdue(t);
    moved.forEach((i) => { if (i.list === "day") i.day = t; else i.myDay = t; i.pos = nextPos(); S.newIds.add(i.id); });
    save(); render(""); toast(`Moved ${plural(moved.length, "task")} to today`);
  });
  $$("[data-unapply]").forEach((b) => b.onclick = () => askUnapply(b.dataset.unapply));
  bindSuggest(day); swipeHero($("#hero"), nav);
}
function suggestCard(day, sug) {
  return `<div class="suggest"><p>${g("sparkles", "s")}${esc(sug.length > 1 ? `It's ${weekdayName(day)}. Which plan?` : `Your ${weekdayName(day)} template`)}</p><div class="choices">${sug.map((s) =>
    `<button type="button" class="tcard wall" style="${wallStyle(s.image)}" data-apply="${s.id}">${lic(s.icon, s.color)}<b>${esc(s.name)}</b><small>${plural(s.items.length, "item")} · tap to add</small></button>`).join("")}</div></div>`;
}
function bindSuggest(day) {
  $$("[data-apply]").forEach((b) => b.onclick = () => {
    const t = tplById(b.dataset.apply), { a, added } = applyTemplate(t, `day:${day}`);
    haptic(12); D.items.filter((i) => i.from === a.id).forEach((i) => S.newIds.add(i.id));
    S.route.name === "day" ? render("") : go(`#/day/${day}`);
    toast(added ? `Added ${plural(added, "task")} from ${t.name}` : "Those are already on the list", { label: "Undo", fn: () => { unapply(a.id); render(""); } });
  });
}
function doneSection(done, show) {
  if (!done.length) return "";
  return `<button type="button" class="disc ${show ? "" : "closed"}" id="toggleDone" aria-expanded="${show}">${g("chevD")} Completed <span class="c">${done.length}</span></button>
    ${show ? `<div class="tasks">${done.map((i) => taskRow(i, { src: S.route.name !== "list" && i.list !== "day" })).join("")}</div>` : ""}`;
}
function bindDone() {
  const b = $("#toggleDone"); if (!b) return;
  b.onclick = () => { const l = S.route.name === "list" && listById(S.route.id); if (l) l.showDone = l.showDone === false; else D.profile.showDone = D.profile.showDone === false; save(); render(""); };
}
function askUnapply(aid) {
  const a = D.applied.find((x) => x.id === aid); if (!a) return;
  const n = D.items.filter((i) => i.from === aid && !i.done).length;
  actionSheet({ title: `Remove “${a.name}”? ${n ? `Its ${plural(n, "unfinished item")} will be removed.` : ""} Ticked-off items stay.`, actions: [{ label: "Remove Template", red: true, fn: () => { unapply(aid); render(""); } }] });
}
function dayMenu(anchor, day) {
  const items = myDayItems(day), open = items.filter((i) => !i.done);
  menu(anchor, [
    { label: "Suggestions", icon: "bulb", fn: () => suggestionsSheet(day) },
    ...(open.length > 1 ? [{ label: "Pick One for Me", icon: "dice", fn: pickForMe }] : []),
    { sep: true },
    { label: "Add From a Template", icon: "stack", fn: () => pickTemplate(`day:${day}`) },
    ...(items.length ? [{ label: "Save as Template", icon: "copy", fn: () => editTemplate({ id: null, name: `${weekdayName(day)} plan`, icon: "sun", color: "#ff9500", image: wallKey(D.profile.todayImage), target: "day", days: [monIndex(day)], items: items.map((i) => ({ title: i.title, time: i.time, notes: i.notes })) }) }] : []),
    ...(open.length ? [{ label: `Move Unfinished to ${day === today() ? "Tomorrow" : "Next Day"}`, icon: "calTomorrow", fn: () => {
      open.forEach((i) => { if (i.list === "day") i.day = addDays(day, 1); else i.myDay = addDays(day, 1); }); save(); render(""); toast(`Moved ${plural(open.length, "task")} to ${dayLabel(addDays(day, 1))}`);
    } }] : []),
    { sep: true },
    { label: "Change Theme", icon: "photo", fn: () => pickImage(D.profile.todayImage, (k) => { D.profile.todayImage = k; save(); render(""); }, true) },
    { label: "Print", icon: "printer", fn: () => window.print() },
    ...(items.some((i) => i.done) ? [{ label: "Clear Completed", icon: "trash", red: true, fn: () => {
      const gone = items.filter((i) => i.done && i.list === "day"); items.filter((i) => i.done && i.list !== "day").forEach((i) => delete i.myDay);
      D.items = D.items.filter((i) => !gone.includes(i)); save(); render("");
    } }] : []),
  ]);
}
function pickForMe() {
  const open = myDayItems(S.route.day || today()).filter((i) => !i.done);
  if (!open.length) return;
  const it = open[(Math.random() * open.length) | 0];
  const el = $(`.rw[data-id="${it.id}"] .row`);
  if (el) { el.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" }); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
  haptic([6, 30, 6]); toast(`How about: ${it.title}`);
}
function suggestionsSheet(day) {
  const t = today();
  const pool = D.items.filter((i) => i.list !== "day" && !i.done && i.myDay !== day);
  const groups = [
    ["Overdue", pool.filter((i) => i.due && i.due < t)],
    ["Due today", pool.filter((i) => i.due === t)],
    ["Coming up", pool.filter((i) => i.due && i.due > t && i.due <= addDays(t, 3))],
    ["Starred", pool.filter((i) => i.starred && !(i.due && i.due <= addDays(t, 3)))],
    ["Recently added", pool.filter((i) => !i.starred && !i.due && Date.now() - (i.created || 0) < 3 * 864e5).slice(-6)],
  ].filter(([, a]) => a.length);
  const sheet = openSheet({
    title: "Suggestions", right: { label: "Done", bold: true },
    html: groups.length ? groups.map(([h, a]) => `<div class="sh sm"><h2>${h}</h2></div><div class="group">${a.map((i) => { const l = listById(i.list) || {};
      return `<div class="cell"><span class="grow"><div class="t">${esc(i.title)}</div><div class="sub">${esc(l.name || "")}${i.due ? ` · ${esc(dayLabel(i.due))}` : ""}</div></span><button type="button" class="nb" data-add="${i.id}" aria-label="Add ${esc(i.title)} to My Day">${g("plusCircle")}</button></div>`; }).join("")}</div>`).join("")
      : `<div class="empty">${lic("bulb", "#ffcc00")}<b>No suggestions right now</b>Items with due dates or stars from your lists show up here.</div>`,
  });
  $$("[data-add]", sheet.el).forEach((b) => b.onclick = () => {
    const it = itemById(b.dataset.add); it.myDay = day; save(); S.newIds.add(it.id);
    const cell = b.closest(".cell"); cell.style.transition = "opacity .25s"; cell.style.opacity = ".4"; b.innerHTML = g("check"); b.disabled = true; haptic(8); render("");
  });
}

// ================= Habits =================
const habitsFor = (day) => activeHabits().filter((h) => habitDueOn(h, day) || hVal(h, day) > 0 || h.skip[day]);
const habitsLeft = (day) => habitsFor(day).filter((h) => !hMet(h, day) && !h.skip[day]).length;
function habitStrip(day) {
  if (day > today()) return "";
  const hs = habitsFor(day);
  if (!hs.length) return D.habits.length || day !== today() ? "" : `<button type="button" class="hpromo" id="hPromo">${lic("target", "#ff2d55")}<span class="grow"><b>Track a habit</b><small>Gym, reading, coding, meals, chores: one tap a day.</small></span>${g("chevR", "chev")}</button>`;
  const done = hs.filter((h) => hMet(h, day)).length;
  return `<div class="sh sm hhead"><h2>Habits · ${done} of ${hs.length}</h2><button type="button" data-go="#/habits">See All</button></div>
    <div class="hstrip stagger">${hs.map((h) => `<button type="button" class="hchip" data-h="${h.id}" data-d="${day}" aria-label="${esc(h.name)}: ${hVal(h, day)} of ${h.target}">${hRing(h, day, 60)}<b>${esc(h.name)}</b><small>${h.skip[day] ? "Skipped" : isCheckH(h) ? (hMet(h, day) ? "Done" : esc(schedText(h))) : `${hVal(h, day)}/${h.target}${isAmountH(h) ? " " + esc(h.unit) : ""}`}</small></button>`).join("")}</div>`;
}
function habitRow(h, week) {
  const t = today(), st = hStreak(h), wk = h.sched.type === "weekly";
  const meta = [];
  if (st) meta.push(`<span class="hot">${g("flame", "xs")} ${st} ${wk ? (st === 1 ? "week" : "weeks") : st === 1 ? "day" : "days"}</span>`);
  if (!isCheckH(h)) meta.push(`<span>${hVal(h, t)} / ${h.target} ${esc(unitText(h, h.target))}</span>`);
  meta.push(`<span>${wk ? `${weekDone(h, t)} of ${h.sched.times} this week` : esc(schedText(h))}</span>`);
  return `<div class="hrow ${S.newIds.has(h.id) ? "row-in" : ""}" style="--c:${h.color}">
    <button type="button" class="hbtn" data-h="${h.id}" data-d="${t}" aria-label="Log ${esc(h.name)}">${hRing(h, t, 52)}</button>
    <button type="button" class="hbody" data-hopen="${h.id}"><b>${esc(h.name)}</b><div class="meta">${meta.join("")}</div></button>
    <div class="hweek">${week.map((d) => {
      const f = hFrac(h, d), cls = [d > t ? "fut" : "", d === t ? "now" : "", hMet(h, d) ? "met" : "", h.skip[d] ? "sk" : "", !scheduledOn(h, d) && d <= t ? "off" : ""].join(" ");
      return `<button type="button" class="wd ${cls}" data-h="${h.id}" data-d="${d}" style="--f:${f}" ${d > t || d < h.created ? "disabled" : ""} aria-label="${esc(weekdayName(d))}"><span>${DAY_LETTERS[monIndex(d)]}</span><i>${hMet(h, d) ? g("check") : ""}</i></button>`;
    }).join("")}</div></div>`;
}
function renderHabits(anim) {
  const t = today(), hs = activeHabits(), due = habitsFor(t), done = due.filter((h) => hMet(h, t)).length;
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart(t), i));
  const best = hs.reduce((m, h) => Math.max(m, hStreak(h)), 0);
  const groups = TOD_ORDER.map((k) => [k, hs.filter((h) => (h.tod || "any") === k)]).filter(([, a]) => a.length);
  const archived = (D.habits || []).filter((h) => h.archived);
  const img = D.profile.habitsImage || "aurora";
  appEl.innerHTML = `<div class="page nobar ${anim}">
    <div class="navbar"><div class="side"></div><div class="mid">Habits</div><div class="side r"><button type="button" class="nb" id="newHabit" aria-label="New habit">${g("plus")}</button></div></div>
    <div class="hero wall" style="${wallStyle(img, false)}">
      <div class="top"><div class="gbtns"><span class="gpill glass">${g("target", "s")} Habits</span>${best ? `<span class="gpill glass flame">${g("flame", "s")} ${best}</span>` : ""}</div>
        <button type="button" class="gbtn glass" id="hTheme" aria-label="Change theme">${g("photo")}</button></div>
      <div class="bot"><div><h1>${hs.length ? (due.length && done === due.length ? "All done" : "Today") : "Habits"}</h1><div class="sub">${hs.length ? (due.length ? `${done} of ${plural(due.length, "habit")} done · ${esc(weekdayName(t))}` : "Nothing due today. Enjoy it.") : "Small things, every day"}</div></div>${due.length ? ringSvg(done, due.length, "habits") : ""}</div>
    </div>
    ${hs.length ? groups.map(([k, a]) => `<div class="gh">${esc(TOD[k])} <span class="c">${a.length}</span></div><div class="habits stagger">${a.map((h) => habitRow(h, week)).join("")}</div>`).join("")
      : `<div class="empty">${lic("target", "#ff2d55")}<b>Build a habit</b>Pick one to start. You can change the goal and days.</div>`}
    ${hs.length ? `<p class="foot">Tap a ring to log it, or a day to fill it in later. Press and hold for details, skips and history.</p>` : ""}
    <div class="sh sm"><h2>${hs.length ? "Add another" : "Popular habits"}</h2></div>
    <div class="presets stagger">${HABIT_PRESETS.filter((p) => !hs.some((h) => h.name === p.name)).map((p) => `<button type="button" data-preset="${HABIT_PRESETS.indexOf(p)}">${licSm(p.icon, p.color, 26)}<span><b>${esc(p.name)}</b><small>${esc(schedText(p))}${goalText(p) ? " · " + esc(goalText(p)) : ""}</small></span></button>`).join("")}
      <button type="button" data-preset="-1">${licSm("plus", "#8e8e93", 26)}<span><b>Your own</b><small>Anything you want to repeat</small></span></button></div>
    ${archived.length ? `<button type="button" class="disc ${S.showArch ? "" : "closed"}" id="toggleArch">${g("chevD")} Archived <span class="c">${archived.length}</span></button>
      ${S.showArch ? `<div class="group ic">${archived.map((h) => `<button type="button" class="cell" data-hopen="${h.id}">${lic(h.icon, h.color)}<span class="grow">${esc(h.name)}</span>${g("chevR", "chev")}</button>`).join("")}</div>` : ""}` : ""}
  </div>${tabbar()}`;
  S.newIds.clear(); bindCommon(); bindHabits();
  $("#newHabit").onclick = () => editHabit(null);
  $("#hTheme").onclick = () => pickImage(img, (k) => { D.profile.habitsImage = k; save(); render(""); });
  $$("[data-preset]").forEach((b) => b.onclick = () => editHabit(+b.dataset.preset >= 0 ? HABIT_PRESETS[+b.dataset.preset] : null));
  $("#toggleArch") && ($("#toggleArch").onclick = () => { S.showArch = !S.showArch; render(""); });
}
function bindHabits(root = appEl) {
  $$("[data-h]", root).forEach((b) => {
    let timer, long = false;
    b.addEventListener("pointerdown", () => { long = false; clearTimeout(timer); timer = setTimeout(() => { long = true; haptic(14); const h = habitById(b.dataset.h); h && habitSheet(h, b.dataset.d); }, 480); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, () => clearTimeout(timer)));
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    b.addEventListener("click", () => { if (long) { long = false; return; } const h = habitById(b.dataset.h); h && nudgeHabit(h, b.dataset.d, b); });
  });
  $$("[data-hopen]", root).forEach((b) => b.onclick = () => { const h = habitById(b.dataset.hopen); h && habitSheet(h, today()); });
  $("#hPromo", root) && ($("#hPromo", root).onclick = () => go("#/habits"));
}
function heatmap(h, sel, enter) {
  const t = today(), start = addDays(weekStart(t), -7 * 19), cells = [];
  for (let i = 0; i < 140; i++) {
    const d = addDays(start, i), f = hFrac(h, d), pct = f >= 1 ? 100 : f > 0 ? Math.round(30 + f * 50) : 0;
    const cls = [d > t ? "fut" : "", d < h.created ? "pre" : "", d === t ? "now" : "", d === sel ? "sel" : "", h.skip[d] ? "sk" : ""].join(" ");
    cells.push(`<button type="button" class="${cls}" data-day="${d}" style="--col:${Math.floor(i / 7)}${pct ? `;background:color-mix(in srgb, ${h.color} ${pct}%, var(--fill))` : ""}" ${d > t ? "disabled" : ""} aria-label="${esc(shortDate(d))}${hVal(h, d) ? `: ${hVal(h, d)}` : ""}"></button>`);
  }
  const months = []; for (let c = 0; c < 20; c++) { const d = addDays(start, c * 7); const p = parseDay(d); months.push(p.getDate() <= 7 ? p.toLocaleDateString("en-CA", { month: "short" }) : ""); }
  return `<div class="heatwrap"><div class="months">${months.map((m) => `<span>${m}</span>`).join("")}</div><div class="heat ${enter ? "enter" : ""}">${cells.join("")}</div></div>`;
}
function habitSheet(h, day) {
  let sel = !day || day > today() ? today() : day, first = true;
  const draw = () => {
    const v = hVal(h, sel), wk = h.sched.type === "weekly", st = hStreak(h);
    return `<div class="hhero" style="--c:${h.color}"><button type="button" class="hbtn" data-h="${h.id}" data-d="${today()}" aria-label="Log today">${hRing(h, today(), 72)}</button>
        <div><b>${esc(h.name)}</b><small>${esc(schedText(h))}${goalText(h) ? ` · ${esc(goalText(h))}` : ""} · ${esc(TOD[h.tod || "any"])}</small></div></div>
      <div class="group"><div class="statrow four"><div><b>${st}</b><span>${wk ? "week" : "day"} streak</span></div><div><b>${hBest(h)}</b><span>best</span></div><div><b data-countto="${hStrength(h)}" data-from="0" data-suffix="%">0%</b><span>strength</span></div><div><b>${hTotal(h)}</b><span>days done</span></div></div></div>
      <p class="foot">Strength rises each time you check in and eases down after a miss, so one off day doesn't wipe out your progress.</p>
      <div class="sh sm"><h2>Last 20 weeks</h2></div>
      <div class="group" style="--c:${h.color}">${heatmap(h, sel, first)}</div>
      <div class="sh sm"><h2>${esc(relDay(sel) || shortDate(sel))}</h2></div>
      <div class="group ic">
        ${isCheckH(h) ? `<label class="cell tap"><span class="lic sq" style="--c:${h.color}">${g("check")}</span><span class="grow">Done</span><span class="switch"><input type="checkbox" id="hsDone" ${hMet(h, sel) ? "checked" : ""}><span></span></span></label>`
          : `<div class="cell"><span class="lic sq" style="--c:${h.color}">${g(h.icon)}</span><span class="grow">${esc(cap(unitText(h, 2)))}<div class="sub">Goal: ${h.target}</div></span><span class="stepper"><button type="button" id="hsM" aria-label="Less">−</button><i></i><span id="hsV">${v}</span><i></i><button type="button" id="hsP" aria-label="More">+</button></span></div>`}
        <label class="cell tap"><span class="lic sq" style="--c:#8e8e93">${g("skip")}</span><span class="grow">Skip this day<div class="sub">A rest day: your streak stays safe</div></span><span class="switch"><input type="checkbox" id="hsSkip" ${h.skip[sel] ? "checked" : ""}><span></span></span></label>
      </div>
      <div class="group" style="margin-top:22px">
        <button type="button" class="cell" id="hsEdit"><span class="grow blue">Edit Habit</span><span class="blue">${g("pencil", "s")}</span></button>
        <button type="button" class="cell" id="hsArch"><span class="grow blue">${h.archived ? "Restore" : "Archive"}</span><span class="blue">${g("archive", "s")}</span></button>
        <button type="button" class="cell red" id="hsDel"><span class="grow">Delete Habit</span>${g("trash", "s")}</button></div>
      <p class="foot">Started ${esc(longDate(h.created))}.</p>`;
  };
  const sheet = openSheet({ title: h.name, right: { label: "Done", bold: true }, html: draw() });
  const refresh = () => { if (!habitById(h.id)) return; const sc = $(".scroll", sheet.el), top = sc.scrollTop; sc.innerHTML = draw(); sc.scrollTop = top; $("h3", sheet.el).textContent = h.name; bind(); animateRings(sheet.el); };
  const bind = () => {
    const el = sheet.el;
    bindHabits(el);
    $$(".heat [data-day]", el).forEach((b) => b.onclick = () => { sel = b.dataset.day; haptic(4); refresh(); });
    const step = h.target >= 20 ? 5 : 1;
    $("#hsDone", el) && ($("#hsDone", el).onchange = (e) => setHabit(h, sel, e.target.checked ? 1 : 0, { quiet: true }));
    $("#hsM", el) && ($("#hsM", el).onclick = () => setHabit(h, sel, Math.max(0, hVal(h, sel) - step), { quiet: true }));
    $("#hsP", el) && ($("#hsP", el).onclick = () => setHabit(h, sel, hVal(h, sel) + step, { quiet: true }));
    $("#hsSkip", el).onchange = () => toggleSkip(h, sel);
    $("#hsEdit", el).onclick = () => editHabit(h, refresh);
    $("#hsArch", el).onclick = () => { h.archived = !h.archived; save(); sheet.close(0, true); render(""); toast(h.archived ? `${h.name} archived. Its history is kept.` : `${h.name} is back`); };
    $("#hsDel", el).onclick = () => actionSheet({ title: `Delete “${h.name}” and all its history? Archive it instead to keep the history.`, actions: [{ label: "Delete Habit", red: true, fn: () => {
      D.habits = D.habits.filter((x) => x !== h); save(); sheet.close(0, true); render(""); toast(`Deleted ${h.name}`);
    } }] });
  };
  sheet.refresh = refresh; first = false;
  bind(); animateRings(sheet.el);
}
function editHabit(src, onDone) {
  const isNew = !src || !src.id;
  const d = isNew ? newHabit(src ? { name: src.name, icon: src.icon, color: src.color, target: src.target, unit: src.unit, sched: src.sched, tod: src.tod } : {}) : JSON.parse(JSON.stringify(src));
  d.sched.days = d.sched.days || [monIndex(today())]; d.sched.times = d.sched.times || 3;
  const draw = () => `<div class="hprev" style="--c:${d.color}"><span class="hring met" style="--c:${d.color};width:58px;height:58px"><span class="ic">${g(d.icon)}</span></span>
      <div><b id="hpName">${esc(d.name || "New Habit")}</b><small id="hpSub">${esc(schedText(d))}${goalText(d) ? " · " + esc(goalText(d)) : ""}</small></div></div>
    ${isNew ? `<div class="presets mini">${HABIT_PRESETS.map((p, i) => `<button type="button" data-preset="${i}" class="${p.name === d.name ? "on" : ""}">${licSm(p.icon, p.color, 22)}<b>${esc(p.name)}</b></button>`).join("")}</div>` : ""}
    <div class="group"><div class="cell"><input id="hName" class="bigtitle" value="${esc(d.name)}" placeholder="Habit name, like Read" maxlength="40" aria-label="Habit name" style="text-align:center"></div></div>
    <div class="group"><div class="colors" role="radiogroup" aria-label="Colour">${COLORS.map((c) => `<button type="button" data-color="${c}" class="${c === d.color ? "on" : ""}" style="--sw:${c}" aria-label="Colour"></button>`).join("")}</div></div>
    <div class="group"><div class="glyphs" role="radiogroup" aria-label="Icon" style="--c:${d.color}">${LIST_GLYPHS.map((k) => `<button type="button" data-icon="${k}" class="${k === d.icon ? "on" : ""}" aria-label="${k}">${g(k)}</button>`).join("")}</div></div>
    <div class="sh sm"><h2>Goal each day</h2></div>
    <div class="group ic">
      <div class="cell"><span class="lic sq" style="--c:${d.color}">${g("target")}</span><span class="grow">Amount</span><span class="stepper"><button type="button" id="gM" aria-label="Less">−</button><i></i><span id="gV">${d.target}</span><i></i><button type="button" id="gP" aria-label="More">+</button></span></div>
      <label class="cell tap"><span class="lic sq" style="--c:#8e8e93">${g("number")}</span><span class="grow">Unit</span><input class="pillin" id="hUnit" list="hUnits" value="${esc(d.unit || "times")}" style="width:120px" maxlength="16"><datalist id="hUnits">${UNITS.map((u) => `<option value="${u}">`).join("")}</datalist></label>
    </div>
    <p class="foot">${isCheckH(d) ? "1 time: one tap marks it done." : isAmountH(d) ? `Tap the ring to add ${esc(d.unit)}, or log the whole goal at once.` : "Each tap on the ring adds one."}</p>
    <div class="sh sm"><h2>How often</h2></div>
    <div class="group"><div class="cell" style="padding:10px 12px"><div class="seg">${[["daily", "Every Day"], ["days", "On Days"], ["weekly", "Per Week"]].map(([k, v]) => `<button type="button" data-st="${k}" class="${d.sched.type === k ? "on" : ""}">${v}</button>`).join("")}</div></div>
      ${d.sched.type === "days" ? `<div class="days">${DAY_LETTERS.map((x, i) => `<button type="button" data-day="${i}" class="${d.sched.days.includes(i) ? "on" : ""}" aria-pressed="${d.sched.days.includes(i)}" aria-label="${DAY_LONG[i]}" style="${d.sched.days.includes(i) ? `background:${d.color}` : ""}">${x}</button>`).join("")}</div>` : ""}
      ${d.sched.type === "weekly" ? `<div class="cell"><span class="grow">Times a week<div class="sub">Any days you like</div></span><span class="stepper"><button type="button" id="wM" aria-label="Fewer">−</button><i></i><span id="wV">${d.sched.times}</span><i></i><button type="button" id="wP" aria-label="More">+</button></span></div>` : ""}</div>
    <div class="sh sm"><h2>Time of day</h2></div>
    <div class="group"><div class="cell" style="padding:10px 12px"><div class="seg">${["morning", "afternoon", "evening", "any"].map((k) => `<button type="button" data-tod="${k}" class="${(d.tod || "any") === k ? "on" : ""}">${k === "any" ? "Any" : TOD[k]}</button>`).join("")}</div></div></div>
    ${isNew ? "" : `<div class="group" style="margin-top:22px"><button type="button" class="cell red" id="hDel"><span class="grow">Delete Habit</span>${g("trash", "s")}</button></div>`}`;
  const sheet = openSheet({
    title: isNew ? "New Habit" : "Edit Habit", left: { label: "Cancel" },
    right: { label: isNew ? "Add" : "Done", bold: true, fn: () => {
      d.name = $("#hName", sheet.el).value.trim();
      if (!d.name) { toast("Give the habit a name."); $("#hName", sheet.el).focus(); return false; }
      if (d.sched.type === "days" && !d.sched.days.length) { toast("Pick at least one day."); return false; }
      d.unit = d.unit === "times" ? "" : d.unit;
      if (isNew) { D.habits.push(d); S.newIds.add(d.id); } else Object.assign(src, d, { log: src.log, skip: src.skip });
      save(); if (isNew && S.route.name !== "habits" && S.route.name !== "day") go("#/habits"); else render("");
      onDone && onDone(); toast(isNew ? `${d.name} added. Tap its ring when you've done it.` : "Habit saved");
    } },
    html: draw(),
  });
  const el = sheet.el;
  const sub = () => { $("#hpSub", el).textContent = `${schedText(d)}${goalText(d) ? " · " + goalText(d) : ""}`; };
  const redraw = () => { const sc = $(".scroll", el), top = sc.scrollTop; sc.innerHTML = draw(); sc.scrollTop = top; bind(); };
  const bind = () => {
    $("#hName", el).oninput = (e) => { d.name = e.target.value; $("#hpName", el).textContent = e.target.value.trim() || "New Habit"; };
    $("#hUnit", el).oninput = (e) => { d.unit = e.target.value.trim(); sub(); };
    $("#hUnit", el).onchange = () => redraw();
    $$("[data-preset]", el).forEach((b) => b.onclick = () => { const p = HABIT_PRESETS[+b.dataset.preset]; Object.assign(d, JSON.parse(JSON.stringify(p))); d.sched.days = d.sched.days || [monIndex(today())]; d.sched.times = d.sched.times || 3; haptic(6); redraw(); });
    $$("[data-color]", el).forEach((b) => b.onclick = () => { d.color = b.dataset.color; haptic(4); redraw(); });
    $$("[data-icon]", el).forEach((b) => b.onclick = () => { d.icon = b.dataset.icon; haptic(4); redraw(); });
    const tstep = (dir) => { const s = d.target >= 20 ? 5 : 1; d.target = Math.max(1, Math.min(9999, d.target + dir * s)); if (d.target > 1 && !d.unit) d.unit = "times"; haptic(4); redraw(); };
    $("#gM", el).onclick = () => tstep(-1); $("#gP", el).onclick = () => tstep(1);
    $$("[data-st]", el).forEach((b) => b.onclick = () => { d.sched.type = b.dataset.st; haptic(4); redraw(); });
    $$("[data-day]", el).forEach((b) => b.onclick = () => { const i = +b.dataset.day; d.sched.days = d.sched.days.includes(i) ? d.sched.days.filter((x) => x !== i) : [...d.sched.days, i].sort(); haptic(4); redraw(); });
    $("#wM", el) && ($("#wM", el).onclick = () => { d.sched.times = Math.max(1, d.sched.times - 1); redraw(); });
    $("#wP", el) && ($("#wP", el).onclick = () => { d.sched.times = Math.min(7, d.sched.times + 1); redraw(); });
    $$("[data-tod]", el).forEach((b) => b.onclick = () => { d.tod = b.dataset.tod; haptic(4); redraw(); });
    $("#hDel", el) && ($("#hDel", el).onclick = () => actionSheet({ title: `Delete “${src.name}” and all its history?`, actions: [{ label: "Delete Habit", red: true, fn: () => { D.habits = D.habits.filter((x) => x !== src); save(); closeAllSheets(); render(""); } }] }));
  };
  bind();
  if (isNew && !d.name) setTimeout(() => { const n = $("#hName", el); n && n.focus(); }, reduceMotion.matches ? 0 : 340);
}

// ================= a list =================
const SORTS = { manual: "Manual", starred: "Importance", due: "Due Date", alpha: "Alphabetically", created: "Creation Date" };
const GROUPS = { none: "None", section: "Sections", due: "Due Date" };
function sortFn(l) {
  const s = l.sort || "manual";
  if (s === "starred") return (a, b) => (b.starred - a.starred) || a.pos - b.pos;
  if (s === "due") return (a, b) => (a.due || "9").localeCompare(b.due || "9") || a.pos - b.pos;
  if (s === "alpha") return (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  if (s === "created") return (a, b) => (b.created || 0) - (a.created || 0);
  return (a, b) => a.pos - b.pos;
}
function renderList(l, anim) {
  const items = listItems(l.id);
  const open = items.filter((i) => !i.done).sort(S.editing ? (a, b) => a.pos - b.pos : sortFn(l));
  const done = items.filter((i) => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const c = counts(items), rules = D.rules.filter((r) => r.list === l.id && r.on !== false);
  const applied = D.applied.filter((a) => a.key === `list:${l.id}`).slice(-2);
  let body;
  if (!S.editing && l.group === "section") {
    const sec = {}; open.forEach((i) => { (sec[i.section || ""] ||= []).push(i); });
    const keys = Object.keys(sec).sort((a, b) => (a === "") - (b === "") || a.localeCompare(b));
    body = keys.map((k) => `<div class="gh">${g("tag", "s")} ${esc(k || "Other")} <span class="c">${sec[k].length}</span></div><div class="tasks">${sec[k].map((i) => taskRow(i)).join("")}</div>`).join("");
  } else if (!S.editing && l.group === "due") {
    const t = today(), sec = {};
    open.forEach((i) => { const k = !i.due ? "~" : i.due < t ? "!" : i.due; (sec[k] ||= []).push(i); });
    body = Object.keys(sec).sort().map((k) => `<div class="gh ${k === "!" ? "late" : ""}">${k === "~" ? "No date" : k === "!" ? "Overdue" : esc(dayLabel(k))} <span class="c">${sec[k].length}</span></div><div class="tasks">${sec[k].map((i) => taskRow(i)).join("")}</div>`).join("");
  } else body = `<div class="tasks ${S.editing ? "editing" : ""}">${open.map((i) => taskRow(i)).join("")}</div>`;
  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar"><div class="side"><button type="button" class="nb back" data-go="#/">${g("chevL")}Lists</button></div><div class="mid">${esc(l.name)}</div>
      <div class="side r">${items.length ? `<button type="button" class="nb ${S.editing ? "b" : ""}" id="edit">${S.editing ? "Done" : "Edit"}</button>` : ""}<button type="button" class="nb" id="more" aria-label="List options">${g("more")}</button></div></div>
    <div class="hero wall" style="${wallStyle(l.image, false)}">
      <div class="top"><div class="gbtns">${lic(l.icon, l.color)}${rules.length ? `<button type="button" class="gpill glass" id="rulesPill">${g("repeat", "s")} ${esc(ruleWhen(rules[0]))}${rules.length > 1 ? ` +${rules.length - 1}` : ""}</button>` : ""}</div>
        <button type="button" class="gbtn glass" id="theme" aria-label="Change theme">${g("photo")}</button></div>
      <div class="bot"><div><h1>${esc(l.name)}</h1><div class="sub">${c.total ? `${c.open} to go · ${c.done} done` : "Nothing here yet"}</div></div>${c.total ? ringSvg(c.done, c.total, `list:${l.id}`) : ""}</div>
    </div>
    ${applied.length ? `<div class="chips">${applied.map((a) => `<span class="chip">${g("stack", "s")} ${esc(a.name)}<button type="button" class="x" data-unapply="${a.id}" aria-label="Remove ${esc(a.name)}">${g("x")}</button></span>`).join("")}</div>` : ""}
    <div style="margin-top:14px">${body}</div>
    ${!items.length ? `<div class="empty">${lic(l.icon, l.color)}<b>Make it yours</b>${l.qty ? "Type “2 lemons” to add a quantity." : "Try “Call mom friday 5pm !”"}<br>Open ${inlineMore()} to add a rule, like “every Saturday, start fresh”.</div>`
      : !open.length ? `<div class="empty">${lic("check", "#34c759")}<b>All done</b></div>` : ""}
    ${doneSection(done, l.showDone !== false)}
  </div>
  ${S.editing ? "" : `<div class="addbar"><button type="button" class="addbtn" id="add">${g("plus")} Add an Item</button></div>`}${tabbar()}`;
  S.newIds.clear(); bindCommon(); bindDone(); bindRows();
  $("#edit") && ($("#edit").onclick = () => { S.editing = !S.editing; render(""); });
  $("#more").onclick = (e) => listMenu(e.currentTarget, l);
  $("#theme").onclick = () => pickImage(l.image, (k) => { l.image = k; save(); render(""); });
  $("#rulesPill") && ($("#rulesPill").onclick = () => rulesSheet(l));
  $("#add") && ($("#add").onclick = () => openComposer({ kind: "list", list: l }));
  $$("[data-unapply]").forEach((b) => b.onclick = () => askUnapply(b.dataset.unapply));
}
function listMenu(anchor, l) {
  const items = listItems(l.id), hasDone = items.some((i) => i.done);
  menu(anchor, [
    { label: "Edit List", icon: "pencil", fn: () => editList(l) },
    { label: "Sort", icon: "sort", value: SORTS[l.sort || "manual"], sub: Object.entries(SORTS).map(([k, v]) => ({ label: v, checked: (l.sort || "manual") === k, fn: () => { l.sort = k; save(); render(""); } })) },
    { label: "Group By", icon: "tag", value: GROUPS[l.group || "none"], sub: Object.entries(GROUPS).map(([k, v]) => ({ label: v, checked: (l.group || "none") === k, fn: () => { l.group = k; save(); render(""); } })) },
    { label: l.showDone === false ? "Show Completed" : "Hide Completed", icon: l.showDone === false ? "eye" : "eyeOff", fn: () => { l.showDone = l.showDone === false; save(); render(""); } },
    { label: l.qty ? "Hide Quantities" : "Show Quantities", icon: "number", fn: () => { l.qty = !l.qty; save(); render(""); toast(l.qty ? "Type “2 eggs” to add a quantity" : "Quantities hidden"); } },
    { sep: true },
    { label: "Rules", icon: "wand", value: D.rules.filter((r) => r.list === l.id).length || "", fn: () => rulesSheet(l) },
    { label: "Add From a Template", icon: "stack", fn: () => pickTemplate(`list:${l.id}`) },
    ...(items.length ? [{ label: "Save as Template", icon: "copy", fn: () => editTemplate({ id: null, name: l.name, icon: l.icon, color: l.color, image: l.image, target: l.id, days: [], items: items.map((i) => ({ title: i.title, notes: i.notes, qty: i.qty, section: i.section })) }) }] : []),
    { label: "Duplicate List", icon: "plusCircle", fn: () => duplicateList(l) },
    ...(hasDone ? [{ label: "Uncheck All", icon: "repeat", fn: () => { const was = items.filter((i) => i.done); was.forEach((i) => { i.done = false; i.doneAt = null; }); save(); render(""); toast("Everything's unchecked", { label: "Undo", fn: () => { was.forEach((i) => { i.done = true; i.doneAt = Date.now(); }); save(); render(""); } }); } }] : []),
    { sep: true },
    { label: "Send a Copy", icon: "share", fn: () => shareList(l) },
    { label: "Print List", icon: "printer", fn: () => window.print() },
    ...(hasDone ? [{ label: "Clear Completed", icon: "trash", red: true, fn: () => { const gone = items.filter((i) => i.done); D.items = D.items.filter((i) => !gone.includes(i)); save(); render(""); toast(`Removed ${plural(gone.length, "item")}`, { label: "Undo", fn: () => { D.items.push(...gone); save(); render(""); } }); } }] : []),
    { label: "Delete List", icon: "trash", red: true, fn: () => confirmDeleteList(l) },
  ]);
}
function duplicateList(l) {
  const n = { ...l, id: uid(), name: `${l.name} copy`, pos: D.lists.length + 1 };
  D.lists.push(n);
  listItems(l.id).forEach((i) => D.items.push({ ...i, id: uid(), list: n.id, done: false, doneAt: null, from: undefined, spawned: false }));
  save(); go(`#/list/${n.id}`); toast("List duplicated");
}
function confirmDeleteList(l) {
  const n = listItems(l.id).length;
  actionSheet({ title: `“${l.name}”${n ? ` and its ${plural(n, "item")}` : ""} will be deleted. This can't be undone.`, actions: [{ label: "Delete List", red: true, fn: () => {
    D.items = D.items.filter((i) => i.list !== l.id); D.lists = D.lists.filter((x) => x !== l); D.rules = D.rules.filter((r) => r.list !== l.id);
    D.templates.forEach((t) => { if (t.target === l.id) t.target = "day"; });
    save(); closeAllSheets(); go("#/");
  } }] });
}
async function shareList(l) {
  const open = listItems(l.id).filter((i) => !i.done).sort(sortFn(l));
  const text = `${l.name}\n` + open.map((i) => `◦ ${i.title}${i.qty > 1 ? ` ×${i.qty}` : ""}${i.due ? ` (${dayLabel(i.due)})` : ""}`).join("\n");
  try { if (navigator.share) await navigator.share({ title: l.name, text }); else { await navigator.clipboard.writeText(text); toast("Copied the list"); } } catch { /* cancelled */ }
}

// ================= smart lists & search =================
function renderSmart(kind, anim) {
  const t = today(), sm = SMART[kind];
  const items = kind === "starred" ? D.items.filter((i) => i.starred && !i.done).sort((a, b) => (dateOf(a) || "9").localeCompare(dateOf(b) || "9"))
    : kind === "planned" ? plannedItems() : D.items.filter((i) => !i.done);
  let body;
  if (kind === "planned") {
    const gp = {}; items.forEach((i) => { const d = dateOf(i); const k = d < t ? "!" : d; (gp[k] ||= []).push(i); });
    body = Object.keys(gp).sort().map((k) => `<div class="gh ${k === "!" ? "late" : ""}">${k === "!" ? "Overdue" : esc(relDay(k) || shortDate(k))} <span class="c">${gp[k].length}</span></div><div class="tasks">${gp[k].map((i) => taskRow(i, { src: true, noDate: k !== "!" })).join("")}</div>`).join("");
  } else if (kind === "all") {
    const gp = {}; items.forEach((i) => { (gp[i.list === "day" ? "day" : i.list] ||= []).push(i); });
    body = Object.keys(gp).map((k) => { const l = k === "day" ? SMART.day : listById(k) || { name: "?", icon: "list" };
      return `<div class="gh">${licSm(l.icon, l.color)} ${esc(l.name)} <span class="c">${gp[k].length}</span></div><div class="tasks">${gp[k].sort((a, b) => a.pos - b.pos).map((i) => taskRow(i, { src: k === "day" })).join("")}</div>`; }).join("");
  } else body = `<div class="tasks">${items.map((i) => taskRow(i, { src: true })).join("")}</div>`;
  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar"><div class="side"><button type="button" class="nb back" data-go="#/">${g("chevL")}Lists</button></div><div class="mid">${sm.name}</div><div class="side r"></div></div>
    <div class="hero wall" style="${wallStyle(sm.image, false)}"><div class="top"><div class="gbtns">${lic(sm.icon, sm.color)}</div></div>
      <div class="bot"><div><h1>${sm.name}</h1><div class="sub">${kind === "starred" ? "Everything you've starred" : kind === "planned" ? "Everything with a date, soonest first" : "Every unfinished item, by list"}</div></div></div></div>
    <div style="margin-top:14px">${body}</div>
    ${!items.length ? `<div class="empty">${lic(sm.icon, sm.color)}<b>Nothing here</b>${kind === "starred" ? "Star a task to see it here." : kind === "planned" ? "Give tasks a date and they'll line up here." : "You're all caught up."}</div>` : ""}
  </div><div class="addbar"><button type="button" class="addbtn" id="add">${g("plus")} Add to My Day</button></div>${tabbar()}`;
  bindCommon(); bindRows();
  $("#add").onclick = () => openComposer({ kind: "day", day: t, starred: kind === "starred" });
}
function renderSearch(anim) {
  appEl.innerHTML = `<div class="page nobar ${anim}">
    <div class="navbar"><div class="side"></div><div class="mid">Search</div><div class="side r"></div></div>
    <div class="ltitle"><h1>Search</h1></div>
    <label class="search">${g("search")}<input id="q" type="search" placeholder="Tasks, habits, notes, lists" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search"></label>
    <div id="results"></div></div>${tabbar()}`;
  bindCommon();
  const q = $("#q");
  const run = () => {
    S.q = q.value; const s = S.q.trim().toLowerCase(), out = $("#results");
    if (!s) { out.innerHTML = `<div class="empty">${lic("search", "#8e8e93")}<b>Find anything</b>Search every list, My Day and your notes.</div>`; return; }
    const hit = (txt) => (txt || "").toLowerCase().includes(s);
    const ls = D.lists.filter((l) => hit(l.name)), its = D.items.filter((i) => hit(i.title) || hit(i.notes) || hit(i.section));
    const ts = D.templates.filter((t) => hit(t.name) || t.items.some((x) => hit(x.title)));
    const hb = (D.habits || []).filter((h) => hit(h.name));
    const mark = (t) => esc(t).replace(new RegExp(esc(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`);
    out.innerHTML = (hb.length ? `<div class="sh sm"><h2>Habits</h2></div><div class="group ic">${hb.map((h) => `<button type="button" class="cell" data-hopen="${h.id}">${lic(h.icon, h.color)}<span class="grow">${mark(h.name)}<div class="sub">${esc(schedText(h))}${h.archived ? " · archived" : ""}</div></span>${g("chevR", "chev")}</button>`).join("")}</div>` : "") + (ls.length ? `<div class="sh sm"><h2>Lists</h2></div><div class="group ic">${ls.map((l) => `<button type="button" class="cell" data-go="#/list/${l.id}">${lic(l.icon, l.color)}<span class="grow">${mark(l.name)}</span>${g("chevR", "chev")}</button>`).join("")}</div>` : "")
      + (its.length ? `<div class="sh sm"><h2>Tasks · ${its.length}</h2></div><div class="tasks">${its.slice(0, 80).map((i) => taskRow(i, { src: true })).join("")}</div>` : "")
      + (ts.length ? `<div class="sh sm"><h2>Templates</h2></div><div class="group ic">${ts.map((t) => `<button type="button" class="cell" data-tplq="${t.id}">${lic(t.icon, t.color)}<span class="grow">${mark(t.name)}</span>${g("chevR", "chev")}</button>`).join("")}</div>` : "")
      || `<div class="empty">${lic("search", "#8e8e93")}<b>No results for “${esc(S.q)}”</b></div>`;
    $$("[data-go]", out).forEach((b) => b.onclick = () => go(b.dataset.go));
    $$("[data-tplq]", out).forEach((b) => b.onclick = () => editTemplate(tplById(b.dataset.tplq)));
    bindRows(); bindHabits(out);
  };
  q.oninput = run; run();
  setTimeout(() => q.focus(), 60);
}

// ================= rows =================
function taskRow(it, o = {}) {
  const meta = [], t = today(), l = it.list !== "day" ? listById(it.list) : null;
  if (o.src) meta.push(it.list === "day" ? `<span class="sun">${g("sun", "xs")} ${o.noDate ? "My Day" : esc(dayLabel(it.day))}</span>` : `<span class="src">${esc(sourceName(it))}</span>`);
  else if (l && it.myDay === t) meta.push(`<span class="sun">${g("sun", "xs")} My Day</span>`);
  if (l && it.due && !o.noDate) meta.push(`<span class="${it.due < t && !it.done ? "late" : ""}">${g("calendar", "xs")} ${esc(dayLabel(it.due))}</span>`);
  if (it.time) meta.push(`<span>${g("clock", "xs")} ${fmtTime(it.time)}</span>`);
  if (it.repeat) meta.push(`<span aria-label="Repeats">${g("repeat", "xs")}</span>`);
  if (it.notes) meta.push(`<span>${g("note", "xs")} ${esc(it.notes.split("\n")[0].slice(0, 32))}</span>`);
  if (it.section && !(l && l.group === "section" && S.route.name === "list")) meta.push(`<span>${g("tag", "xs")} ${esc(it.section)}</span>`);
  const editing = S.editing && !o.src;
  return `<div class="rw ${S.newIds.has(it.id) ? "row-in" : ""}" data-id="${it.id}">
    <div class="bh"><span>${g(it.list === "day" ? "calTomorrow" : "sun", "s")}${it.list === "day" ? "Tomorrow" : "My Day"}</span><span>${g("trash", "s")}Delete</span></div>
    <div class="row ${it.done ? "done" : ""}" ${l ? `style="--rc:${l.color}"` : ""}>
      ${editing ? `<button type="button" class="minus" data-act="del" aria-label="Delete ${esc(it.title)}"><i></i></button>` :
        `<button type="button" class="check" data-act="done" role="checkbox" aria-checked="${!!it.done}" aria-label="${esc(it.title)}">${g("check")}</button>`}
      <div class="body" data-act="open"><div class="title">${esc(it.title)}</div>${meta.length ? `<div class="meta">${meta.join("")}</div>` : ""}</div>
      ${it.qty > 1 ? `<span class="qty">×${it.qty}</span>` : ""}
      ${editing ? `<span class="handle" aria-label="Drag to reorder">${g("grip")}</span>` :
        `<button type="button" class="star ${it.starred ? "on" : ""} ${S.pop === `star:${it.id}` ? "pop" : ""}" data-act="star" aria-pressed="${!!it.starred}" aria-label="Star">${g(it.starred ? "starFill" : "star")}</button>`}
    </div></div>`;
}
function bindRows() { $$(".rw").forEach(bindRow); }
function collapse(el, cb) { // the row folds away before the list redraws
  el.style.height = el.offsetHeight + "px"; void el.offsetHeight;
  el.style.transition = "height .26s cubic-bezier(.2,.9,.3,1), opacity .2s ease-out, margin .26s cubic-bezier(.2,.9,.3,1), transform .26s";
  el.style.height = "0px"; el.style.opacity = "0"; el.style.marginBottom = "-8px"; el.style.transform = "scale(.97)";
  setTimeout(cb, 270);
}
function viewOpenCount() {
  const r = S.route;
  if (r.name === "day") return counts(myDayItems(r.day)).open;
  if (r.name === "list") return counts(listItems(r.id)).open;
  return -1;
}
function bindRow(wrap) {
  const it = itemById(wrap.dataset.id), row = $(".row", wrap);
  if (!it || wrap.dataset.bound) return;
  wrap.dataset.bound = 1;
  let swiped = false;
  row.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (!act || swiped) return;
    const a = act.dataset.act;
    if (a === "done") {
      if (wrap.dataset.busy) return; wrap.dataset.busy = 1;
      const nowDone = !it.done;
      haptic(nowDone ? [8, 24, 8] : 6); row.classList.toggle("done", nowDone); row.classList.add(nowDone ? "completing" : "reopening"); act.setAttribute("aria-checked", String(nowDone));
      const before = viewOpenCount();
      setDone(it, nowDone); S.newIds.add(it.id);
      if (it.done && before === 1 && viewOpenCount() === 0) setTimeout(confetti, 260);
      reduceMotion.matches ? render("") : setTimeout(() => collapse(wrap, () => render("")), nowDone ? 460 : 200);
    } else if (a === "star") { haptic(6); it.starred = !it.starred; save(); if (it.starred) S.pop = `star:${it.id}`; render(""); }
    else if (a === "open") editItem(it);
    else if (a === "del") deleteItem(it);
  });
  row.addEventListener("pointerdown", (e) => { if (e.target.closest(".body")) row.classList.add("pressed"); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => row.addEventListener(ev, () => row.classList.remove("pressed")));
  if (S.editing) { const h = $(".handle", row); h && bindReorder(wrap, h); return; }
  let start = null, x = 0, mode = null, sp = null, tr;
  const W = () => row.offsetWidth;
  const set = (v) => { x = v; row.style.transform = `translateX(${v}px)`; wrap.classList.toggle("r", v > 0); };
  row.addEventListener("pointerdown", (e) => { if (e.button !== 0 || e.target.closest(".check,.star")) return; sp && sp.stop(); start = { x: e.clientX - x, y: e.clientY, x0: e.clientX }; mode = null; swiped = false; tr = tracker(); tr.add(e.clientX, e.clientY); });
  row.addEventListener("pointermove", (e) => {
    if (!start) return; tr.add(e.clientX, e.clientY);
    const dx = e.clientX - start.x0, dy = e.clientY - start.y;
    if (!mode) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; mode = Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll"; if (mode === "swipe") { row.setPointerCapture(e.pointerId); row.classList.remove("pressed"); swiped = true; } }
    if (mode !== "swipe") return;
    let v = e.clientX - start.x; const lim = W() * 0.9;
    if (Math.abs(v) > lim) v = Math.sign(v) * (lim + rubber(Math.abs(v) - lim, W()));
    set(v);
  });
  const end = () => {
    if (!start) return; const was = mode; start = null; if (was !== "swipe") return;
    const vx = tr.v().x, land = x + project(vx, 0.99), w = W();
    if (land < -w * 0.45) { haptic(12); sp = spring({ from: x, to: -w - 20, velocity: vx, response: 0.25, onUpdate: set, onDone: () => deleteItem(it) }); }
    else if (land > w * 0.4) {
      haptic(12);
      sp = spring({ from: x, to: w + 20, velocity: vx, response: 0.25, onUpdate: set, onDone: () => {
        if (it.list === "day") moveItemDay(it, addDays(it.day < today() ? today() : it.day, 1));
        else { const old = it.myDay; it.myDay = it.myDay === today() ? undefined : today(); save(); render(""); toast(it.myDay ? "Added to My Day" : "Removed from My Day", { label: "Undo", fn: () => { it.myDay = old; save(); render(""); } }); }
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
    const wraps = $$(".rw", list), from = wraps.indexOf(wrap), rects = wraps.map((w) => w.getBoundingClientRect());
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 8, step = rects[from].height + gap, y0 = e.clientY;
    let to = from;
    wrap.style.zIndex = 3; $(".row", wrap).classList.add("dragging");
    wraps.forEach((w) => { if (w !== wrap) w.style.transition = "transform .25s cubic-bezier(.2,.9,.3,1)"; });
    haptic(8);
    const move = (ev) => {
      let dy = ev.clientY - y0; const minDy = rects[0].top - rects[from].top, maxDy = rects[rects.length - 1].top - rects[from].top;
      if (dy < minDy) dy = minDy - rubber(minDy - dy, 200); if (dy > maxDy) dy = maxDy + rubber(dy - maxDy, 200);
      wrap.style.transform = `translateY(${dy}px) scale(1.02)`;
      const mid = rects[from].top + rects[from].height / 2 + dy; to = from;
      rects.forEach((r, i) => { if (i < from && mid < r.top + r.height / 2) to = Math.min(to, i); if (i > from && mid > r.top + r.height / 2) to = Math.max(to, i); });
      wraps.forEach((w, i) => { if (w === wrap) return; const s = from < to && i > from && i <= to ? -step : from > to && i < from && i >= to ? step : 0; w.style.transform = s ? `translateY(${s}px)` : ""; });
    };
    const up = () => {
      handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
      const ids = wraps.map((w) => w.dataset.id); ids.splice(to, 0, ids.splice(from, 1)[0]);
      const base = Math.min(...ids.map((id) => itemById(id).pos)); ids.forEach((id, i) => { itemById(id).pos = base + i; });
      const l = S.route.name === "list" && listById(S.route.id); if (l && l.sort !== "manual") { l.sort = "manual"; toast("Sorting switched to Manual"); }
      save(); render("");
    };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
  });
}
function swipeHero(el, fn) {
  let sx = null, sy = 0;
  el.addEventListener("touchstart", (e) => { if (e.target.closest("button")) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  el.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); fn(dx < 0 ? 1 : -1); } });
}
function deleteItem(it) {
  const idx = D.items.indexOf(it); D.items = D.items.filter((x) => x !== it); save(); render("");
  toast(`Deleted “${it.title.slice(0, 28)}”`, { label: "Undo", fn: () => { D.items.splice(idx, 0, it); save(); S.newIds.add(it.id); render(""); } });
}
function moveItemDay(it, day) {
  const old = it.day; it.day = day; it.pos = nextPos(); save(); render("");
  toast(`Moved to ${dayLabel(day)}`, { label: "Undo", fn: () => { it.day = old; save(); render(""); } });
}

// ================= composer =================
function openComposer(ctx) {
  const list = ctx.kind === "list" ? ctx.list : null;
  const st = { starred: !!ctx.starred, due: "", time: "", repeat: "", myDay: false, off: new Set() };
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="composer-scrim"></div><div class="composer" role="dialog" aria-label="Add">
    <div class="line"><span class="ring0"></span><input id="cIn" placeholder="${list ? `Add to ${esc(list.name)}` : "Add a Task"}" enterkeyhint="done" maxlength="200" autocomplete="off"></div>
    <div class="parsed" id="cParsed" aria-live="polite"></div>
    <div class="tools">
      ${list ? `<button type="button" class="tool" id="cDay" aria-pressed="false" aria-label="Add to My Day">${g("sun")}</button><button type="button" class="tool" id="cDue" aria-label="Due date">${g("calendar")}<span></span></button>` : ""}
      <label class="tool" id="cTimeL" aria-label="Time">${g("clock")}<span></span><input type="time" id="cTime"></label>
      <button type="button" class="tool" id="cRep" aria-label="Repeat">${g("repeat")}<span></span></button>
      <button type="button" class="tool" id="cStar" aria-pressed="false" aria-label="Star">${g("star")}</button>
      <button type="button" class="send" id="cSend" disabled aria-label="Add">${g("arrowUp")}</button>
    </div></div>`;
  document.body.appendChild(wrap);
  const inp = $("#cIn", wrap); inp.focus(); // same tap, so iOS opens the keyboard
  const close = () => { closeMenu(); wrap.remove(); };
  const paint = () => {
    const p = parseQuick(inp.value, { list, off: st.off });
    $("#cParsed", wrap).innerHTML = parsedChips(p).map(([k, h]) => `<span role="button" tabindex="0" data-off="${k}" title="Tap to keep this as text">${h}</span>`).join("");
    $$("[data-off]", wrap).forEach((c) => c.onclick = () => { st.off.add(c.dataset.off); paint(); inp.focus(); });
    $("#cSend", wrap).disabled = !inp.value.trim();
    const dueBtn = $("#cDue", wrap); if (dueBtn) { dueBtn.classList.toggle("on", !!st.due); $("span", dueBtn).textContent = st.due ? dayLabel(st.due) : ""; }
    $("#cTimeL", wrap).classList.toggle("on", !!st.time); $("#cTimeL span", wrap).textContent = st.time ? fmtTime(st.time) : "";
    $("#cRep", wrap).classList.toggle("on", !!st.repeat); $("#cRep span", wrap).textContent = st.repeat ? REPEATS[st.repeat] : "";
    const sb = $("#cStar", wrap); sb.classList.toggle("star-on", st.starred); sb.innerHTML = g(st.starred ? "starFill" : "star"); sb.setAttribute("aria-pressed", st.starred);
    const db = $("#cDay", wrap); if (db) { db.classList.toggle("on", st.myDay); db.setAttribute("aria-pressed", st.myDay); }
  };
  paint();
  $(".composer-scrim", wrap).onclick = close;
  inp.oninput = () => { st.off.clear(); paint(); };
  $("#cStar", wrap).onclick = () => { st.starred = !st.starred; paint(); inp.focus(); };
  $("#cDay", wrap) && ($("#cDay", wrap).onclick = () => { st.myDay = !st.myDay; paint(); inp.focus(); });
  $("#cTime", wrap).onchange = (e) => { st.time = e.target.value; paint(); };
  $("#cDue", wrap) && ($("#cDue", wrap).onclick = (e) => dueMenu(e.currentTarget, st.due, (d) => { st.due = d; paint(); inp.focus(); }));
  $("#cRep", wrap).onclick = (e) => repeatMenu(e.currentTarget, st.repeat, (r) => { st.repeat = r; paint(); inp.focus(); });
  const send = () => {
    const raw = inp.value.trim(); if (!raw) { close(); return; }
    const p = parseQuick(raw, { list, off: st.off });
    if (!p.title) return;
    const f = { title: p.title, starred: st.starred || !!p.starred, time: st.time || p.time || "", repeat: st.repeat || p.repeat || undefined };
    let it;
    if (!list) it = addItem({ ...f, list: "day", day: p.date || ctx.day });
    else {
      const qty = p.qty || 1;
      const dup = list.qty && listItems(list.id).find((i) => i.title.toLowerCase() === p.title.toLowerCase());
      if (dup) { const was = dup.done; if (was) setDone(dup, false); if (qty > 1 || was) dup.qty = qty > 1 ? qty : undefined; save(); it = dup; toast(was ? `${dup.title} is back on the list` : `${dup.title} is already on the list`); }
      else it = addItem({ ...f, list: list.id, due: st.due || p.date || undefined, myDay: st.myDay ? today() : undefined, qty: qty > 1 ? qty : undefined });
    }
    S.newIds.add(it.id);
    if (!list && it.day !== ctx.day) toast(`Added to ${dayLabel(it.day)}`);
    inp.value = ""; st.off.clear(); st.time = ""; st.repeat = ""; st.due = ""; $("#cTime", wrap).value = "";
    paint(); render(""); haptic(6); inp.focus();
  };
  $("#cSend", wrap).onclick = send;
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } if (e.key === "Escape") close(); });
}
function dueMenu(anchor, cur, fn) {
  const t = today(), nw = nextWeekday(t, 0, false);
  menu(anchor, [
    { label: "Today", icon: "calToday", value: DAY_SHORT[monIndex(t)], fn: () => fn(t) },
    { label: "Tomorrow", icon: "calTomorrow", value: DAY_SHORT[monIndex(addDays(t, 1))], fn: () => fn(addDays(t, 1)) },
    { label: "Next Week", icon: "calWeek", value: DAY_SHORT[monIndex(nw)], fn: () => fn(nw) },
    { label: "Pick a Date", icon: "calendar", date: cur || t, fn },
    ...(cur ? [{ sep: true }, { label: "Remove Due Date", icon: "x", red: true, fn: () => fn("") }] : []),
  ], cur ? `Due ${dayLabel(cur)}` : "Due");
}
function repeatMenu(anchor, cur, fn) {
  menu(anchor, [...Object.entries(REPEATS).map(([k, v]) => ({ label: v, checked: cur === k, fn: () => fn(k) })), ...(cur ? [{ sep: true }, { label: "Never", icon: "x", red: true, fn: () => fn("") }] : [])], "Repeat");
}

// ================= task detail =================
function editItem(it) {
  const l = it.list !== "day" ? listById(it.list) : null;
  const sections = l ? [...new Set(listItems(l.id).map((i) => i.section).filter(Boolean))] : [];
  const fmt = (ms) => new Date(ms || Date.now()).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
  const sheet = openSheet({
    title: l ? l.name : "My Day", right: { label: "Done", bold: true },
    html: `<div class="group"><div class="detail-title">
        <button type="button" class="check" id="dDone" role="checkbox" aria-checked="${!!it.done}" aria-label="Done">${g("check")}</button>
        <input id="dTitle" value="${esc(it.title)}" maxlength="200" aria-label="Title">
        <button type="button" class="star ${it.starred ? "on" : ""}" id="dStar" aria-pressed="${!!it.starred}" aria-label="Star">${g(it.starred ? "starFill" : "star")}</button></div></div>
      <div class="group ic" style="margin-top:18px">
        ${l ? `<label class="cell tap"><span class="lic sq" style="--c:#ff9500">${g("sun")}</span><span class="grow">Add to My Day</span><span class="switch"><input type="checkbox" id="dMyDay" ${it.myDay === today() ? "checked" : ""}><span></span></span></label>
          <button type="button" class="cell" id="dDue"><span class="lic sq" style="--c:#ff3b30">${g("calendar")}</span><span class="grow">Due</span><span class="val ${it.due ? "on" : ""}" id="dDueV">${it.due ? esc(dayLabel(it.due)) : "None"}</span>${g("chevR", "chev")}</button>`
        : `<label class="cell tap"><span class="lic sq" style="--c:#ff3b30">${g("calendar")}</span><span class="grow">Day</span><input type="date" class="pillin" id="dDay" value="${it.day}"></label>`}
        <label class="cell tap"><span class="lic sq" style="--c:#007aff">${g("clock")}</span><span class="grow">Time</span><input type="time" class="pillin" id="dTime" value="${esc(it.time)}"></label>
        <button type="button" class="cell" id="dRep"><span class="lic sq" style="--c:#8e8e93">${g("repeat")}</span><span class="grow">Repeat</span><span class="val ${it.repeat ? "on" : ""}" id="dRepV">${it.repeat ? REPEATS[it.repeat] : "Never"}</span>${g("chevR", "chev")}</button>
      </div>
      ${l && (l.qty || it.qty > 1 || l.group === "section" || it.section) ? `<div class="group ic">
        ${l.qty || it.qty > 1 ? `<div class="cell"><span class="lic sq" style="--c:#34c759">${g("number")}</span><span class="grow">Quantity</span><span class="stepper"><button type="button" id="qm" aria-label="Fewer">−</button><i></i><span id="qv">${it.qty || 1}</span><i></i><button type="button" id="qp" aria-label="More">+</button></span></div>` : ""}
        ${l.group === "section" || it.section ? `<label class="cell tap"><span class="lic sq" style="--c:#5856d6">${g("tag")}</span><span class="grow">Section</span><input class="pillin" id="dSec" list="secs" value="${esc(it.section || "")}" placeholder="None" style="width:130px"><datalist id="secs">${sections.map((s) => `<option value="${esc(s)}">`).join("")}</datalist></label>` : ""}
      </div>` : ""}
      <div class="group ic"><label class="cell tap"><span class="lic sq" style="--c:#5856d6">${g("list")}</span><span class="grow">List</span><select class="pillin" id="dList"><option value="day" ${it.list === "day" ? "selected" : ""}>My Day</option>${D.lists.map((x) => `<option value="${x.id}" ${x.id === it.list ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label></div>
      <div class="group"><button type="button" class="cell" id="dNote" style="align-items:flex-start"><span class="lic sq" style="--c:#ffcc00;margin-top:9px">${g("note")}</span><span class="grow" style="white-space:pre-wrap;${it.notes ? "" : "color:var(--label-3)"}" id="dNoteT">${it.notes ? esc(it.notes) : "Add Note"}</span></button></div>
      <p class="foot">${it.done && it.doneAt ? `Completed ${esc(fmt(it.doneAt))}` : `Created ${esc(fmt(it.created))}`}${it.from ? " · from a template" : ""}</p>
      <div class="group" style="margin-top:22px"><button type="button" class="cell" id="dDup"><span class="grow blue">Duplicate</span><span class="blue">${g("copy", "s")}</span></button><button type="button" class="cell red" id="dDel"><span class="grow">Delete</span>${g("trash", "s")}</button></div>`,
  });
  const el = sheet.el, col = l ? l.color : "var(--accent)";
  const paintDone = () => { const c = $("#dDone", el); c.style.background = it.done ? col : ""; c.style.borderColor = it.done ? col : ""; const s = $(".g", c); s.style.opacity = it.done ? 1 : 0; s.style.transform = it.done ? "none" : ""; c.setAttribute("aria-checked", !!it.done); };
  paintDone();
  const commit = () => {
    const title = $("#dTitle", el).value.trim(); if (title) it.title = title;
    if ($("#dSec", el)) it.section = $("#dSec", el).value.trim() || undefined;
    it.time = $("#dTime", el).value;
    if ($("#dDay", el) && validDay($("#dDay", el).value)) it.day = $("#dDay", el).value;
    const dest = $("#dList", el).value;
    if (dest !== it.list) {
      if (dest === "day") { it.day = it.myDay || it.due || today(); delete it.myDay; delete it.due; }
      else if (it.list === "day") { if (it.day === today()) it.myDay = today(); else it.due = it.day; delete it.day; }
      it.list = dest; it.pos = nextPos();
    }
    save(); render("");
  };
  sheet.onBeforeClose = commit;
  $("#dDone", el).onclick = () => { setDone(it, !it.done); paintDone(); haptic(10); };
  $("#dStar", el).onclick = (e) => { it.starred = !it.starred; const b = e.currentTarget; b.classList.toggle("on", it.starred); b.innerHTML = g(it.starred ? "starFill" : "star"); save(); haptic(6); };
  $("#dMyDay", el) && ($("#dMyDay", el).onchange = (e) => { it.myDay = e.target.checked ? today() : undefined; save(); });
  $("#dDue", el) && ($("#dDue", el).onclick = (e) => dueMenu(e.currentTarget, it.due, (d) => { it.due = d || undefined; $("#dDueV", el).textContent = d ? dayLabel(d) : "None"; $("#dDueV", el).classList.toggle("on", !!d); save(); }));
  $("#dRep", el).onclick = (e) => repeatMenu(e.currentTarget, it.repeat, (r) => {
    it.repeat = r || undefined; it.spawned = false;
    if (r && !dateOf(it)) { it.due = today(); if ($("#dDueV", el)) { $("#dDueV", el).textContent = "Today"; $("#dDueV", el).classList.add("on"); } }
    $("#dRepV", el).textContent = r ? REPEATS[r] : "Never"; $("#dRepV", el).classList.toggle("on", !!r); save();
  });
  const q = (d) => { const n = Math.max(1, Math.min(999, (it.qty || 1) + d)); it.qty = n > 1 ? n : undefined; $("#qv", el).textContent = n; save(); haptic(4); };
  $("#qm", el) && ($("#qm", el).onclick = () => q(-1)); $("#qp", el) && ($("#qp", el).onclick = () => q(1));
  $("#dNote", el).onclick = () => noteSheet(it.notes, (v) => { it.notes = v; save(); const n = $("#dNoteT", el); n.textContent = v || "Add Note"; n.style.color = v ? "" : "var(--label-3)"; });
  $("#dDel", el).onclick = () => { sheet.onBeforeClose = null; sheet.close(); deleteItem(it); };
  $("#dDup", el).onclick = () => { commit(); sheet.onBeforeClose = null; sheet.close(); const c = addItem({ ...it, id: uid(), done: false, doneAt: null, from: undefined, spawned: false }); S.newIds.add(c.id); render(""); toast("Duplicated"); };
}
function noteSheet(val, fn) {
  const sheet = openSheet({ title: "Note", full: true, right: { label: "Done", bold: true }, html: `<textarea class="notebox" id="noteBox" placeholder="Add note" aria-label="Note">${esc(val)}</textarea>` });
  sheet.onBeforeClose = () => fn($("#noteBox", sheet.el).value);
  setTimeout(() => { const t = $("#noteBox", sheet.el); t && t.focus(); }, reduceMotion.matches ? 0 : 340);
}

// ================= list editor =================
function editList(l) {
  const isNew = !l;
  const d = l ? { ...l } : newList({ image: WALL_KEYS[(D.lists.length * 7 + 9) % WALL_KEYS.length], color: COLORS[(D.lists.length * 5 + 6) % COLORS.length] });
  const sheet = openSheet({
    title: isNew ? "New List" : "Edit List", left: { label: "Cancel" },
    right: { label: isNew ? "Create" : "Done", bold: true, fn: () => {
      d.name = $("#lName", sheet.el).value.trim();
      if (!d.name) { toast("Give the list a name."); $("#lName", sheet.el).focus(); return false; }
      if (isNew) { D.lists.push(d); save(); go(`#/list/${d.id}`); } else { Object.assign(l, d); save(); render(""); }
    } },
    html: `<div class="preview wall" id="lPrev" style="${wallStyle(d.image, false)}"><span id="lIc">${lic(d.icon, d.color, "md")}</span><b id="lPrevT">${esc(d.name || "New List")}</b><button type="button" class="gbtn glass" id="lImg" aria-label="Change theme">${g("photo")}</button></div>
      <div class="group"><div class="cell"><input id="lName" class="bigtitle" value="${esc(d.name)}" placeholder="List Name" maxlength="60" aria-label="List name" style="text-align:center"></div></div>
      <div class="group"><div class="colors" role="radiogroup" aria-label="Colour">${COLORS.map((c) => `<button type="button" data-color="${c}" class="${c === d.color ? "on" : ""}" style="--sw:${c}" aria-label="Colour"></button>`).join("")}</div></div>
      <div class="group"><div class="glyphs" role="radiogroup" aria-label="Icon" style="--c:${d.color}">${LIST_GLYPHS.map((k) => `<button type="button" data-icon="${k}" class="${k === d.icon ? "on" : ""}" aria-label="${k}">${g(k)}</button>`).join("")}</div></div>
      <div class="sh sm"><h2>Options</h2></div>
      <div class="group ic">
        <label class="cell tap"><span class="lic sq" style="--c:#34c759">${g("number")}</span><span class="grow">Quantities<div class="sub">Type “2 eggs” to set how many</div></span><span class="switch"><input type="checkbox" id="lQty" ${d.qty ? "checked" : ""}><span></span></span></label>
        <label class="cell tap"><span class="lic sq" style="--c:#5856d6">${g("tag")}</span><span class="grow">Group into sections<div class="sub">Aisles, rooms, people, anything</div></span><span class="switch"><input type="checkbox" id="lSec" ${d.group === "section" ? "checked" : ""}><span></span></span></label>
        <button type="button" class="cell" id="lTheme"><span class="lic sq" style="--c:#007aff">${g("photo")}</span><span class="grow">Theme</span><span class="val" id="lImgName">${esc(WALL[wallKey(d.image)][0])}</span>${g("chevR", "chev")}</button>
      </div>
      ${isNew ? "" : `<div class="group ic"><button type="button" class="cell" id="lRules"><span class="lic sq" style="--c:#ff9500">${g("wand")}</span><span class="grow">Rules</span><span class="val">${D.rules.filter((r) => r.list === l.id).length || "None"}</span>${g("chevR", "chev")}</button></div>
        <div class="group"><button type="button" class="cell red" id="lDel"><span class="grow">Delete List</span>${g("trash", "s")}</button></div>`}`,
  });
  const el = sheet.el;
  const paint = () => { $("#lIc", el).innerHTML = lic(d.icon, d.color, "md"); $(".glyphs", el).style.setProperty("--c", d.color); };
  $("#lName", el).oninput = (e) => { $("#lPrevT", el).textContent = e.target.value.trim() || "New List"; };
  $$("[data-color]", el).forEach((b) => b.onclick = () => { d.color = b.dataset.color; $$("[data-color]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); haptic(4); });
  $$("[data-icon]", el).forEach((b) => b.onclick = () => { d.icon = b.dataset.icon; $$("[data-icon]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); haptic(4); });
  $("#lQty", el).onchange = (e) => { d.qty = e.target.checked; };
  $("#lSec", el).onchange = (e) => { d.group = e.target.checked ? "section" : "none"; };
  $("#lImg", el).onclick = $("#lTheme", el).onclick = () => pickImage(d.image, (k) => { d.image = k; $("#lPrev", el).setAttribute("style", wallStyle(k, false)); $("#lImgName", el).textContent = WALL[k][0]; });
  $("#lRules", el) && ($("#lRules", el).onclick = () => rulesSheet(l));
  $("#lDel", el) && ($("#lDel", el).onclick = () => confirmDeleteList(l));
  if (isNew) setTimeout(() => $("#lName", el).focus(), reduceMotion.matches ? 0 : 340);
}
function pickImage(current, onPick, allowAuto = false) {
  const sheet = openSheet({
    title: "Theme", right: { label: "Done", bold: true },
    html: `<div class="pickgrid">${allowAuto ? `<button type="button" class="auto ${current === "auto" ? "on" : ""}" data-k="auto">Follows the time of day</button>` : ""}
      ${WALL_KEYS.map((k) => `<button type="button" class="wall ${k === current ? "on" : ""}" data-k="${k}" style="${wallStyle(k)}" aria-label="${esc(WALL[k][0])}" title="${esc(WALL[k][0])}"></button>`).join("")}</div>`,
  });
  $$("[data-k]", sheet.el).forEach((b) => b.onclick = () => { $$("[data-k]", sheet.el).forEach((x) => x.classList.toggle("on", x === b)); haptic(6); onPick(b.dataset.k); setTimeout(() => sheet.close(), 180); });
}

// ================= rules =================
function rulesSheet(l) {
  const draw = () => {
    const rs = D.rules.filter((r) => r.list === l.id);
    return `<div class="preview wall" style="${wallStyle(l.image, false)};height:96px">${lic("wand", "#ff9500", "md")}<b>${esc(l.name)}</b></div>
      ${rs.length ? `<div class="group ic">${rs.map((r) => `<div class="cell"><span class="lic sq" style="--c:${r.on === false ? "#8e8e93" : "#ff9500"}">${g(RULE_ACTIONS[r.action][2])}</span>
        <button type="button" class="grow" data-edit="${r.id}" style="text-align:left"><div class="t">${esc(ruleWhen(r))}</div><div class="sub">${esc(r.action === "template" ? `Add “${(tplById(r.tpl) || {}).name || "?"}”` : RULE_ACTIONS[r.action][0])}${r.last ? ` · last ran ${esc(dayLabel(r.last))}` : ""}</div></button>
        <span class="switch"><input type="checkbox" data-on="${r.id}" ${r.on === false ? "" : "checked"} aria-label="Rule on"><span></span></span></div>`).join("")}</div>`
      : `<div class="empty" style="padding-top:8px">${lic("repeat", "#ff9500")}<b>Make this list come back</b>For example: every Saturday, start fresh with everything unchecked.</div>`}
      <div class="group" style="margin-top:18px"><button type="button" class="cell" id="newRule"><span class="grow blue">New Rule</span><span class="blue">${g("plusCircle", "s")}</span></button></div>
      <p class="foot">Rules run the first time you open the app on that day.</p>`;
  };
  const sheet = openSheet({ title: "Rules", right: { label: "Done", bold: true, fn: () => render("") }, html: draw() });
  const bind = () => {
    $("#newRule", sheet.el).onclick = () => editRule(l, null, refresh);
    $$("[data-edit]", sheet.el).forEach((b) => b.onclick = () => editRule(l, D.rules.find((r) => r.id === b.dataset.edit), refresh));
    $$("[data-on]", sheet.el).forEach((b) => b.onchange = () => { const r = D.rules.find((x) => x.id === b.dataset.on); r.on = b.checked; if (b.checked) r.last = today(); save(); refresh(); });
  };
  const refresh = () => { $(".scroll", sheet.el).innerHTML = draw(); bind(); };
  bind();
}
function editRule(l, r, done) {
  const isNew = !r;
  const d = r ? JSON.parse(JSON.stringify(r)) : { id: uid(), list: l.id, freq: "weekly", days: [monIndex(today())], date: 1, action: "reset", tpl: (D.templates.find((t) => t.target === l.id) || D.templates[0] || {}).id, on: true };
  const tplOpts = D.templates.map((t) => `<option value="${t.id}" ${t.id === d.tpl ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  const sheet = openSheet({
    title: isNew ? "New Rule" : "Edit Rule", left: { label: "Cancel" },
    right: { label: isNew ? "Add" : "Done", bold: true, fn: () => {
      if (d.freq === "weekly" && !d.days.length) { toast("Pick at least one day."); return false; }
      if (d.action === "template" && !tplById(d.tpl)) { toast("Make a template first."); return false; }
      if (isNew) { d.last = lastOccurrence(d, today()) === today() ? today() : undefined; D.rules.push(d); } else Object.assign(r, d);
      save(); done && done(); toast(isNew ? `Rule added: ${ruleText(d)}` : "Rule saved");
    } },
    html: `<div class="sh sm" style="margin-top:6px"><h2>When</h2></div>
      <div class="group"><div class="cell" style="padding:10px 12px"><div class="seg" id="rFreq">${["daily", "weekly", "monthly"].map((f) => `<button type="button" data-f="${f}" class="${d.freq === f ? "on" : ""}">${cap(f)}</button>`).join("")}</div></div>
        <div id="rDays" ${d.freq === "weekly" ? "" : "hidden"}><div class="days">${DAY_LETTERS.map((x, i) => `<button type="button" data-day="${i}" class="${d.days.includes(i) ? "on" : ""}" aria-pressed="${d.days.includes(i)}" aria-label="${DAY_LONG[i]}">${x}</button>`).join("")}</div></div>
        <div id="rDate" class="cell" ${d.freq === "monthly" ? "" : "hidden"}><span class="grow">Day of the month</span><span class="stepper"><button type="button" id="dm" aria-label="Earlier">−</button><i></i><span id="dv">${d.date}</span><i></i><button type="button" id="dp" aria-label="Later">+</button></span></div></div>
      <div class="sh sm"><h2>Do this</h2></div>
      <div class="group ic">${Object.entries(RULE_ACTIONS).map(([k, [t, s, ic]]) => `<button type="button" class="cell" data-ract="${k}" role="radio" aria-checked="${d.action === k}"><span class="lic sq" style="--c:#ff9500">${g(ic)}</span><span class="grow"><div>${t}</div><div class="sub">${s}</div></span><span class="blue" data-tick="${k}" ${d.action === k ? "" : "hidden"}>${g("check", "s")}</span></button>`).join("")}</div>
      <div class="group" id="rTpl" style="margin-top:12px" ${d.action === "template" ? "" : "hidden"}>${D.templates.length ? `<label class="cell tap"><span class="grow">Template</span><select class="pillin" id="rTplSel">${tplOpts}</select></label>` : `<div class="cell"><span class="grow sub">No templates yet. Save a list as a template first.</span></div>`}</div>
      <p class="foot" id="rSum"></p>
      ${isNew ? "" : `<div class="group" style="margin-top:22px"><button type="button" class="cell" id="rRun"><span class="grow blue">Run Now</span><span class="blue">${g("bolt", "s")}</span></button><button type="button" class="cell red" id="rDel"><span class="grow">Delete Rule</span>${g("trash", "s")}</button></div>`}`,
  });
  const el = sheet.el;
  const sum = () => { $("#rSum", el).textContent = `${ruleWhen(d)}, ${d.action === "template" ? `add the items from “${(tplById(d.tpl) || {}).name || "a template"}”` : RULE_ACTIONS[d.action][1].toLowerCase()} in ${l.name}.`; };
  sum();
  $$("[data-f]", el).forEach((b) => b.onclick = () => { d.freq = b.dataset.f; $$("[data-f]", el).forEach((x) => x.classList.toggle("on", x === b)); $("#rDays", el).hidden = d.freq !== "weekly"; $("#rDate", el).hidden = d.freq !== "monthly"; sum(); });
  $$("[data-day]", el).forEach((b) => b.onclick = () => { const i = +b.dataset.day; d.days = d.days.includes(i) ? d.days.filter((x) => x !== i) : [...d.days, i].sort(); b.classList.toggle("on"); b.setAttribute("aria-pressed", d.days.includes(i)); sum(); });
  const dd = (n) => { d.date = Math.min(31, Math.max(1, d.date + n)); $("#dv", el).textContent = d.date; sum(); };
  $("#dm", el).onclick = () => dd(-1); $("#dp", el).onclick = () => dd(1);
  $$("[data-ract]", el).forEach((b) => b.onclick = () => { d.action = b.dataset.ract; $$("[data-tick]", el).forEach((x) => { x.hidden = x.dataset.tick !== d.action; }); $$("[data-ract]", el).forEach((x) => x.setAttribute("aria-checked", x === b)); $("#rTpl", el).hidden = d.action !== "template"; sum(); haptic(4); });
  $("#rTplSel", el) && ($("#rTplSel", el).onchange = (e) => { d.tpl = e.target.value; sum(); });
  $("#rRun", el) && ($("#rRun", el).onclick = () => { Object.assign(r, d); const n = runRule(r); r.last = today(); save(); sheet.close(0, true); done && done(); render(""); toast(`${RULE_ACTIONS[r.action][0]}: ${plural(n, "item")}`); });
  $("#rDel", el) && ($("#rDel", el).onclick = () => { D.rules = D.rules.filter((x) => x.id !== r.id); save(); sheet.close(0, true); done && done(); });
}

// ================= templates =================
function renderTemplates(anim) {
  const ts = D.templates;
  appEl.innerHTML = `<div class="page nobar ${anim}">
    <div class="navbar"><div class="side"></div><div class="mid">Templates</div><div class="side r"><button type="button" class="nb" id="newTpl" aria-label="New template">${g("plus")}</button></div></div>
    <div class="ltitle"><div><h1>Templates</h1><div class="sub">Reusable lists for your routines.</div></div></div>
    ${ts.length ? `<div class="cards stagger">${ts.map((t) => { const tl = t.target !== "day" && listById(t.target);
      return `<button type="button" class="icard wall" style="${wallStyle(t.image)}" data-tpl="${t.id}">${lic(t.icon, t.color)}<span class="num">${t.items.length}</span>
        <span class="txt"><div class="name">${esc(t.name)}</div><div class="meta">${t.target === "day" ? `${g("sun", "xs")} ${esc(daysText(t.days))}` : `${g("arrowRight", "xs")} ${esc(tl ? tl.name : "A list")}`}</div></span></button>`; }).join("")}
      <button type="button" class="icard add" id="newTpl2"><div>${g("plusCircle", "l")}New Template</div></button></div>`
      : `<div class="empty">${lic("stack", "#5856d6")}<b>No templates yet</b>Save any day or list as a template from its ${inlineMore()} menu.</div><div class="btnrow"><button type="button" class="btn tint" id="newTpl2">${g("plus", "s")} New Template</button></div>`}
    <p class="foot" style="margin-top:16px">My Day templates are offered on the days you pick: when two share a day, like a Toronto and a Barrie Saturday, you choose one. List templates fill a list in one tap, or automatically with a rule.</p>
  </div>${tabbar()}`;
  bindCommon();
  $("#newTpl").onclick = $("#newTpl2").onclick = () => editTemplate({ id: null, name: "", icon: "list", color: "#5856d6", image: "sonoma-light", target: "day", days: [], items: [] });
  $$("[data-tpl]").forEach((b) => b.onclick = () => templateMenu(b, tplById(b.dataset.tpl)));
}
function templateMenu(anchor, t) {
  const tl = t.target !== "day" && listById(t.target);
  menu(anchor, [
    ...(t.target === "day" ? [
      { label: "Add to Today", icon: "calToday", fn: () => doApply(t, `day:${today()}`) },
      { label: "Add to Tomorrow", icon: "calTomorrow", fn: () => doApply(t, `day:${addDays(today(), 1)}`) },
      { label: "Add to a Day", icon: "calendar", date: today(), fn: (d) => d && doApply(t, `day:${d}`) },
    ] : tl ? [{ label: `Add to ${tl.name}`, icon: "arrowRight", fn: () => doApply(t, `list:${tl.id}`) }] : []),
    { label: "New List From Template", icon: "plusCircle", fn: () => {
      const l = newList({ name: t.name, icon: t.icon, color: t.color, image: t.image, qty: t.items.some((x) => x.qty > 1), group: t.items.some((x) => x.section) ? "section" : "none" });
      D.lists.push(l); applyTemplate(t, `list:${l.id}`); save(); go(`#/list/${l.id}`);
    } },
    { sep: true },
    { label: "Edit Template", icon: "pencil", fn: () => editTemplate(t) },
  ], `${t.name} · ${plural(t.items.length, "item")}`);
}
function doApply(t, key) {
  const { a, added } = applyTemplate(t, key); haptic(12);
  D.items.filter((i) => i.from === a.id).forEach((i) => S.newIds.add(i.id));
  const [kind, ref] = key.split(/:(.+)/); go(kind === "day" ? `#/day/${ref}` : `#/list/${ref}`);
  toast(added ? `Added ${plural(added, "item")} from ${t.name}` : "Those are already on the list", { label: "Undo", fn: () => { unapply(a.id); render(""); } });
}
function pickTemplate(key) {
  if (!D.templates.length) { toast("No templates yet. Make one in Templates."); return; }
  actionSheet({ title: "Add a template", actions: D.templates.map((t) => ({ label: t.name, fn: () => doApply(t, key) })) });
}
function editTemplate(src) {
  const t = JSON.parse(JSON.stringify(src)); if (!t.items.length) t.items.push({ title: "" });
  const isNew = !t.id;
  const extra = () => (t.target === "day" ? "time" : (listById(t.target) || {}).qty ? "qty" : "");
  const itemsHtml = () => t.items.map((it, i) => `<div class="cell item-cell" data-i="${i}"><input class="t" value="${esc(it.title)}" placeholder="Item" maxlength="200" aria-label="Item ${i + 1}">
      ${extra() === "time" ? `<input type="time" class="mini" value="${esc(it.time || "")}" aria-label="Time">` : extra() === "qty" ? `<input type="number" class="mini q" min="1" max="999" value="${it.qty || 1}" aria-label="Quantity">` : ""}
      <button type="button" class="x" aria-label="Remove item">${g("xFill", "s")}</button></div>`).join("");
  let el;
  const collect = () => {
    t.name = $("#tName", el).value.trim();
    t.items = $$(".item-cell", el).map((c) => { const old = t.items[+c.dataset.i] || {}; const x = { ...old, title: $("input.t", c).value.trim() };
      const tm = $("input[type=time]", c), q = $("input[type=number]", c); if (tm) x.time = tm.value; if (q) x.qty = Math.max(1, parseInt(q.value, 10) || 1); return x; });
  };
  const sheet = openSheet({
    title: isNew ? "New Template" : "Edit Template", left: { label: "Cancel" },
    right: { label: isNew ? "Create" : "Done", bold: true, fn: () => {
      collect(); if (!t.name) { toast("Give the template a name."); $("#tName", el).focus(); return false; }
      t.items = t.items.filter((x) => x.title);
      if (isNew) { t.id = uid(); D.templates.push(t); } else Object.assign(tplById(t.id), t);
      save(); render(""); toast(isNew ? "Template created" : "Template saved");
    } },
    html: `<div class="preview wall" id="tPrev" style="${wallStyle(t.image, false)}"><span id="tIc">${lic(t.icon, t.color, "md")}</span><b id="tPrevT">${esc(t.name || "New Template")}</b><button type="button" class="gbtn glass" id="tImg" aria-label="Change theme">${g("photo")}</button></div>
      <div class="group"><div class="cell"><input id="tName" class="bigtitle" value="${esc(t.name)}" placeholder="Template Name" maxlength="60" aria-label="Template name" style="text-align:center"></div></div>
      <div class="group"><div class="colors">${COLORS.map((c) => `<button type="button" data-color="${c}" class="${c === t.color ? "on" : ""}" style="--sw:${c}" aria-label="Colour"></button>`).join("")}</div></div>
      <div class="group"><div class="glyphs" style="--c:${t.color}">${LIST_GLYPHS.map((k) => `<button type="button" data-icon="${k}" class="${k === t.icon ? "on" : ""}" aria-label="${k}">${g(k)}</button>`).join("")}</div></div>
      <div class="sh sm"><h2>Adds to</h2></div>
      <div class="group ic"><label class="cell tap"><span class="lic sq" style="--c:#5856d6">${g("arrowRight")}</span><span class="grow">Goes into</span><select class="pillin" id="tTarget"><option value="day" ${t.target === "day" ? "selected" : ""}>My Day</option>${D.lists.map((l) => `<option value="${l.id}" ${l.id === t.target ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></label></div>
      <div id="tDays" ${t.target === "day" ? "" : "hidden"}><div class="sh sm"><h2>Offer on</h2></div>
        <div class="group"><div class="days">${DAY_LETTERS.map((x, i) => `<button type="button" data-day="${i}" class="${(t.days || []).includes(i) ? "on" : ""}" aria-pressed="${(t.days || []).includes(i)}" aria-label="${DAY_LONG[i]}">${x}</button>`).join("")}</div></div>
        <p class="foot">On these days, My Day asks which plan you want. Nothing is added until you tap it.</p></div>
      <div class="sh sm"><h2>Items</h2></div>
      <div class="group" id="items">${itemsHtml()}</div>
      <div class="group" style="margin-top:8px"><button type="button" class="cell" id="addItem"><span class="grow blue">Add Item</span><span class="blue">${g("plusCircle", "s")}</span></button></div>
      ${isNew ? "" : `<div class="group" style="margin-top:22px"><button type="button" class="cell red" id="tDel"><span class="grow">Delete Template</span>${g("trash", "s")}</button></div>`}`,
  });
  el = sheet.el;
  const paint = () => { $("#tIc", el).innerHTML = lic(t.icon, t.color, "md"); $(".glyphs", el).style.setProperty("--c", t.color); };
  $("#tName", el).oninput = (e) => { $("#tPrevT", el).textContent = e.target.value.trim() || "New Template"; };
  $$("[data-color]", el).forEach((b) => b.onclick = () => { t.color = b.dataset.color; $$("[data-color]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); });
  $$("[data-icon]", el).forEach((b) => b.onclick = () => { t.icon = b.dataset.icon; $$("[data-icon]", el).forEach((x) => x.classList.toggle("on", x === b)); paint(); });
  $("#tImg", el).onclick = () => pickImage(t.image, (k) => { t.image = k; $("#tPrev", el).setAttribute("style", wallStyle(k, false)); });
  $$("[data-day]", el).forEach((b) => b.onclick = () => { const d = +b.dataset.day; t.days = (t.days || []).includes(d) ? t.days.filter((x) => x !== d) : [...(t.days || []), d].sort(); b.classList.toggle("on"); b.setAttribute("aria-pressed", t.days.includes(d)); });
  const redraw = () => { $("#items", el).innerHTML = itemsHtml(); bindItems(); };
  const bindItems = () => $$(".item-cell", el).forEach((c) => {
    $(".x", c).onclick = () => { collect(); t.items.splice(+c.dataset.i, 1); if (!t.items.length) t.items.push({ title: "" }); redraw(); };
    $("input.t", c).onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("#addItem", el).click(); } };
  });
  bindItems();
  $("#tTarget", el).onchange = (e) => { collect(); t.target = e.target.value; $("#tDays", el).hidden = t.target !== "day"; redraw(); };
  $("#addItem", el).onclick = () => { collect(); t.items.push({ title: "" }); redraw(); const last = $$(".item-cell input.t", el).pop(); last.focus(); last.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  $("#tDel", el) && ($("#tDel", el).onclick = () => actionSheet({ title: `Delete “${t.name}”? Items it already added stay where they are.`, actions: [{ label: "Delete Template", red: true, fn: () => {
    D.templates = D.templates.filter((x) => x.id !== t.id); D.rules = D.rules.filter((r) => !(r.action === "template" && r.tpl === t.id)); save(); sheet.close(0, true); render("");
  } }] }));
  if (isNew && !t.name) setTimeout(() => $("#tName", el).focus(), reduceMotion.matches ? 0 : 340);
}

// ================= profile & settings =================
function renderSettings(anim) {
  const p = D.profile, m = Store.meta(), others = m.list.filter((x) => x.id !== PID);
  const last = p.lastBackup ? new Date(p.lastBackup).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "Never";
  const ds = doneDays(), week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const per = week.map((d) => D.items.filter((i) => i.done && i.doneAt && dayStr(new Date(i.doneAt)) === d).length), mx = Math.max(1, ...per);
  const total = D.items.filter((i) => i.done).length, st = streak();
  if (st > (p.bestStreak || 0)) { p.bestStreak = st; save(); }
  appEl.innerHTML = `<div class="page nobar ${anim}">
    <div class="navbar"><div class="side"><button type="button" class="nb back" data-go="#/">${g("chevL")}Lists</button></div><div class="mid">Profile</div><div class="side r"></div></div>
    <div style="text-align:center;padding:6px 0 4px">${avatar("big")}<div style="font-size:22px;font-weight:700">${esc(p.name)}</div><div class="foot" style="margin:2px 0 0">${plural(D.lists.length, "list")} · ${plural(D.items.length, "item")} · ${plural(D.templates.length, "template")}</div></div>
    <div class="sh sm"><h2>This week</h2></div>
    <div class="group"><div class="week">${week.map((d, i) => `<div><i class="${per[i] ? "" : "z"}" data-h="${Math.round((per[i] / mx) * 100)}" style="height:0"></i><span>${DAY_LETTERS[monIndex(d)]}</span></div>`).join("")}</div>
      <div class="statrow"><div><b>${per.reduce((a, b) => a + b, 0)}</b><span>done this week</span></div><div><b>${st}</b><span>day streak</span></div><div><b>${Math.max(p.bestStreak || 0, st)}</b><span>best streak</span></div></div></div>
    <p class="foot">${plural(total, "task")} completed, across ${plural(ds.size, "day")}.</p>
    <div class="sh sm"><h2>Name</h2></div>
    <div class="group"><div class="cell"><input id="pName" value="${esc(p.name)}" maxlength="40" aria-label="Name" enterkeyhint="done"></div></div>
    <div class="sh sm"><h2>Appearance</h2></div>
    <div class="group ic"><div class="cell" style="padding:10px 12px"><div class="seg">${[["auto", "Automatic"], ["light", "Light"], ["dark", "Dark"]].map(([k, v]) => `<button type="button" data-th="${k}" class="${(p.theme || "auto") === k ? "on" : ""}">${v}</button>`).join("")}</div></div>
      <button type="button" class="cell" id="pToday"><span class="avatar wall" style="${wallStyle(p.todayImage)};width:30px;height:30px;border-radius:8px"></span><span class="grow">My Day Theme<div class="sub">${p.todayImage === "auto" ? "Follows the time of day" : esc(WALL[p.todayImage][0])}</div></span>${g("chevR", "chev")}</button></div>
    <div class="sh sm"><h2>Backup & other devices</h2></div>
    <div class="group ic">
      <button type="button" class="cell" id="pExport"><span class="lic sq" style="--c:#34c759">${g("download")}</span><span class="grow">Download Backup<div class="sub">Last backup: ${esc(last)}</div></span>${g("chevR", "chev")}</button>
      <label class="cell tap" style="cursor:pointer"><span class="lic sq" style="--c:#007aff">${g("upload")}</span><span class="grow">Restore From Backup<div class="sub">Replaces this profile's lists</div></span>${g("chevR", "chev")}<input type="file" id="pImport" accept="application/json,.json" hidden></label></div>
    <p class="foot">Everything is saved in this browser only. To move your lists to your phone or laptop, download a backup here and restore it there. On iPhone, add the app to your Home Screen (Share → Add to Home Screen) so Safari keeps your lists.</p>
    <div class="sh sm"><h2>Profiles on this device</h2></div>
    <div class="group ic">
      <div class="cell">${avatar("", "width:30px;height:30px;font-size:12px")}<span class="grow">${esc(p.name)}<div class="sub">Current</div></span><span class="blue">${g("check", "s")}</span></div>
      ${others.map((o) => `<button type="button" class="cell" data-switch="${o.id}"><span class="avatar" style="width:30px;height:30px;font-size:12px">${esc(initials(o.name))}</span><span class="grow">${esc(o.name)}</span>${g("chevR", "chev")}</button>`).join("")}
      <button type="button" class="cell" id="pAdd"><span class="lic" style="--c:var(--fill);color:var(--accent)">${g("plus")}</span><span class="grow blue">Add a Profile</span></button></div>
    <div class="group" style="margin-top:22px"><button type="button" class="cell red" id="pDel"><span class="grow">Delete This Profile</span>${g("trash", "s")}</button></div>
    <p class="foot" style="text-align:center;margin-top:18px">Daily To Do · works offline · nothing leaves this device</p>
  </div>${tabbar()}`;
  bindCommon();
  requestAnimationFrame(() => requestAnimationFrame(() => $$(".week i").forEach((b) => { b.style.height = b.dataset.h + "%"; })));
  const nm = $("#pName");
  nm.onblur = () => { const v = nm.value.trim(); if (v && v !== p.name) { p.name = v; const mm = Store.meta(); (mm.list.find((x) => x.id === PID) || {}).name = v; Store.setMeta(mm); save(); render(""); toast("Name saved"); } else nm.value = p.name; };
  nm.onkeydown = (e) => { if (e.key === "Enter") nm.blur(); };
  $$("[data-th]").forEach((b) => b.onclick = () => { p.theme = b.dataset.th; save(); render(""); });
  $("#pToday").onclick = () => pickImage(p.todayImage, (k) => { p.todayImage = k; save(); render(""); }, true);
  $("#pExport").onclick = exportBackup;
  $("#pImport").onchange = (e) => importBackup(e.target.files[0]);
  $$("[data-switch]").forEach((b) => b.onclick = () => switchProfile(b.dataset.switch));
  $("#pAdd").onclick = () => { Store.write(PID, D); S.adding = true; D = null; render(); };
  $("#pDel").onclick = () => actionSheet({ title: `Delete ${p.name}'s profile and all its lists on this device? Download a backup first if you might want them.`, actions: [{ label: "Delete Profile", red: true, fn: () => {
    const mm = Store.meta(); Store.remove(PID); mm.list = mm.list.filter((x) => x.id !== PID); mm.active = mm.list[0] ? mm.list[0].id : null; Store.setMeta(mm);
    if (mm.active) switchProfile(mm.active); else { D = null; PID = null; render(); }
  } }] });
}
function exportBackup() {
  D.profile.lastBackup = new Date().toISOString(); save();
  const blob = new Blob([JSON.stringify({ app: "daily-to-do", ...D }, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `daily-to-do-${D.profile.name.toLowerCase().replace(/\W+/g, "-")}-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Backup downloaded"); render("");
}
const validBackup = (x) => x && Array.isArray(x.lists) && Array.isArray(x.items) && Array.isArray(x.templates) && x.profile;
function importBackup(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let x; try { x = JSON.parse(r.result); } catch { toast("That file isn't a Daily To Do backup."); return; }
    if (!validBackup(x)) { toast("That file isn't a Daily To Do backup."); return; }
    actionSheet({ title: `Replace this profile's lists with the backup (${plural(x.lists.length, "list")}, ${plural(x.items.length, "item")})?`, actions: [{ label: "Restore Backup", red: true, fn: () => {
      const keep = D.profile.name; D = migrate({ ...blankData(keep), ...x }); delete D.app; D.profile = { ...blankData(keep).profile, ...x.profile };
      Store.write(PID, D); const mm = Store.meta(); (mm.list.find((y) => y.id === PID) || {}).name = D.profile.name; Store.setMeta(mm);
      render(); toast("Backup restored");
    } }] });
  };
  r.readAsText(file);
}
function switchProfile(id) {
  const data = Store.load(id); if (!data) { toast("That profile couldn't be loaded."); return; }
  if (D) Store.write(PID, D);
  const mm = Store.meta(); mm.active = id; Store.setMeta(mm);
  D = migrate(data); PID = id; S.adding = false; runRules(); go("#/"); render();
}

// ================= welcome =================
const WELCOME_WALLS = ["tahoe-dawn", "big-sur-color-day", "sonoma-horizon", "monterey-light", "tahoe-dusk"];
function renderWelcome() {
  const m = Store.meta(), first = autoWall();
  const walls = [first, ...WELCOME_WALLS.filter((k) => k !== first)].slice(0, 4);
  appEl.innerHTML = `<div class="welcome">
    <div class="bg" id="wBg" aria-hidden="true">${walls.map((k, i) => `<i style="background-image:url(img/${k}.webp);--i:${i}"></i>`).join("")}</div>
    <div class="orbs" id="wOrbs" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="in">
    <img class="logo" src="icons/icon-192.png" alt="">
    <h1>${S.adding ? "New Profile" : "Daily To Do"}</h1>
    <p>My Day, habits you keep, lists for anything, and templates for your routines.</p>
    <form id="wForm" novalidate>
      <div class="field glass"><input id="wName" placeholder="Your name" autocomplete="given-name" maxlength="40" aria-label="Your name"></div>
      <button class="btn" type="submit">Get Started</button>
      ${m.list.length ? `<button type="button" class="link" id="wBack">Back to ${esc((m.list.find((x) => x.id === m.active) || m.list[0]).name)}</button>` : `<label class="link">Restore from a backup file<input type="file" id="wImport" accept="application/json,.json" hidden></label>`}
    </form></div></div>`;
  // start the crossfade only once every picture is decoded, so nothing pops in half-drawn
  Promise.all(walls.map((k) => { const im = new Image(); im.src = `img/${k}.webp`; IMG_KEEP.set(k, im); return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); }))
    .then(() => { const bg = $("#wBg"), orbs = $("#wOrbs"); if (bg) bg.classList.add("ready"); if (orbs) orbs.classList.add("ready"); });
  $("#wForm").onsubmit = (e) => { e.preventDefault(); const n = $("#wName").value.trim(); if (!n) { const f = $(".field", appEl); f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); $("#wName").focus(); toast("What should we call you?"); return; } createProfile(n); };
  $("#wBack") && ($("#wBack").onclick = () => switchProfile(m.active || m.list[0].id));
  $("#wImport") && ($("#wImport").onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const x = JSON.parse(r.result); if (!validBackup(x)) throw 0; const id = createProfile(x.profile.name || "Me"); D = migrate({ ...blankData(x.profile.name), ...x }); delete D.app; Store.write(id, D); render(); toast("Backup restored"); } catch { toast("That file isn't a Daily To Do backup."); } };
    r.readAsText(f);
  });
}
function createProfile(name) {
  const id = uid(); D = blankData(name); PID = id;
  Store.write(id, D); const m = Store.meta(); m.list.push({ id, name }); m.active = id; Store.setMeta(m);
  S.adding = false;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { /* unsupported */ }
  const home = `#/day/${today()}`; // land on My Day, where the first task and habit go
  if (location.hash !== home) go(home, true); else { S.route = parseHash(); render("fade-in"); }
  return id;
}

// ================= sheets, menus, action sheets =================
const sheetsEl = $("#sheets"), openSheets = [];
function openSheet({ title, left, right, html, full }) {
  closeMenu();
  const scrim = document.createElement("div"); scrim.className = "scrim";
  const el = document.createElement("div"); el.className = "sheet" + (full ? " full" : "");
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title || "");
  el.innerHTML = `<div class="grab" aria-hidden="true"></div><header><button type="button" class="nb" data-left>${esc(left ? left.label : "")}</button><h3>${esc(title || "")}</h3><button type="button" class="nb ${right && right.bold ? "b" : ""}" data-right>${esc(right ? right.label : "")}</button></header><div class="scroll">${html}</div>`;
  sheetsEl.append(scrim, el); document.body.style.overflow = "hidden";
  const desk = isDesktop();
  let y = 0, sp = null, closed = false;
  const H = () => (desk ? window.innerHeight : el.offsetHeight);
  const set = (v) => { y = v; el.style.transform = desk ? `translate(-50%, calc(-50% + ${v}px))` : `translateY(${v}px)`; scrim.style.opacity = String(Math.max(0, 1 - v / H())); };
  set(H()); sp = spring({ from: y, to: 0, response: 0.36, onUpdate: set });
  const api = {
    el, onBeforeClose: null,
    close(velocity = 0, discard = false) {
      if (closed) return; closed = true; sp && sp.stop(); closeMenu();
      if (!discard && api.onBeforeClose) { try { api.onBeforeClose(); } catch (err) { console.error(err); } }
      if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur();
      sp = spring({ from: y, to: H() + 20, velocity, response: 0.3, onUpdate: set, onDone: () => { el.remove(); scrim.remove(); openSheets.splice(openSheets.indexOf(api), 1); if (!openSheets.length) document.body.style.overflow = ""; } });
    },
  };
  openSheets.push(api);
  const lb = $("[data-left]", el), rb = $("[data-right]", el);
  if (!left) lb.style.visibility = "hidden"; if (!right) rb.style.visibility = "hidden";
  const dismiss = (v = 0) => api.close(v, !!left);       // with a Cancel button, dismissing discards; otherwise it keeps changes
  scrim.onclick = () => dismiss();
  lb.onclick = () => { left && left.fn && left.fn(); api.close(0, true); };
  rb.onclick = () => { if (!right) return; const r = right.fn ? right.fn() : undefined; if (r !== false) api.close(0, !!right.fn); };
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") dismiss(); });
  if (!desk) {
    const drag = (h) => h.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return; sp && sp.stop(); h.setPointerCapture(e.pointerId);
      const y0 = e.clientY - y, tr = tracker(); tr.add(0, e.clientY);
      const move = (ev) => { tr.add(0, ev.clientY); let v = ev.clientY - y0; if (v < 0) v = -rubber(-v, H()); set(v); };
      const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up);
        const vy = tr.v().y; if (y + project(vy) > H() * 0.5 && vy > -100) dismiss(vy); else sp = spring({ from: y, to: 0, velocity: vy, response: 0.3, damping: 0.85, onUpdate: set }); };
      h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
    });
    drag($(".grab", el)); drag($("header", el));
  }
  return api;
}
function closeAllSheets() { [...openSheets].forEach((s) => s.close(0, true)); }

let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
function menu(anchor, items, title) {
  closeMenu();
  const wrap = document.createElement("div"); menuEl = wrap;
  wrap.innerHTML = `<div class="menu-scrim"></div><div class="menu" role="menu"></div>`;
  document.body.appendChild(wrap);
  const box = $(".menu", wrap);
  const draw = (list, back) => {
    box.innerHTML = (title && !back ? `<div class="mh">${esc(title)}</div>` : "") + (back ? `<button type="button" role="menuitem" data-back>${g("chevL", "s")}<span class="lbl"><b>${esc(back)}</b></span></button><div class="sep"></div>` : "")
      + list.map((it, i) => it.sep ? `<div class="sep"></div>` : `<button type="button" role="${it.checked !== undefined ? "menuitemradio" : "menuitem"}" ${it.checked !== undefined ? `aria-checked="${it.checked}"` : ""} data-i="${i}" class="${it.red ? "red" : ""} ${it.date ? "date" : ""}">
        ${it.checked !== undefined ? `<span class="tick">${it.checked ? g("check", "s") : ""}</span>` : ""}<span class="lbl">${esc(it.label)}${it.value !== undefined && it.value !== "" ? `<small>${esc(String(it.value))}</small>` : ""}</span>
        ${it.sub ? g("chevR", "s") : it.icon ? g(it.icon) : ""}${it.date ? `<input type="date" value="${esc(it.date)}" aria-label="${esc(it.label)}">` : ""}</button>`).join("");
    $$("[data-i]", box).forEach((b) => {
      const it = list[+b.dataset.i];
      if (it.date) { $("input", b).onchange = (e) => { if (validDay(e.target.value)) { closeMenu(); it.fn(e.target.value); } }; return; }
      b.onclick = () => { if (it.sub) { draw(it.sub, it.label); return; } closeMenu(); haptic(4); it.fn && it.fn(); };
    });
    const bk = $("[data-back]", box); if (bk) bk.onclick = () => draw(items);
  };
  draw(items);
  const r = anchor.getBoundingClientRect(), mw = box.offsetWidth, mh = box.offsetHeight, vw = innerWidth, vh = innerHeight;
  const right = r.left + r.width / 2 > vw / 2;
  let left = right ? r.right - mw : r.left; left = Math.max(12, Math.min(left, vw - mw - 12));
  let top = r.bottom + 6; const above = top + mh > vh - 12;
  if (above) top = Math.max(12, r.top - mh - 6);
  box.style.left = left + "px"; box.style.top = top + "px";
  box.style.setProperty("--ox", `${right ? "right" : "left"} ${above ? "bottom" : "top"}`);
  $(".menu-scrim", wrap).onclick = closeMenu;
  wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  haptic(6);
}
function actionSheet({ title, actions }) {
  closeMenu();
  const scrim = document.createElement("div"); scrim.className = "scrim";
  const el = document.createElement("div"); el.className = "sheet"; el.style.background = "transparent"; el.style.boxShadow = "none";
  el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="actions"><div class="group">${title ? `<div class="title">${esc(title)}</div>` : ""}${actions.map((a, i) => `<button type="button" data-i="${i}" class="${a.red ? "red" : ""}">${esc(a.label)}</button>`).join("")}</div><div class="group"><button type="button" class="cancel" data-cancel>Cancel</button></div></div>`;
  sheetsEl.append(scrim, el);
  const desk = isDesktop(); let y = 0, sp, done = false;
  const H = () => (desk ? window.innerHeight : el.offsetHeight);
  const set = (v) => { y = v; el.style.transform = desk ? `translate(-50%, calc(-50% + ${v}px))` : `translateY(${v}px)`; scrim.style.opacity = String(Math.max(0, 1 - v / H())); };
  set(H()); sp = spring({ from: y, to: 0, response: 0.32, onUpdate: set });
  const close = (fn) => { if (done) return; done = true; sp.stop(); sp = spring({ from: y, to: H() + 10, response: 0.28, onUpdate: set, onDone: () => { el.remove(); scrim.remove(); } }); fn && fn(); };
  scrim.onclick = () => close(); $("[data-cancel]", el).onclick = () => close();
  $$("[data-i]", el).forEach((b) => b.onclick = () => close(actions[+b.dataset.i].fn));
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// ================= start =================
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !D) return;
  const t = today();
  if (S.lastToday && S.lastToday !== t) {
    runRules();
    if (S.route.name === "day" && S.route.day === S.lastToday) go(`#/day/${t}`, true);
    else if (!openSheets.length && !$(".composer")) render("");
  }
  S.lastToday = t;
});
window.addEventListener("storage", (e) => {
  if (D && e.key === `${KEY}.p.${PID}` && e.newValue) { try { D = migrate(JSON.parse(e.newValue)); if (!openSheets.length && !$(".composer")) render(""); } catch { /* ignore */ } }
});
window.addEventListener("resize", closeMenu);
(function boot() {
  const m = Store.meta();
  if (m.active) { D = migrate(Store.load(m.active)); PID = D ? m.active : null; }
  S.route = parseHash(); S.lastToday = today();
  if (D) { Store.write(PID, D); runRules(); }
  render();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
