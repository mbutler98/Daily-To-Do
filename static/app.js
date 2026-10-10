/* Daily To Do: day lists and reusable templates. Plain JS, no build step. */
"use strict";

// ---------- helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const store = {
  get(k, d) { try { const v = localStorage.getItem("dt." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("dt." + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const haptic = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* not supported */ } };

const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => dayStr(new Date());
const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
const weekdayName = (s) => parseDay(s).toLocaleDateString("en-CA", { weekday: "long" });
const longDate = (s) => parseDay(s).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: parseDay(s).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
const shortDate = (s) => parseDay(s).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
const monIndex = (s) => (parseDay(s).getDay() + 6) % 7; // Monday = 0, like the server
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}
function relDay(s) {
  const t = today();
  if (s === t) return "Today";
  if (s === addDays(t, 1)) return "Tomorrow";
  if (s === addDays(t, -1)) return "Yesterday";
  return "";
}
function daysText(days) {
  if (!days.length) return "Any day";
  if (days.length === 7) return "Every day";
  if (days.join() === "0,1,2,3,4") return "Weekdays";
  if (days.join() === "5,6") return "Weekends";
  return days.map((d) => DAY_SHORT[d]).join(", ");
}

const I = {
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>',
  starOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l-8 8 8 8"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l8 8-8 8"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l6 6-6 6"/></svg>',
  down: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5l4.5 4.5L11.5 5"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9.5"/><circle cx="7.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="16.5" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6h14M5 12h14M5 18h9"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 01-4 4H4"/></svg>',
  x: '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 2l6 6M8 2L2 8"/></svg>',
  xcircle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm3.5 12.1l-1.4 1.4L12 13.4l-2.1 2.1-1.4-1.4 2.1-2.1-2.1-2.1 1.4-1.4 2.1 2.1 2.1-2.1 1.4 1.4-2.1 2.1z"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h16M4 12h16M4 16h16"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  tabDay: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="5.5" width="20" height="18" rx="4"/><path d="M4 11h20M9.5 3v5M18.5 3v5"/><path d="M9.5 17l3 3 6-6" stroke-width="2"/></svg>',
  tabTpl: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="8.5" height="8.5" rx="2.2"/><rect x="15.5" y="4" width="8.5" height="8.5" rx="2.2"/><rect x="4" y="15.5" width="8.5" height="8.5" rx="2.2"/><path d="M19.75 16v7.5M16 19.75h7.5"/></svg>',
  tabMe: '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="14" cy="14" r="11"/><circle cx="14" cy="11.5" r="4"/><path d="M6.5 22c1.8-3 4.5-4.5 7.5-4.5s5.7 1.5 7.5 4.5"/></svg>',
};

// ---------- API ----------
async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method, credentials: "same-origin",
      headers: { "X-Requested-With": "daily-todo", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the app. Is the laptop on and connected?");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && data.login) { S.user = null; render(); throw new Error(data.error); }
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

// ---------- toast ----------
let toastTimer;
function toast(msg, action) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  el.hidden = false;
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  if (action) $("button", el).onclick = () => { el.hidden = true; action.fn(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 5000 : 2600);
}
const oops = (e) => toast(e.message || String(e));

// ---------- springs (interruptible, velocity-aware; critically damped by default) ----------
function spring({ from, to, velocity = 0, response = 0.35, damping = 1, onUpdate, onDone }) {
  if (reduceMotion.matches) { onUpdate(to); onDone && onDone(); return { stop() {}, value: () => to, velocity: () => 0 }; }
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
  return { stop() { stopped = true; cancelAnimationFrame(raf); }, value: () => x, velocity: () => v };
}
const project = (v, d = 0.998) => ((v / 1000) * d) / (1 - d); // where a flick would come to rest
function rubber(over, dim, c = 0.55) { return (over * dim * c) / (dim + c * Math.abs(over)); }
function tracker() { // recent pointer positions, for release velocity
  const pts = [];
  return {
    add(x, y) { const t = performance.now(); pts.push({ x, y, t }); while (pts.length > 2 && t - pts[0].t > 100) pts.shift(); },
    v() { if (pts.length < 2) return { x: 0, y: 0 }; const a = pts[0], b = pts[pts.length - 1], dt = Math.max(1, b.t - a.t) / 1000; return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }; },
  };
}

// ---------- state ----------
const S = {
  user: undefined, signupsOpen: true, first: false,
  tab: store.get("tab", "day"), day: today(), data: null, templates: null,
  showDone: store.get("showDone", true), editing: false, newIds: new Set(),
};

function setTab(t) { S.tab = t; store.set("tab", t); S.editing = false; render(); window.scrollTo(0, 0); }

// ---------- rendering ----------
const appEl = $("#app");
function render(anim = "fade-in") {
  if (S.user === undefined) return;
  if (!S.user) return renderAuth();
  if (S.tab === "templates") renderTemplates(anim);
  else if (S.tab === "profile") renderProfile(anim);
  else renderDay(anim);
}

function tabbar() {
  const b = (id, icon, label) => `<button type="button" data-tab="${id}" class="${S.tab === id ? "on" : ""}" aria-current="${S.tab === id ? "page" : "false"}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabbar">${b("day", I.tabDay, "Days")}${b("templates", I.tabTpl, "Templates")}${b("profile", I.tabMe, "Profile")}</nav>`;
}
function bindTabbar() {
  $$(".tabbar button").forEach((btn) => btn.addEventListener("click", () => {
    if (btn.dataset.tab === S.tab && S.tab === "day") { goDay(today()); return; }
    setTab(btn.dataset.tab);
  }));
}
function bindNavbarScroll() {
  const nav = $(".navbar");
  if (!nav) return;
  const on = () => nav.classList.toggle("scrolled", window.scrollY > 30);
  window.onscroll = on; on();
}

// ===== Day view =====
async function loadDay(day = S.day) {
  const d = await api("GET", `/api/day/${day}?today=${today()}`);
  if (day === S.day) S.data = d;
  return d;
}
async function goDay(day, dir = 0) {
  S.day = day; S.editing = false;
  try { await loadDay(day); } catch (e) { oops(e); return; }
  render(dir > 0 ? "slide-l" : dir < 0 ? "slide-r" : "fade-in");
}

function taskRow(t, opts = {}) {
  const meta = [];
  if (opts.showDay) meta.push(`<span class="late">${esc(shortDate(t.day))}</span>`);
  if (t.time) meta.push(`<span>${I.clock} ${fmtTime(t.time)}</span>`);
  if (t.notes) meta.push(`<span>${I.note} ${esc(t.notes.split("\n")[0].slice(0, 40))}</span>`);
  if (t.applied_id) meta.push(`<span title="From a template">${I.repeat}</span>`);
  const editing = S.editing && !opts.showDay;
  return `<div class="row-wrap ${S.newIds.has(t.id) ? "row-in" : ""}" data-id="${t.id}">
    <div class="behind"><span>Tomorrow</span><span>Delete</span></div>
    <div class="row ${t.done ? "done" : ""}">
      ${editing ? `<button type="button" class="minus" data-act="del" aria-label="Delete ${esc(t.title)}">−</button>` :
        `<button type="button" class="check" data-act="done" role="checkbox" aria-checked="${t.done}" aria-label="Done: ${esc(t.title)}">${I.check}</button>`}
      <div class="body" data-act="open"><div class="title">${esc(t.title)}</div>${meta.length ? `<div class="meta">${meta.join("")}</div>` : ""}</div>
      ${editing ? `<span class="handle" aria-label="Drag to reorder">${I.grip}</span>` :
        `<button type="button" class="star ${t.starred ? "on" : ""}" data-act="star" aria-pressed="${t.starred}" aria-label="Star">${t.starred ? I.starOn : I.star}</button>`}
    </div></div>`;
}

function sortTasks(list) {
  // starred first (like the screenshot's app), then the order you set
  return [...list].sort((a, b) => (b.starred - a.starred) || (a.position - b.position) || (a.id - b.id));
}

function renderDay(anim) {
  const d = S.data;
  if (!d || d.day !== S.day) { loadDay().then(() => render(anim)).catch(oops); return; }
  const t0 = today(), isPast = S.day < t0, rel = relDay(S.day);
  const open = S.editing ? [...d.tasks.filter((t) => !t.done)].sort((a, b) => a.position - b.position) : sortTasks(d.tasks.filter((t) => !t.done));
  const done = d.tasks.filter((t) => t.done).sort((a, b) => (b.done_at || "").localeCompare(a.done_at || ""));
  const tc = (c) => `var(--c-${c || "blue"})`;

  let suggest = "";
  if (d.suggest.length && !isPast && !S.editing) {
    const q = d.suggest.length > 1 ? `It's ${weekdayName(S.day)}. Which plan?` : `Your ${weekdayName(S.day)} template`;
    suggest = `<div class="suggest fade-in"><p>${esc(q)}</p><div class="choices">${d.suggest.map((s) =>
      `<button type="button" class="tchip" style="--tc:${tc(s.color)}" data-apply="${s.id}">${esc(s.emoji || "")} ${esc(s.name)} <span class="n">· ${s.count}</span></button>`).join("")}</div></div>`;
  }
  const applied = d.applied.length ? `<div class="applied">${d.applied.map((a) => {
    const t = (S.templates || []).find((x) => x.id === a.template_id);
    return `<span class="tchip" style="--tc:${tc(t && t.color)}">${esc((t && t.emoji) || "")} ${esc(a.name)}<button type="button" class="x" data-unapply="${a.id}" aria-label="Remove ${esc(a.name)}">${I.x}</button></span>`;
  }).join("")}</div>` : "";

  const overdue = d.overdue.length && !S.editing ? `<div class="sechead"><h2>From earlier · ${d.overdue.length}</h2><button type="button" id="carry">Move to today</button></div>
    <div class="tasks" data-list="overdue">${d.overdue.map((t) => taskRow(t, { showDay: true })).join("")}</div>` : "";

  const emptyMsg = !open.length && !done.length && !d.suggest.length
    ? `<div class="empty"><div class="big">☀️</div>Nothing planned${rel ? " " + rel.toLowerCase() : ""}.<br>Tap <b>Add a Task</b>, or set up a template.</div>`
    : !open.length && done.length ? `<div class="empty"><div class="big">🎉</div>All done${rel === "Today" ? " for today" : ""}.</div>` : "";

  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar">
      <div class="navgroup">
        <button type="button" class="navbtn" id="prev" aria-label="Previous day">${I.left}</button>
        <button type="button" class="navbtn" id="next" aria-label="Next day">${I.right}</button>
        ${S.day !== t0 ? `<button type="button" class="navbtn" id="goToday">Today</button>` : ""}
      </div>
      <div class="mid">${esc(weekdayName(S.day))}</div>
      <div class="navgroup">
        ${d.tasks.length ? `<button type="button" class="navbtn ${S.editing ? "bold" : ""}" id="edit">${S.editing ? "Done" : "Edit"}</button>` : ""}
        <button type="button" class="navbtn" id="more" aria-label="More">${I.more}</button>
      </div>
    </div>
    <label class="largetitle datebtn">
      <h1 class="accent">${esc(weekdayName(S.day))}</h1>
      <div class="sub">${esc(longDate(S.day))} ${rel ? `<span class="pill ${rel === "Today" ? "accent" : ""}">${rel}</span>` : ""}</div>
      <input type="date" id="pick" value="${S.day}" aria-label="Pick a date">
    </label>
    ${applied}
    ${suggest}
    ${overdue}
    ${overdue && open.length ? `<div class="sechead"><h2>${esc(rel || weekdayName(S.day))}</h2></div>` : ""}
    <div class="tasks ${S.editing ? "editing" : ""}" data-list="open" style="${overdue || suggest || applied ? "margin-top:10px" : ""}">${open.map((t) => taskRow(t)).join("")}</div>
    ${emptyMsg}
    ${done.length ? `<button type="button" class="chip-toggle ${S.showDone ? "" : "closed"}" id="toggleDone" aria-expanded="${S.showDone}">${I.down} Completed <span style="color:var(--label-2);font-weight:400">${done.length}</span></button>
      ${S.showDone ? `<div class="tasks" data-list="done">${done.map((t) => taskRow(t)).join("")}</div>` : ""}` : ""}
  </div>
  ${S.editing ? "" : `<div class="addbar"><button type="button" class="addbtn" id="add">${I.plus} Add a Task</button></div>`}
  ${tabbar()}`;
  S.newIds.clear();

  bindTabbar(); bindNavbarScroll();
  $("#prev").onclick = () => goDay(addDays(S.day, -1), -1);
  $("#next").onclick = () => goDay(addDays(S.day, 1), 1);
  $("#goToday") && ($("#goToday").onclick = () => goDay(t0, t0 > S.day ? 1 : -1));
  $("#pick").onchange = (e) => e.target.value && goDay(e.target.value, e.target.value > S.day ? 1 : -1);
  $("#edit") && ($("#edit").onclick = () => { S.editing = !S.editing; render(""); });
  $("#more").onclick = dayMenu;
  $("#add") && ($("#add").onclick = openComposer);
  $("#toggleDone") && ($("#toggleDone").onclick = () => { S.showDone = !S.showDone; store.set("showDone", S.showDone); render(""); });
  $("#carry") && ($("#carry").onclick = carryOver);
  $$("[data-apply]").forEach((b) => b.onclick = () => applyTemplate(+b.dataset.apply, S.day));
  $$("[data-unapply]").forEach((b) => b.onclick = () => unapply(+b.dataset.unapply));
  $$(".row-wrap").forEach(bindRow);
  swipeDays();
}

function findTask(id) {
  const d = S.data;
  return d.tasks.find((t) => t.id === id) || d.overdue.find((t) => t.id === id);
}

async function patchTask(t, fields, { rerender = true, delay = 0 } = {}) {
  const before = { ...t };
  Object.assign(t, fields);
  if (rerender) delay ? setTimeout(() => render(""), delay) : render("");
  try {
    const r = await api("PATCH", `/api/tasks/${t.id}`, fields);
    Object.assign(t, r.task);
  } catch (e) { Object.assign(t, before); render(""); oops(e); }
}

function bindRow(wrap) {
  const id = +wrap.dataset.id, row = $(".row", wrap);
  const t = findTask(id);
  if (!t) return;
  let swiped = false;
  row.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (!act || swiped) return;
    const a = act.dataset.act;
    if (a === "done") {
      haptic(10);
      row.classList.toggle("done", !t.done);
      act.setAttribute("aria-checked", String(!t.done));
      const late = S.data.overdue.includes(t);
      patchTask(t, { done: !t.done }, { rerender: !late, delay: 380 });
      if (late) setTimeout(() => { S.data.overdue = S.data.overdue.filter((x) => !x.done); render(""); }, 400);
    } else if (a === "star") {
      haptic(6);
      patchTask(t, { starred: !t.starred });
    } else if (a === "open") {
      editTask(t);
    } else if (a === "del") {
      deleteTask(t);
    }
  });
  // press highlight on pointer-down (instant feedback)
  row.addEventListener("pointerdown", (e) => { if (e.target.closest(".body")) row.classList.add("pressed"); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => row.addEventListener(ev, () => row.classList.remove("pressed")));

  if (S.editing) { const hnd = $(".handle", row); hnd && bindReorder(wrap, hnd); return; }

  // swipe: left = delete, right = move to tomorrow (next day)
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
    let v = e.clientX - start.x;
    const lim = W() * 0.9;
    if (Math.abs(v) > lim) v = Math.sign(v) * (lim + rubber(Math.abs(v) - lim, W()));
    set(v);
  });
  const end = () => {
    if (!start) return;
    const was = mode; start = null;
    if (was !== "swipe") return;
    const vx = tr.v().x, land = x + project(vx, 0.99), w = W();
    if (land < -w * 0.45) {
      haptic(12);
      sp = spring({ from: x, to: -w - 20, velocity: vx, response: 0.25, onUpdate: set, onDone: () => deleteTask(t) });
    } else if (land > w * 0.4) {
      haptic(12);
      sp = spring({ from: x, to: w + 20, velocity: vx, response: 0.25, onUpdate: set, onDone: () => moveTask(t, addDays(t.day === S.day || t.day > S.day ? S.day : today(), 1)) });
    } else {
      sp = spring({ from: x, to: 0, velocity: vx, response: 0.3, damping: 0.85, onUpdate: set });
    }
    setTimeout(() => { swiped = false; }, 50);
  };
  row.addEventListener("pointerup", end);
  row.addEventListener("pointercancel", end);
}

// Drag to reorder (edit mode): the row follows the finger 1:1; the others make room.
function bindReorder(wrap, handle) {
  const list = wrap.parentElement;
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const wraps = $$(".row-wrap", list), from = wraps.indexOf(wrap);
    const rects = wraps.map((w) => w.getBoundingClientRect());
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 6;
    const step = rects[from].height + gap, y0 = e.clientY;
    let to = from;
    wrap.style.zIndex = 3; $(".row", wrap).classList.add("dragging");
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
      wraps.forEach((w, i) => {
        if (w === wrap) return;
        const shift = from < to && i > from && i <= to ? -step : from > to && i < from && i >= to ? step : 0;
        w.style.transform = shift ? `translateY(${shift}px)` : "";
      });
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
      const ids = wraps.map((w) => +w.dataset.id);
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      ids.forEach((tid, i) => { const t = findTask(tid); if (t) t.position = i + 1; });
      render("");
      api("POST", "/api/tasks/reorder", { ids }).catch(oops);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
  });
}

// Horizontal swipe on the big title moves between days.
function swipeDays() {
  const el = $(".largetitle");
  let sx = null, sy = 0;
  el.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); goDay(addDays(S.day, dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
  });
}

async function deleteTask(t) {
  const d = S.data;
  d.tasks = d.tasks.filter((x) => x !== t); d.overdue = d.overdue.filter((x) => x !== t);
  render("");
  try {
    await api("DELETE", `/api/tasks/${t.id}`);
    toast(`Deleted “${t.title.slice(0, 30)}”`, { label: "Undo", fn: () => restoreTask(t) });
  } catch (e) { oops(e); goDay(S.day); }
}
async function restoreTask(t) {
  try {
    const r = await api("POST", "/api/tasks", { day: t.day, title: t.title, notes: t.notes, time: t.time, starred: t.starred, done: t.done, position: t.position });
    S.newIds.add(r.task.id);
    await goDay(S.day);
  } catch (e) { oops(e); }
}
async function moveTask(t, day) {
  const d = S.data;
  d.tasks = d.tasks.filter((x) => x !== t); d.overdue = d.overdue.filter((x) => x !== t);
  const old = t.day;
  if (day === S.day) { t.day = day; d.tasks.push(t); }
  render("");
  try {
    await api("PATCH", `/api/tasks/${t.id}`, { day });
    toast(`Moved to ${relDay(day) || shortDate(day)}`, { label: "Undo", fn: async () => { await api("PATCH", `/api/tasks/${t.id}`, { day: old }).catch(oops); goDay(S.day); } });
  } catch (e) { oops(e); goDay(S.day); }
}
async function carryOver() {
  const ids = S.data.overdue.map((t) => t.id);
  try {
    await api("POST", "/api/tasks/move", { ids, day: S.day });
    ids.forEach((i) => S.newIds.add(i));
    await goDay(S.day);
    toast(`Moved ${ids.length} to today`);
  } catch (e) { oops(e); }
}

async function applyTemplate(id, day) {
  try {
    const r = await api("POST", `/api/templates/${id}/apply`, { day });
    haptic(12);
    const before = new Set((S.data && S.data.day === day ? S.data.tasks : []).map((t) => t.id));
    if (day === S.day) {
      await loadDay();
      S.data.tasks.forEach((t) => { if (!before.has(t.id)) S.newIds.add(t.id); });
      if (S.tab === "day") render("");
    }
    const tpl = (S.templates || []).find((t) => t.id === id);
    const where = day === S.day && S.tab === "day" ? "" : ` to ${relDay(day) || shortDate(day)}`;
    toast(r.added ? `Added ${r.added} task${r.added === 1 ? "" : "s"}${where}` : `Already on ${relDay(day) || shortDate(day)}`, {
      label: "Undo", fn: async () => { await api("DELETE", `/api/applied/${r.applied_id}`).catch(oops); if (day === S.day) goDay(S.day); },
    });
    void tpl;
  } catch (e) { oops(e); }
}
function unapply(aid) {
  const a = S.data.applied.find((x) => x.id === aid);
  const n = S.data.tasks.filter((t) => t.applied_id === aid && !t.done).length;
  actionSheet({
    title: `Remove “${a.name}” from this day? ${n ? `Its ${n} unfinished task${n === 1 ? "" : "s"} will be removed.` : ""} Ticked-off tasks stay.`,
    actions: [{ label: "Remove Template", danger: true, fn: async () => { await api("DELETE", `/api/applied/${aid}`).catch(oops); goDay(S.day); } }],
  });
}

function dayMenu() {
  const d = S.data, hasDone = d.tasks.some((t) => t.done), open = d.tasks.filter((t) => !t.done);
  const acts = [{ label: "Add From a Template…", fn: pickTemplateFor }];
  if (d.tasks.length) acts.push({ label: "Save Day as Template…", fn: saveDayAsTemplate });
  if (open.length) acts.push({ label: `Move Unfinished to ${S.day === today() ? "Tomorrow" : "Next Day"}`, fn: async () => {
    try { await api("POST", "/api/tasks/move", { ids: open.map((t) => t.id), day: addDays(S.day, 1) }); await goDay(S.day); toast(`Moved ${open.length} to ${relDay(addDays(S.day, 1)) || shortDate(addDays(S.day, 1))}`); } catch (e) { oops(e); }
  } });
  if (hasDone) acts.push({ label: "Clear Completed", danger: true, fn: async () => {
    try { await api("POST", `/api/day/${S.day}/clear-done`); await goDay(S.day); } catch (e) { oops(e); }
  } });
  actionSheet({ title: `${weekdayName(S.day)}, ${longDate(S.day)}`, actions: acts });
}
async function pickTemplateFor() {
  await ensureTemplates();
  if (!S.templates.length) { toast("No templates yet. Make one in Templates."); return; }
  actionSheet({
    title: `Add a template to ${relDay(S.day) || weekdayName(S.day)}`,
    actions: S.templates.map((t) => ({ label: `${t.emoji || ""} ${t.name}`.trim(), fn: () => applyTemplate(t.id, S.day) })),
  });
}
async function saveDayAsTemplate() {
  await ensureTemplates();
  const draft = { id: null, name: `${weekdayName(S.day)} plan`, emoji: "📋", color: "blue", days: [monIndex(S.day)],
    items: S.data.tasks.map((t) => ({ title: t.title, time: t.time, notes: t.notes })) };
  editTemplate(draft);
}

// ----- composer (Add a Task) -----
function openComposer() {
  const wrap = document.createElement("div");
  let starred = false, time = "";
  wrap.innerHTML = `<div class="composer-scrim"></div><div class="composer">
    <div class="line"><span class="ring"></span><input id="newTitle" placeholder="Add a Task" enterkeyhint="done" maxlength="200" autocomplete="off"></div>
    <div class="tools">
      <button type="button" class="tool" id="cStar" aria-pressed="false" aria-label="Star">${I.star}</button>
      <label class="tool" id="cTimeL">${I.clock}<span id="cTimeT">Time</span><input type="time" id="cTime" aria-label="Time"></label>
      <button type="button" class="sendbtn" id="cSend" disabled aria-label="Add">${I.up}</button>
    </div></div>`;
  document.body.appendChild(wrap);
  const inp = $("#newTitle", wrap);
  inp.focus(); // same tap as the button, so iOS opens the keyboard
  const close = () => { wrap.remove(); };
  $(".composer-scrim", wrap).onclick = close;
  inp.oninput = () => { $("#cSend", wrap).disabled = !inp.value.trim(); };
  $("#cStar", wrap).onclick = () => {
    starred = !starred; const b = $("#cStar", wrap);
    b.classList.toggle("star-on", starred); b.innerHTML = starred ? I.starOn : I.star; b.setAttribute("aria-pressed", starred); inp.focus();
  };
  $("#cTime", wrap).onchange = (e) => { time = e.target.value; $("#cTimeT", wrap).textContent = time ? fmtTime(time) : "Time"; $("#cTimeL", wrap).classList.toggle("on", !!time); };
  const send = async () => {
    const title = inp.value.trim();
    if (!title) { close(); return; }
    inp.value = ""; $("#cSend", wrap).disabled = true;
    try {
      const r = await api("POST", "/api/tasks", { day: S.day, title, starred, time });
      S.data.tasks.push(r.task); S.newIds.add(r.task.id);
      starred = false; time = ""; $("#cStar", wrap).classList.remove("star-on"); $("#cStar", wrap).innerHTML = I.star;
      $("#cTime", wrap).value = ""; $("#cTimeT", wrap).textContent = "Time"; $("#cTimeL", wrap).classList.remove("on");
      render("");
      haptic(6);
    } catch (e) { inp.value = title; oops(e); }
    inp.focus();
  };
  $("#cSend", wrap).onclick = send;
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } if (e.key === "Escape") close(); });
}

// ----- edit a task -----
function editTask(t) {
  const sheet = openSheet({
    title: "Details",
    left: { label: "Cancel" },
    right: { label: "Done", bold: true, fn: async () => {
      const f = {
        title: $("#eTitle").value.trim(), notes: $("#eNotes").value, time: $("#eTime").value,
        day: $("#eDay").value || t.day, starred: $("#eStar").checked,
      };
      if (!f.title) { toast("Give the task a name."); return false; }
      const moved = f.day !== t.day;
      try {
        await api("PATCH", `/api/tasks/${t.id}`, f);
        Object.assign(t, f);
        if (moved) { await goDay(S.day); toast(`Moved to ${relDay(f.day) || shortDate(f.day)}`); } else render("");
      } catch (e) { oops(e); return false; }
    } },
    html: `<div class="group">
        <div class="cell"><input id="eTitle" class="bigtitle" value="${esc(t.title)}" maxlength="200" aria-label="Task"></div>
        <div class="cell"><textarea id="eNotes" placeholder="Notes" maxlength="2000" aria-label="Notes">${esc(t.notes)}</textarea></div>
      </div>
      <div class="group">
        <label class="cell"><span class="icon-sq" style="--tc:var(--c-red)">📅</span><span class="grow">Date</span><input type="date" id="eDay" value="${t.day}"></label>
        <label class="cell"><span class="icon-sq">${I.clock}</span><span class="grow">Time</span><input type="time" id="eTime" value="${esc(t.time)}"></label>
        <label class="cell"><span class="icon-sq" style="--tc:var(--c-yellow)">${I.starOn}</span><span class="grow">Starred</span><span class="switch"><input type="checkbox" id="eStar" ${t.starred ? "checked" : ""}><span></span></span></label>
      </div>
      <div class="group">
        <button type="button" class="cell" id="eTomorrow"><span class="grow accent" style="color:var(--accent)">Move to Next Day</span></button>
        <button type="button" class="cell" id="eDone"><span class="grow" style="color:var(--accent)">${t.done ? "Mark as Not Done" : "Mark as Done"}</span></button>
        <button type="button" class="cell danger" id="eDel"><span class="grow">Delete Task</span></button>
      </div>`,
  });
  $("#eDel").onclick = () => { sheet.close(); deleteTask(t); };
  $("#eDone").onclick = () => { sheet.close(); patchTask(t, { done: !t.done }); };
  $("#eTomorrow").onclick = () => { sheet.close(); moveTask(t, addDays(t.day, 1)); };
  $("#eTime").addEventListener("dblclick", (e) => { e.target.value = ""; });
}

// ===== Templates =====
async function ensureTemplates(force) {
  if (!S.templates || force) S.templates = (await api("GET", "/api/templates")).templates;
  return S.templates;
}

function renderTemplates(anim) {
  if (!S.templates) { ensureTemplates().then(() => render(anim)).catch(oops); return; }
  const list = S.templates;
  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar"><span></span><div class="mid">Templates</div><button type="button" class="navbtn" id="newTpl" aria-label="New template">${I.plus}</button></div>
    <div class="largetitle"><h1>Templates</h1></div>
    ${list.length ? `<div class="group">${list.map((t) => `
      <button type="button" class="cell tpl-cell" data-tpl="${t.id}">
        <span class="icon-sq" style="--tc:var(--c-${t.color})">${esc(t.emoji || "📋")}</span>
        <span class="grow"><div>${esc(t.name)}</div><div class="sub">${esc(daysText(t.days))} · ${t.items.length} item${t.items.length === 1 ? "" : "s"}</div></span>
        ${I.chev}
      </button>`).join("")}</div>` : `<div class="empty"><div class="big">🗂️</div>No templates yet.<br>Make one for each routine, like a Toronto Saturday and a Barrie Saturday.</div>`}
    <p class="foot">A template is a reusable list. Pick the days it's for and it's offered on those days. When two templates share a day (Toronto and Barrie Saturdays), you choose which one to add.</p>
    <div class="btnrow" style="margin-top:22px"><button type="button" class="btn secondary" id="newTpl2">New Template</button></div>
  </div>${tabbar()}`;
  bindTabbar(); bindNavbarScroll();
  $("#newTpl").onclick = $("#newTpl2").onclick = () => editTemplate({ id: null, name: "", emoji: "📋", color: "blue", days: [], items: [] });
  $$("[data-tpl]").forEach((b) => b.onclick = () => editTemplate(S.templates.find((t) => t.id === +b.dataset.tpl)));
}

const EMOJIS = ["📋", "🏙️", "🌲", "🏠", "🏡", "💼", "🏋️", "🎾", "🧹", "🛒", "🍳", "📚", "💻", "✈️", "🚗", "☀️", "🌙", "❤️"];
const COLORS = ["blue", "green", "orange", "red", "purple", "pink", "teal", "indigo", "yellow", "gray"];

function editTemplate(src) {
  const t = JSON.parse(JSON.stringify(src));
  if (!t.items.length) t.items.push({ title: "", time: "" });
  const isNew = !t.id;
  const itemsHtml = () => t.items.map((it, i) => `<div class="cell item-cell" data-i="${i}">
      <input class="t" value="${esc(it.title)}" placeholder="Item" maxlength="200" aria-label="Item ${i + 1}">
      <input type="time" value="${esc(it.time || "")}" aria-label="Time for item ${i + 1}">
      <button type="button" class="rm" aria-label="Remove item">${I.xcircle}</button></div>`).join("");
  const collect = () => {
    t.name = $("#tName").value.trim();
    t.items = $$(".item-cell").map((c) => ({ title: $("input.t", c).value.trim(), time: $("input[type=time]", c).value,
      notes: (t.items[+c.dataset.i] || {}).notes || "" }));
  };
  const save = async () => {
    collect();
    if (!t.name) { toast("Give the template a name."); $("#tName").focus(); return null; }
    const body = { name: t.name, emoji: t.emoji, color: t.color, days: t.days, items: t.items.filter((x) => x.title) };
    const r = t.id ? await api("PUT", `/api/templates/${t.id}`, body) : await api("POST", "/api/templates", body);
    t.id = r.template.id;
    await ensureTemplates(true);
    if (S.tab === "templates") render("");
    else if (S.tab === "day") { await loadDay(); render(""); }
    return r.template;
  };
  const sheet = openSheet({
    title: isNew ? "New Template" : "Edit Template",
    left: { label: "Cancel" },
    right: { label: isNew ? "Add" : "Save", bold: true, fn: async () => { try { return (await save()) ? undefined : false; } catch (e) { oops(e); return false; } } },
    html: `<div class="group"><div class="cell"><span class="icon-sq" id="tIcon" style="--tc:var(--c-${t.color})">${esc(t.emoji)}</span>
        <input id="tName" class="bigtitle" value="${esc(t.name)}" placeholder="Name, e.g. Saturday in Toronto" maxlength="60" aria-label="Template name"></div>
        <div class="emojis" role="radiogroup" aria-label="Icon">${EMOJIS.map((e) => `<button type="button" data-emoji="${e}" class="${e === t.emoji ? "on" : ""}">${e}</button>`).join("")}</div>
        <div class="swatches" role="radiogroup" aria-label="Colour">${COLORS.map((c) => `<button type="button" data-color="${c}" class="${c === t.color ? "on" : ""}" style="--sw:var(--c-${c})" aria-label="${c}"></button>`).join("")}</div>
      </div>
      <div class="sechead"><h2>Offer on</h2></div>
      <div class="group"><div class="days">${DAY_LETTERS.map((l, i) => `<button type="button" data-day="${i}" class="${t.days.includes(i) ? "on" : ""}" aria-pressed="${t.days.includes(i)}" aria-label="${DAY_SHORT[i]}">${l}</button>`).join("")}</div></div>
      <p class="foot">On these days, your Days list offers this template. Nothing is added until you tap it.</p>
      <div class="sechead"><h2>Items</h2></div>
      <div class="group" id="items">${itemsHtml()}</div>
      <div class="group" style="margin-top:8px"><button type="button" class="cell accent" id="addItem"><span class="icon-sq">${I.plus}</span><span class="grow" style="color:var(--accent)">Add Item</span></button></div>
      <div class="sechead"><h2>Use it</h2></div>
      <div class="group">
        <button type="button" class="cell" id="useToday"><span class="grow" style="color:var(--accent)">Add to Today</span></button>
        <label class="cell"><span class="grow" style="color:var(--accent)">Add to Another Day…</span><input type="date" id="useDay" min="${today()}"></label>
      </div>
      ${isNew ? "" : `<div class="group" style="margin-top:22px"><button type="button" class="cell danger" id="tDel"><span class="grow">Delete Template</span></button></div>`}`,
  });
  const root = sheet.el;
  $$("[data-emoji]", root).forEach((b) => b.onclick = () => { t.emoji = b.dataset.emoji; $$("[data-emoji]", root).forEach((x) => x.classList.toggle("on", x === b)); $("#tIcon").textContent = t.emoji; });
  $$("[data-color]", root).forEach((b) => b.onclick = () => { t.color = b.dataset.color; $$("[data-color]", root).forEach((x) => x.classList.toggle("on", x === b)); $("#tIcon").style.setProperty("--tc", `var(--c-${t.color})`); });
  $$("[data-day]", root).forEach((b) => b.onclick = () => {
    const d = +b.dataset.day; t.days = t.days.includes(d) ? t.days.filter((x) => x !== d) : [...t.days, d].sort();
    b.classList.toggle("on"); b.setAttribute("aria-pressed", t.days.includes(d));
  });
  const bindItems = () => {
    $$(".item-cell", root).forEach((c) => {
      $(".rm", c).onclick = () => { collect(); t.items.splice(+c.dataset.i, 1); if (!t.items.length) t.items.push({ title: "", time: "" }); $("#items").innerHTML = itemsHtml(); bindItems(); };
      $("input.t", c).onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("#addItem").click(); } };
    });
  };
  bindItems();
  $("#addItem").onclick = () => {
    collect(); t.items.push({ title: "", time: "" }); $("#items").innerHTML = itemsHtml(); bindItems();
    const last = $$(".item-cell input.t", root).pop(); last.focus(); last.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const use = async (day) => {
    try {
      const saved = await save(); if (!saved) return;
      sheet.close();
      await applyTemplate(saved.id, day);
    } catch (e) { oops(e); }
  };
  $("#useToday").onclick = () => use(today());
  $("#useDay").onchange = (e) => e.target.value && use(e.target.value);
  $("#tDel") && ($("#tDel").onclick = () => actionSheet({
    title: `Delete “${t.name}”? Tasks it already added stay on their days.`,
    actions: [{ label: "Delete Template", danger: true, fn: async () => {
      try { await api("DELETE", `/api/templates/${t.id}`); sheet.close(); await ensureTemplates(true); S.data = null; render(""); } catch (e) { oops(e); }
    } }],
  }));
  if (isNew) setTimeout(() => $("#tName").focus(), reduceMotion.matches ? 0 : 320);
}

