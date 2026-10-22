/* Butler sync: connects Daily To Do to Michael's Obsidian vault through his Mac (Tailscale only).
   The vault is the one store that Ceres, Hermes, Paperclip and Claude also write to; this app is a view onto it
   that keeps working offline. Loaded after app.js and uses its globals (D, save, render, …).

   What syncs:
   - To-dos: dated ones live on My Day, undated ones in the "Inbox" list, waiting-ons in "Waiting On".
     Anything added to My Day, Inbox or Waiting On here goes to the vault too.
   - Habits: every habit and every ring tap.
   - Calendar: events from the vault show on My Day (read-only here).
   How: after every save, the app is compared with the last state the vault confirmed and the differences go
   into an outbox (kept across restarts). The outbox is sent, then the app pulls the vault again. Nothing is
   lost offline; it goes when the Mac is reachable. */
"use strict";
const BT = (() => {
  const CFG = "dtd.butler", BOX = "dtd.butler.outbox", SNAP = "dtd.butler.snap";
  const INBOX = "bt-inbox", WAITING = "bt-waiting";
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage off */ } };
  let cfg = load(CFG, null);            // {url, token, since, last, err}
  let box = load(BOX, []);              // ops waiting to reach the Mac
  let snap = load(SNAP, { t: {}, h: {} }); // last vault-confirmed state, by vault id
  let busy = false, again = false, timer = null, dirty = false;
  const on = () => !!(cfg && cfg.url && cfg.token);

  // ---------- connect link: #/connect/<url-encoded API url>/<token> (a fragment never reaches GitHub) ----------
  function takeLink() {   // works on a fresh open and when the app is already running (only the fragment changes)
    const m = location.hash.match(/^#\/connect\/([^/]+)\/([^/]+)$/);
    if (!m) return false;
    const same = cfg && cfg.token === m[2];
    cfg = same ? { ...cfg, url: decodeURIComponent(m[1]).replace(/\/$/, "") } : { url: decodeURIComponent(m[1]).replace(/\/$/, ""), token: m[2], since: Date.now(), first: true };
    keep(CFG, cfg);
    history.replaceState(null, "", location.pathname + location.search + "#/settings");
    dispatchEvent(new HashChangeEvent("hashchange"));
    setTimeout(() => { toast("Connecting to your Mac…"); sync({ quiet: false }); }, 300);
    return true;
  }
  addEventListener("hashchange", takeLink);

  async function api(method, path, body) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(cfg.url + path, { method, signal: ctl.signal, cache: "no-store",
        headers: { Authorization: "Bearer " + cfg.token, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) throw Object.assign(new Error("The Mac didn't accept this device's key. Reconnect from Profile."), { fatal: true });
      return { status: r.status, ...j };
    } finally { clearTimeout(t); }
  }

  // ---------- shapes ----------
  const dueOf = (it) => (it.list === "day" ? it.day || "" : it.due || "");
  const tSnap = (it) => ({ title: it.title || "", due: dueOf(it), time: it.time || "", notes: it.notes || "", done: !!it.done });
  const hDef = (h) => ({ name: h.name, icon: h.icon, color: h.color, target: +h.target || 1, unit: h.unit || "", sched: h.sched, tod: h.tod || "any", archived: !!h.archived });
  const hSnap = (h) => ({ def: JSON.stringify(hDef(h)), log: { ...(h.log || {}) }, skip: { ...(h.skip || {}) } });
  const pendingIds = () => new Set(box.map((o) => o.id).filter(Boolean));

  function ensureLists() {
    const mk = (id, name, icon, color, image) => { if (!listById(id)) D.lists.push(newList({ id, name, icon, color, image })); };
    mk(INBOX, "Inbox", "checklist", COLORS[6], "sonoma-light");
    mk(WAITING, "Waiting On", "flag", COLORS[1], "tahoe-dusk");
  }

  function placeTask(it, t) {
    it.title = t.title; it.notes = t.notes || ""; it.time = t.time || "";
    it.done = !!t.done; it.doneAt = t.done ? (Date.parse(t.done_at) || it.doneAt || Date.now()) : null;
    it.btRepeat = t.repeat || ""; it.btWaiting = t.waiting || "";
    if (t.waiting) { it.list = WAITING; it.due = t.due || ""; delete it.day; }
    else if (t.due) { if (it.list !== "day") delete it.myDay; it.list = "day"; it.day = t.due; delete it.due; }
    else { it.list = INBOX; it.due = ""; delete it.day; }
  }

  // ---------- pull: the vault wins for anything without a pending local change ----------
  function merge(data) {
    if (!D) return false;
    ensureLists();
    const pend = pendingIds(), seen = new Set();
    let changed = false;
    const byBt = new Map(D.items.filter((i) => i.bt).map((i) => [i.bt, i]));
    for (const t of data.tasks || []) {
      seen.add(t.id);
      if (pend.has(t.id)) continue;
      let it = byBt.get(t.id);
      if (!it) {
        it = { id: uid(), notes: "", time: "", starred: false, done: false, pos: nextPos(), created: Date.parse(t.created) || Date.now(), bt: t.id };
        D.items.push(it); S.newIds.add(it.id); changed = true;
      }
      const before = JSON.stringify(it);
      placeTask(it, t);
      if (JSON.stringify(it) !== before) changed = true;
      snap.t[t.id] = tSnap(it);
    }
    for (const it of D.items.filter((i) => i.bt && !seen.has(i.bt) && !pend.has(i.bt))) {
      delete snap.t[it.bt];
      if (it.done) delete it.bt;                         // keep it as history; it aged out of the vault's window
      else { D.items = D.items.filter((x) => x !== it); } // cancelled or closed elsewhere
      changed = true;
    }
    const evs = JSON.stringify(data.events || []);
    if (JSON.stringify(D.btEvents || []) !== evs) { D.btEvents = data.events || []; changed = true; }
    D.habits = D.habits || [];
    for (const sh of data.habits || []) {
      if (pend.has(sh.id)) continue;
      let h = D.habits.find((x) => x.bt === sh.id) || D.habits.find((x) => !x.bt && (x.id === sh.app_id || (x.name || "").toLowerCase() === sh.name.toLowerCase()));
      if (!h) { h = { id: uid(), pos: D.habits.length + 1, log: {}, skip: {} }; D.habits.push(h); }
      const before = JSON.stringify(h);
      Object.assign(h, { bt: sh.id, name: sh.name, icon: sh.icon, color: sh.color, target: sh.target, unit: sh.unit,
        sched: sh.sched, tod: sh.tod, archived: sh.archived, created: h.created && h.created < sh.created ? h.created : sh.created || h.created,
        log: { ...sh.log }, skip: { ...sh.skip } });
      if (JSON.stringify(h) !== before) changed = true;
      snap.h[sh.id] = hSnap(h);
    }
    keep(SNAP, snap);
    return changed;
  }

  // ---------- push: compare the app with the snapshot, queue the differences ----------
  function diff() {
    if (!on() || !D) return;
    D.habits = D.habits || [];
    const firstRun = cfg.first;
    for (const it of D.items) {
      if (it.bt) {
        const s = snap.t[it.bt]; if (!s) continue;
        const c = tSnap(it);
        if (c.done !== s.done) box.push({ op: c.done ? "done" : "reopen", id: it.bt });
        if (c.title !== s.title || c.due !== s.due || c.time !== s.time || c.notes !== s.notes)
          box.push({ op: "update", id: it.bt, title: c.title, due: c.due, time: c.time, notes: c.notes });
        snap.t[it.bt] = c;
      } else if (!it.btPending && !it.btSkip) {
        const mine = it.list === INBOX || it.list === WAITING || it.list === "day";
        const fresh = it.list !== "day" || (firstRun ? !it.done && it.day >= today() : (it.created || 0) >= cfg.since);
        if (mine && fresh) { it.btPending = true; box.push({ op: "add", local: it.id, title: it.title, due: dueOf(it), time: it.time || "", notes: it.notes || "", done: !!it.done, waiting: it.list === WAITING }); }
        else if (mine) it.btSkip = true; // older local history stays local
      }
    }
    const live = new Set(D.items.filter((i) => i.bt).map((i) => i.bt));
    for (const id of Object.keys(snap.t)) if (!live.has(id)) { box.push({ op: "cancel", id }); delete snap.t[id]; }
    for (const h of D.habits) {
      if (!h.bt) {
        if (!h.btPending && h.name) { h.btPending = true; box.push({ op: "habit-add", local: h.id, ...hDef(h), created: h.created, log: h.log, skip: h.skip, app_id: h.id }); }
        continue;
      }
      const s = snap.h[h.bt]; if (!s) continue;
      const c = hSnap(h);
      if (c.def !== s.def) box.push({ op: "habit-update", id: h.bt, ...hDef(h) });
      for (const d of new Set([...Object.keys(c.log), ...Object.keys(s.log)])) if ((c.log[d] || 0) !== (s.log[d] || 0) && !(c.skip[d] && !s.skip[d])) box.push({ op: "habit-log", id: h.bt, date: d, value: c.log[d] || 0 });
      for (const d of new Set([...Object.keys(c.skip), ...Object.keys(s.skip)])) if (!!c.skip[d] !== !!s.skip[d]) box.push({ op: "habit-skip", id: h.bt, date: d, on: !!c.skip[d] });
      snap.h[h.bt] = c;
    }
    const liveH = new Set(D.habits.filter((h) => h.bt).map((h) => h.bt));
    for (const id of Object.keys(snap.h)) if (!liveH.has(id)) { box.push({ op: "habit-update", id, archived: true }); delete snap.h[id]; }
    if (firstRun) { cfg.first = false; keep(CFG, cfg); }
    keep(BOX, box); keep(SNAP, snap);
  }

  async function send(o) {
    const P = { done: "/api/tasks/done", reopen: "/api/tasks/reopen", update: "/api/tasks/update", cancel: "/api/tasks/cancel",
      "habit-update": "/api/habits/update", "habit-log": "/api/habits/log", "habit-skip": "/api/habits/skip" };
    if (o.op === "add") {
      const r = await api("POST", "/api/tasks", { title: o.title, due: o.due, time: o.time, notes: o.notes, waiting: !!o.waiting });
      if (!r.item) return r.status >= 400 && r.status < 500;
      const it = D && itemById(o.local);
      if (it) { it.bt = r.item.id; delete it.btPending; snap.t[it.bt] = { ...tSnap(it), done: false }; }
      if (o.done) box.push({ op: "done", id: r.item.id });
      return true;
    }
    if (o.op === "habit-add") {
      const { op, local, ...body } = o;
      const r = await api("POST", "/api/habits", body);
      if (!r.item) return r.status >= 400 && r.status < 500;
      const h = D && (D.habits || []).find((x) => x.id === local);
      if (h) { h.bt = r.item.id; delete h.btPending; }
      return true;
    }
    const { op, ...body } = o;
    const r = await api("POST", P[op], body);
    return r.status < 500; // 404: the note is gone; nothing more to do
  }

  async function sync({ quiet = true } = {}) {
    if (!on() || !D) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      diff();
      while (box.length) {
        const ok = await send(box[0]);
        if (!ok) throw new Error("The Mac couldn't save a change; it'll retry.");
        box.shift(); keep(BOX, box);
      }
      const data = await api("GET", "/api/sync");
      if (!data.tasks) throw new Error(data.error || "Unexpected answer from the Mac");
      const changed = merge(data);
      cfg.last = Date.now(); cfg.err = ""; keep(CFG, cfg);
      Store.write(PID, D);
      if (changed) { dirty = true; }
      redraw();
      if (!quiet) toast("Synced with your Mac");
    } catch (e) {
      cfg.err = e.name === "AbortError" || e instanceof TypeError ? "Can't reach your Mac (is Tailscale on?)" : e.message;
      keep(CFG, cfg);
      if (!quiet || e.fatal) toast(cfg.err);
      redraw(true);
    } finally {
      busy = false;
      if (again) { again = false; setTimeout(() => sync(), 50); }
    }
  }

  // ---------- UI ----------
  const quietUI = () => S.editing || openSheets.length || $(".composer") || $(".menu") || $(".completing") || $(".reopening");
  function redraw(statusOnly) {
    if (statusOnly) { decorate(); return; }
    if (dirty && !quietUI()) { dirty = false; render(""); } else decorate();
  }
  const fmt12 = (t) => (t ? fmtTime(t) : "");
  function eventsHtml(day) {
    const evs = (D.btEvents || []).filter((e) => e.date === day).sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));
    if (!evs.length) return "";
    return `<div class="gh bt-gh">${g("calendar", "s")} Calendar <span class="c">${evs.length}</span></div><div class="tasks bt-evs">${evs.map((e) =>
      `<div class="bt-ev"><span class="bt-when">${esc(fmt12(e.start) || (e.when === "all-day" ? "All day" : cap(e.when || "")))}</span><div class="body"><div class="title">${esc(e.title)}</div>${
        e.where || (e.who || []).length ? `<div class="meta">${e.where ? `<span>${esc(e.where)}</span>` : ""}${(e.who || []).length ? `<span>with ${esc(e.who.join(", "))}</span>` : ""}</div>` : ""}</div></div>`).join("")}</div>`;
  }
  function statusPill() {
    if (!on()) return "";
    const n = box.length, err = cfg.err;
    if (!n && !err) return "";
    return `<span class="gpill glass bt-pill" title="${esc(err || "")}">${g("upload", "s")} ${n ? `${n} to sync` : "Offline"}</span>`;
  }
  function decorate() {
    if (!D) return;
    const r = S.route;
    if (r.name === "day") {
      $$(".bt-gh, .bt-evs").forEach((x) => x.remove());
      const anchor = $(".hstrip") || $("#hPromo") || $(".suggest") || $(".chips") || $("#hero");
      if (anchor && on()) anchor.insertAdjacentHTML("afterend", eventsHtml(r.day));
      $$(".bt-pill").forEach((x) => x.remove());
      const pills = $("#hero .gbtns");
      if (pills) pills.insertAdjacentHTML("beforeend", statusPill());
    }
    if (r.name === "settings") settingsCard();
    $$(".rw").forEach((w) => {   // waiting-on and repeating vault to-dos get a small tag
      const it = itemById(w.dataset.id);
      if (!it || !it.bt || w.dataset.bt) return;
      w.dataset.bt = 1;
      const meta = $(".meta", w) || (() => { const b = $(".body", w); if (!b) return null; b.insertAdjacentHTML("beforeend", `<div class="meta"></div>`); return $(".meta", w); })();
      if (!meta) return;
      if (it.btWaiting) meta.insertAdjacentHTML("afterbegin", `<span>${g("flag", "xs")} ${esc(it.btWaiting)}</span>`);
      if (it.btRepeat) meta.insertAdjacentHTML("beforeend", `<span aria-label="Repeats">${g("repeat", "xs")} ${esc(it.btRepeat)}</span>`);
    });
  }
  function ago(t) {
    if (!t) return "never";
    const s = Math.round((Date.now() - t) / 1000);
    return s < 60 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString("en-CA", { weekday: "short", hour: "numeric", minute: "2-digit" });
  }
  function settingsCard() {
    if ($("#btCard")) $("#btCard").remove();
    const anchor = $$(".sh.sm").find((x) => /Backup/.test(x.textContent));
    if (!anchor) return;
    const st = !on() ? ["Not connected", "Open the connect link from your Mac once, or paste it here."]
      : cfg.err ? ["Can't reach your Mac", `${cfg.err} · Last synced ${ago(cfg.last)}${box.length ? ` · ${plural(box.length, "change")} waiting` : ""}`]
      : ["Connected to your vault", `Last synced ${ago(cfg.last)}`];
    anchor.insertAdjacentHTML("beforebegin", `<div id="btCard"><div class="sh sm"><h2>Your Mac</h2></div>
      <div class="group ic">
        <div class="cell"><span class="lic sq" style="--c:${on() && !cfg.err ? "#34c759" : on() ? "#ff9500" : "#8e8e93"}">${g("bolt")}</span><span class="grow">${esc(st[0])}<div class="sub">${esc(st[1])}</div></span></div>
        ${on() ? `<button type="button" class="cell" id="btSync"><span class="lic sq" style="--c:#007aff">${g("repeat")}</span><span class="grow">Sync Now</span>${g("chevR", "chev")}</button>
          <button type="button" class="cell" id="btOff"><span class="grow red">Disconnect This Device</span></button>`
        : `<button type="button" class="cell" id="btOn"><span class="lic sq" style="--c:#007aff">${g("plus")}</span><span class="grow blue">Connect to Your Mac</span>${g("chevR", "chev")}</button>`}
      </div>
      <p class="foot">${on() ? "My Day, Inbox, Waiting On, your habits and your calendar come from your Obsidian vault, the same list Ceres and Hermes use. Changes here reach the vault within seconds when your Mac is reachable over Tailscale, and wait safely when it isn't." : "Connecting shows your vault's to-dos, habits and calendar here, and sends what you tick or add back to it."}</p></div>`);
    if (on()) {   // the app's own copy says nothing leaves the device; true only while disconnected
      $$(".foot").forEach((f) => {
        if (/saved in this browser only/.test(f.textContent)) f.textContent = "Your lists, templates and settings are saved in this browser. My Day, Inbox, Waiting On, habits and calendar also live in your vault, so they're the same on every device you connect. Backups still cover everything else.";
        if (/nothing leaves this device/.test(f.textContent)) f.textContent = "Daily To Do · works offline · synced privately with your Mac";
      });
    }
    $("#btSync") && ($("#btSync").onclick = () => sync({ quiet: false }));
    $("#btOff") && ($("#btOff").onclick = () => actionSheet({ title: "Stop syncing this device with your Mac? Your lists stay here; nothing in the vault changes.", actions: [{ label: "Disconnect", red: true, fn: () => { cfg = null; localStorage.removeItem(CFG); render(""); toast("Disconnected"); } }] }));
    $("#btOn") && ($("#btOn").onclick = () => {
      const v = prompt("Paste the connect link from your Mac (setup.sh copies it).") || "";
      const mm = v.trim().match(/#\/connect\/([^/]+)\/([^/\s]+)/);
      if (!mm) { if (v) toast("That doesn't look like a connect link."); return; }
      cfg = { url: decodeURIComponent(mm[1]).replace(/\/$/, ""), token: mm[2], since: Date.now(), first: true }; keep(CFG, cfg);
      render(""); sync({ quiet: false });
    });
  }

  // ---------- hooks into app.js ----------
  const _save = save, _render = render;
  save = function () { _save(); if (on()) { clearTimeout(timer); timer = setTimeout(() => sync(), 500); } };
  render = function (a) { _render(a); try { decorate(); } catch (e) { console.warn("butler decorate", e); } };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
  setInterval(() => { if (document.visibilityState === "visible") sync(); }, 60000);
  addEventListener("online", () => sync());
  if (!takeLink() && on()) { decorate(); sync(); }
  return { sync, get cfg() { return cfg; }, get box() { return box; }, _merge: merge, _diff: diff };
})();