// ===== Profile =====
function renderProfile(anim) {
  const u = S.user;
  const initials = (u.display_name || u.username).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const since = new Date(u.created_at).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  appEl.innerHTML = `<div class="page ${anim}">
    <div class="navbar"><span></span><div class="mid">Profile</div><span></span></div>
    <div class="largetitle"><h1>Profile</h1></div>
    <div class="profile-head"><div class="avatar" aria-hidden="true">${esc(initials)}</div>
      <div class="name">${esc(u.display_name)}</div><div class="user">@${esc(u.username)} · since ${esc(since)}</div></div>
    <div class="sechead"><h2>Name</h2></div>
    <div class="group"><div class="cell"><input id="pName" value="${esc(u.display_name)}" maxlength="60" aria-label="Name" enterkeyhint="done"></div></div>
    <div class="sechead"><h2>Security</h2></div>
    <div class="group">
      <button type="button" class="cell" id="pPass"><span class="grow">Change Password</span>${I.chev}</button>
      <button type="button" class="cell" id="pOthers"><span class="grow">Log Out Other Devices</span></button>
    </div>
    <div class="sechead"><h2>Your data</h2></div>
    <div class="group">
      <a class="cell" href="/api/me/export" download style="color:inherit;text-decoration:none"><span class="grow">Download My Data</span>${I.chev}</a>
    </div>
    <p class="foot">Everything is stored on your own laptop, in the app's data folder.</p>
    <div class="group" style="margin-top:22px"><button type="button" class="cell" id="pOut"><span class="grow" style="color:var(--accent)">Log Out</span></button></div>
    <div class="group" style="margin-top:22px"><button type="button" class="cell danger" id="pDel"><span class="grow">Delete Profile</span></button></div>
    <p class="foot">On iPhone: open this page in Safari, tap Share, then <b>Add to Home Screen</b> to use it like an app.</p>
  </div>${tabbar()}`;
  bindTabbar(); bindNavbarScroll();
  const nm = $("#pName");
  const saveName = async () => {
    const v = nm.value.trim();
    if (!v || v === S.user.display_name) { nm.value = S.user.display_name; return; }
    try { S.user = (await api("PATCH", "/api/me", { display_name: v })).user; render(""); toast("Name saved"); } catch (e) { oops(e); }
  };
  nm.onblur = saveName; nm.onkeydown = (e) => { if (e.key === "Enter") nm.blur(); };
  $("#pPass").onclick = changePassword;
  $("#pOthers").onclick = async () => { try { await api("POST", "/api/me/logout-everywhere"); toast("Logged out on your other devices"); } catch (e) { oops(e); } };
  $("#pOut").onclick = () => actionSheet({ actions: [{ label: "Log Out", danger: true, fn: async () => {
    await api("POST", "/api/auth/logout").catch(() => {}); S.user = null; S.data = null; S.templates = null; render();
  } }] });
  $("#pDel").onclick = deleteProfile;
}
function changePassword() {
  openSheet({
    title: "Change Password", left: { label: "Cancel" },
    right: { label: "Save", bold: true, fn: async () => {
      try { await api("POST", "/api/me/password", { current: $("#cpOld").value, new: $("#cpNew").value }); toast("Password changed. Other devices were logged out."); }
      catch (e) { $("#cpErr").textContent = e.message; return false; }
    } },
    html: `<div class="group">
      <div class="cell"><input type="password" id="cpOld" placeholder="Current password" autocomplete="current-password"></div>
      <div class="cell"><input type="password" id="cpNew" placeholder="New password (8+ characters)" autocomplete="new-password"></div></div>
      <p class="err" id="cpErr"></p>`,
  });
  setTimeout(() => $("#cpOld").focus(), 320);
}
function deleteProfile() {
  openSheet({
    title: "Delete Profile", left: { label: "Cancel" },
    html: `<p class="foot" style="margin:4px 4px 14px;font-size:15px">This permanently deletes your profile, every task and every template. It can't be undone.</p>
      <div class="group"><div class="cell"><input type="password" id="dpPass" placeholder="Your password" autocomplete="current-password"></div></div>
      <p class="err" id="dpErr"></p>
      <div class="btnrow"><button type="button" class="btn danger" id="dpGo">Delete Everything</button></div>`,
  });
  $("#dpGo").onclick = async () => {
    try { await api("POST", "/api/me/delete", { password: $("#dpPass").value }); closeAllSheets(); S.user = null; render(); }
    catch (e) { $("#dpErr").textContent = e.message; }
  };
}

// ===== Auth (sign up / log in; mirrors Claude Alerts) =====
function renderAuth() {
  let mode = S.first || store.get("hasProfile", false) === false ? "signup" : "login";
  if (!S.signupsOpen) mode = "login";
  const draw = () => {
    appEl.innerHTML = `<div class="auth fade-in">
      <img class="logo" src="icon-192.png" alt="">
      <h1>Daily To Do</h1>
      <p class="lead">${mode === "signup" ? "Make a profile to keep your lists and templates." : "Welcome back."}</p>
      ${S.signupsOpen ? `<div class="seg ${mode === "login" ? "right" : ""}" role="tablist"><span class="thumb"></span>
        <button type="button" role="tab" data-mode="signup" aria-selected="${mode === "signup"}">Sign Up</button>
        <button type="button" role="tab" data-mode="login" aria-selected="${mode === "login"}">Log In</button></div>` : ""}
      <form id="authForm" novalidate>
        <div class="group">
          ${mode === "signup" ? `<div class="cell"><input id="aName" placeholder="Your name" autocomplete="name" maxlength="60"></div>` : ""}
          <div class="cell"><input id="aUser" placeholder="Username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="30"></div>
          <div class="cell"><input id="aPass" type="password" placeholder="Password${mode === "signup" ? " (8+ characters)" : ""}" autocomplete="${mode === "signup" ? "new-password" : "current-password"}"></div>
        </div>
        <p class="field-note" id="aNote"></p>
        ${mode === "signup" ? `<div class="group"><label class="cell"><span class="grow">Start with example templates<div class="sub">A Toronto and a Barrie Saturday you can edit</div></span>
          <span class="switch"><input type="checkbox" id="aStarter" checked><span></span></span></label></div>` : ""}
        <p class="err" id="aErr"></p>
        <div class="btnrow"><button class="btn" id="aGo" type="submit">${mode === "signup" ? "Create Profile" : "Log In"}</button></div>
      </form></div>`;
    $$("[data-mode]").forEach((b) => b.onclick = () => { if (mode !== b.dataset.mode) { mode = b.dataset.mode; draw(); } });
    let timer;
    if (mode === "signup") {
      $("#aUser").oninput = (e) => {
        clearTimeout(timer);
        const v = e.target.value.trim(), note = $("#aNote");
        if (!v) { note.textContent = ""; return; }
        timer = setTimeout(async () => {
          try {
            const r = await api("GET", `/api/auth/username?u=${encodeURIComponent(v)}`);
            note.className = "field-note " + (r.available ? "good" : "bad");
            note.textContent = r.available ? "✓ Available" : r.reason === "format" ? "3–30 letters, numbers, dots, dashes or underscores" : "That username is taken";
          } catch { note.textContent = ""; }
        }, 350);
      };
    }
    $("#authForm").onsubmit = async (e) => {
      e.preventDefault();
      const btn = $("#aGo"); btn.disabled = true; $("#aErr").textContent = "";
      try {
        const body = { username: $("#aUser").value.trim(), password: $("#aPass").value };
        let r;
        if (mode === "signup") r = await api("POST", "/api/auth/signup", { ...body, display_name: $("#aName").value.trim(), starter: $("#aStarter").checked });
        else r = await api("POST", "/api/auth/login", body);
        store.set("hasProfile", true);
        S.user = r.user; S.day = today(); S.data = null; S.templates = null;
        if (mode === "signup") S.tab = "day";
        await ensureTemplates().catch(() => {});
        render();
      } catch (err) { $("#aErr").textContent = err.message; btn.disabled = false; }
    };
  };
  draw();
}

// ===== sheets =====
const sheetsEl = $("#sheets");
const openSheets = [];
function openSheet({ title, left, right, html, onClose }) {
  const scrim = document.createElement("div"); scrim.className = "scrim";
  const el = document.createElement("div"); el.className = "sheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title || "");
  el.innerHTML = `<div class="grab" aria-hidden="true"></div><header>
      <button type="button" class="navbtn" data-left>${esc(left ? left.label : "")}</button>
      <h3>${esc(title || "")}</h3>
      <button type="button" class="navbtn ${right && right.bold ? "bold" : ""}" data-right>${esc(right ? right.label : "")}</button>
    </header><div class="scroll">${html}</div>`;
  sheetsEl.append(scrim, el);
  document.body.style.overflow = "hidden";
  let y = 0, sp = null, closed = false;
  const H = () => el.offsetHeight;
  const set = (v) => { y = v; el.style.transform = `translateY(${v}px)`; scrim.style.opacity = String(Math.max(0, 1 - v / H())); };
  set(H() || window.innerHeight);
  sp = spring({ from: y, to: 0, response: 0.35, damping: 1, onUpdate: set });

  const api_ = {
    el,
    close(velocity = 0) {
      if (closed) return; closed = true;
      sp && sp.stop();
      if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur();
      sp = spring({ from: y, to: H() + 20, velocity, response: 0.3, onUpdate: set, onDone: () => {
        el.remove(); scrim.remove();
        openSheets.splice(openSheets.indexOf(api_), 1);
        if (!openSheets.length) document.body.style.overflow = "";
        onClose && onClose();
      } });
    },
  };
  openSheets.push(api_);
  scrim.onclick = () => api_.close();
  $("[data-left]", el).onclick = () => { if (left && left.fn) left.fn(); api_.close(); };
  const rightBtn = $("[data-right]", el);
  rightBtn.onclick = async () => {
    if (!right) return;
    rightBtn.disabled = true;
    let r;
    try { r = right.fn ? await right.fn() : undefined; } finally { rightBtn.disabled = false; }
    if (r !== false) api_.close();
  };
  if (!right) $("[data-right]", el).style.visibility = "hidden";
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") api_.close(); });

  // drag the grabber / header down to dismiss; it follows the finger and keeps its momentum
  const drag = (handle) => handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    sp && sp.stop();
    handle.setPointerCapture(e.pointerId);
    const y0 = e.clientY - y, tr = tracker(); tr.add(0, e.clientY);
    const move = (ev) => { tr.add(0, ev.clientY); let v = ev.clientY - y0; if (v < 0) v = -rubber(-v, H()); set(v); };
    const up = () => {
      handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); handle.removeEventListener("pointercancel", up);
      const vy = tr.v().y;
      if (y + project(vy) > H() * 0.5 && vy > -100) api_.close(vy);
      else sp = spring({ from: y, to: 0, velocity: vy, response: 0.3, damping: 0.85, onUpdate: set });
    };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
  });
  drag($(".grab", el)); drag($("header", el));
  return api_;
}
function closeAllSheets() { [...openSheets].forEach((s) => s.close()); }

function actionSheet({ title, actions }) {
  const scrim = document.createElement("div"); scrim.className = "scrim";
  const el = document.createElement("div"); el.className = "sheet"; el.style.background = "transparent"; el.style.boxShadow = "none";
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = `<div class="actions"><div class="group sheet-like">${title ? `<div class="title">${esc(title)}</div>` : ""}${actions.map((a, i) =>
    `<button type="button" data-i="${i}" class="${a.danger ? "danger" : ""}">${esc(a.label)}</button>`).join("")}</div>
    <div class="group sheet-like"><button type="button" class="cancel" data-cancel>Cancel</button></div></div>`;
  if (title) $(".title", el).style.cssText += ";border-bottom:.5px solid var(--sep)";
  sheetsEl.append(scrim, el);
  let y = 0, sp;
  const H = () => el.offsetHeight;
  const set = (v) => { y = v; el.style.transform = `translateY(${v}px)`; scrim.style.opacity = String(Math.max(0, 1 - v / H())); };
  set(H());
  sp = spring({ from: y, to: 0, response: 0.32, onUpdate: set });
  const close = (fn) => { sp.stop(); sp = spring({ from: y, to: H() + 10, response: 0.28, onUpdate: set, onDone: () => { el.remove(); scrim.remove(); } }); fn && fn(); };
  scrim.onclick = () => close();
  $("[data-cancel]", el).onclick = () => close();
  $$("[data-i]", el).forEach((b) => b.onclick = () => close(actions[+b.dataset.i].fn));
}

// ---------- start ----------
document.addEventListener("visibilitychange", () => {
  // coming back to the app (e.g. the next morning): jump to the new day and refresh
  if (document.visibilityState !== "visible" || !S.user) return;
  const t = today();
  if (S.lastToday && S.lastToday !== t && S.day === S.lastToday) S.day = t;
  S.lastToday = t;
  if (S.tab === "day" && !openSheets.length && !$(".composer")) loadDay().then(() => render("")).catch(() => {});
});

(async function boot() {
  try {
    const r = await api("GET", "/api/auth/me");
    S.user = r.user; S.signupsOpen = r.allow_signups !== false; S.first = !!r.first;
    S.lastToday = today();
    if (S.user) await ensureTemplates().catch(() => {});
  } catch (e) {
    appEl.innerHTML = `<div class="auth"><h1>Daily To Do</h1><p class="lead">${esc(e.message)}</p></div>`;
    return;
  }
  render();
})();
