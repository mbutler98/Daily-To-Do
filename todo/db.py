"""SQLite storage: profiles, logins, day tasks and templates.

Every query that touches tasks or templates is scoped by user_id, so one profile can never read or change
another's lists.
"""
import hashlib
import json
import secrets
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / "data" / "todo.db"
SESSION_DAYS = 60
_lock = threading.Lock()


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect():
    con = sqlite3.connect(PATH, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    return con


def init():
    PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as con:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE COLLATE NOCASE,
                display_name TEXT, password_hash TEXT, created_at TEXT, prefs TEXT DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, created_at TEXT
            );
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name TEXT, emoji TEXT, color TEXT, days TEXT DEFAULT '', position REAL, created_at TEXT
            );
            CREATE TABLE IF NOT EXISTS template_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE,
                title TEXT, time TEXT DEFAULT '', notes TEXT DEFAULT '', position REAL
            );
            CREATE TABLE IF NOT EXISTS applied (
                id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                template_id INTEGER, name TEXT, day TEXT, created_at TEXT
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                day TEXT, title TEXT, notes TEXT DEFAULT '', time TEXT DEFAULT '', starred INTEGER DEFAULT 0,
                done INTEGER DEFAULT 0, done_at TEXT, position REAL, created_at TEXT,
                applied_id INTEGER REFERENCES applied(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS tasks_user_day ON tasks(user_id, day);
            CREATE INDEX IF NOT EXISTS templates_user ON templates(user_id);
        """)


# ---- users & logins ---------------------------------------------------------------

def _user(r):
    if not r:
        return None
    u = dict(r)
    u["prefs"] = json.loads(u.get("prefs") or "{}")
    return u


def user_count():
    with connect() as con:
        return con.execute("SELECT COUNT(*) FROM users").fetchone()[0]


def find_user(username):
    with connect() as con:
        return _user(con.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone())


def get_user(uid):
    with connect() as con:
        return _user(con.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())


def create_user(username, display_name, password_hash):
    with _lock, connect() as con:
        cur = con.execute("INSERT INTO users (username, display_name, password_hash, created_at, prefs) VALUES (?,?,?,?,?)",
                          (username, display_name, password_hash, now_iso(), "{}"))
        return cur.lastrowid


def update_user(uid, display_name=None, prefs=None):
    with _lock, connect() as con:
        if display_name is not None:
            con.execute("UPDATE users SET display_name=? WHERE id=?", (display_name, uid))
        if prefs is not None:
            old = json.loads(con.execute("SELECT prefs FROM users WHERE id=?", (uid,)).fetchone()[0] or "{}")
            con.execute("UPDATE users SET prefs=? WHERE id=?", (json.dumps({**old, **prefs}), uid))


def set_password(uid, password_hash):
    """New password: every existing login for this profile ends."""
    with _lock, connect() as con:
        con.execute("UPDATE users SET password_hash=? WHERE id=?", (password_hash, uid))
        con.execute("DELETE FROM sessions WHERE user_id=?", (uid,))


def delete_user(uid):
    with _lock, connect() as con:
        con.execute("DELETE FROM users WHERE id=?", (uid,))  # cascades to sessions, tasks, templates


def _h(token):
    return hashlib.sha256(token.encode()).hexdigest()  # only a hash is stored: a copied database can't log anyone in


def _cutoff():
    return (datetime.now(timezone.utc) - timedelta(days=SESSION_DAYS)).isoformat(timespec="seconds")


def create_session(user_id):
    token = secrets.token_urlsafe(32)
    with _lock, connect() as con:
        con.execute("INSERT INTO sessions VALUES (?,?,?)", (_h(token), user_id, now_iso()))
        con.execute("DELETE FROM sessions WHERE created_at < ?", (_cutoff(),))
    return token


def session_user(token):
    if not token:
        return None
    with connect() as con:
        r = con.execute("SELECT user_id FROM sessions WHERE token_hash=? AND created_at >= ?", (_h(token), _cutoff())).fetchone()
    return get_user(r[0]) if r else None


def end_session(token):
    if token:
        with _lock, connect() as con:
            con.execute("DELETE FROM sessions WHERE token_hash=?", (_h(token),))


def end_sessions(uid, keep=None):
    with _lock, connect() as con:
        con.execute("DELETE FROM sessions WHERE user_id=? AND token_hash != ?", (uid, _h(keep) if keep else ""))


# ---- tasks -----------------------------------------------------------------------

TASK_COLS = "id, day, title, notes, time, starred, done, done_at, position, applied_id"


def _task(r):
    t = dict(r)
    t["starred"], t["done"] = bool(t["starred"]), bool(t["done"])
    return t


def tasks_for_day(uid, day):
    with connect() as con:
        rows = con.execute(f"SELECT {TASK_COLS} FROM tasks WHERE user_id=? AND day=? ORDER BY position, id", (uid, day))
        return [_task(r) for r in rows]


def overdue(uid, before):
    """Unfinished tasks from earlier days (shown on today so nothing gets lost)."""
    with connect() as con:
        rows = con.execute(f"SELECT {TASK_COLS} FROM tasks WHERE user_id=? AND day < ? AND done=0 ORDER BY day, position, id",
                           (uid, before))
        return [_task(r) for r in rows]


def get_task(uid, tid):
    with connect() as con:
        r = con.execute(f"SELECT {TASK_COLS} FROM tasks WHERE user_id=? AND id=?", (uid, tid)).fetchone()
    return _task(r) if r else None


def _next_pos(con, uid, day):
    return (con.execute("SELECT MAX(position) FROM tasks WHERE user_id=? AND day=?", (uid, day)).fetchone()[0] or 0) + 1


def add_task(uid, day, title, notes="", time="", starred=False, done=False, applied_id=None, position=None, con=None):
    def go(c):
        pos = position if position is not None else _next_pos(c, uid, day)
        cur = c.execute("INSERT INTO tasks (user_id, day, title, notes, time, starred, done, done_at, position, created_at, applied_id)"
                        " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        (uid, day, title, notes, time, int(starred), int(done), now_iso() if done else None, pos, now_iso(), applied_id))
        return cur.lastrowid
    if con is not None:
        return go(con)
    with _lock, connect() as c:
        return go(c)


def update_task(uid, tid, fields):
    allowed = {"title", "notes", "time", "starred", "done", "day", "position"}
    f = {k: v for k, v in fields.items() if k in allowed}
    if not f:
        return
    with _lock, connect() as con:
        if "done" in f:
            f["done_at"] = now_iso() if f["done"] else None
            f["done"] = int(bool(f["done"]))
        if "starred" in f:
            f["starred"] = int(bool(f["starred"]))
        if "day" in f and "position" not in f:
            f["position"] = _next_pos(con, uid, f["day"])
        sets = ", ".join(f"{k}=?" for k in f)
        con.execute(f"UPDATE tasks SET {sets} WHERE user_id=? AND id=?", (*f.values(), uid, tid))


def delete_task(uid, tid):
    with _lock, connect() as con:
        con.execute("DELETE FROM tasks WHERE user_id=? AND id=?", (uid, tid))


def reorder(uid, ids):
    with _lock, connect() as con:
        for i, tid in enumerate(ids):
            con.execute("UPDATE tasks SET position=? WHERE user_id=? AND id=?", (i + 1, uid, tid))


def move_tasks(uid, ids, day):
    with _lock, connect() as con:
        pos = _next_pos(con, uid, day)
        for i, tid in enumerate(ids):
            con.execute("UPDATE tasks SET day=?, position=? WHERE user_id=? AND id=?", (day, pos + i, uid, tid))


def clear_done(uid, day):
    with _lock, connect() as con:
        con.execute("DELETE FROM tasks WHERE user_id=? AND day=? AND done=1", (uid, day))


# ---- templates -------------------------------------------------------------------

def templates(uid):
    with connect() as con:
        ts = [dict(r) for r in con.execute("SELECT id, name, emoji, color, days, position FROM templates WHERE user_id=?"
                                           " ORDER BY position, id", (uid,))]
        for t in ts:
            t["days"] = [int(d) for d in (t["days"] or "").split(",") if d != ""]
            t["items"] = [dict(r) for r in con.execute("SELECT id, title, time, notes FROM template_items WHERE template_id=?"
                                                       " ORDER BY position, id", (t["id"],))]
    return ts


def get_template(uid, tid):
    return next((t for t in templates(uid) if t["id"] == tid), None)


def save_template(uid, tid, name, emoji, color, days, items):
    """Create (tid=None) or replace a template and its items."""
    days_s = ",".join(str(d) for d in sorted(set(days)))
    with _lock, connect() as con:
        if tid is None:
            pos = (con.execute("SELECT MAX(position) FROM templates WHERE user_id=?", (uid,)).fetchone()[0] or 0) + 1
            tid = con.execute("INSERT INTO templates (user_id, name, emoji, color, days, position, created_at) VALUES (?,?,?,?,?,?,?)",
                              (uid, name, emoji, color, days_s, pos, now_iso())).lastrowid
        else:
            n = con.execute("UPDATE templates SET name=?, emoji=?, color=?, days=? WHERE user_id=? AND id=?",
                            (name, emoji, color, days_s, uid, tid)).rowcount
            if not n:
                return None
            con.execute("DELETE FROM template_items WHERE template_id=?", (tid,))
        for i, it in enumerate(items):
            con.execute("INSERT INTO template_items (template_id, title, time, notes, position) VALUES (?,?,?,?,?)",
                        (tid, it["title"], it.get("time", ""), it.get("notes", ""), i + 1))
    return tid


def delete_template(uid, tid):
    with _lock, connect() as con:
        con.execute("DELETE FROM templates WHERE user_id=? AND id=?", (uid, tid))


def apply_template(uid, tid, day):
    """Add a template's items to a day. Items already on that day (same title) are skipped."""
    t = get_template(uid, tid)
    if not t:
        return None, 0
    with _lock, connect() as con:
        have = {r[0].strip().lower() for r in con.execute("SELECT title FROM tasks WHERE user_id=? AND day=?", (uid, day))}
        aid = con.execute("INSERT INTO applied (user_id, template_id, name, day, created_at) VALUES (?,?,?,?,?)",
                          (uid, tid, t["name"], day, now_iso())).lastrowid
        added = 0
        for it in t["items"]:
            if it["title"].strip().lower() in have:
                continue
            add_task(uid, day, it["title"], it["notes"], it["time"], applied_id=aid, con=con)
            added += 1
    return aid, added


def applied_for_day(uid, day):
    with connect() as con:
        return [dict(r) for r in con.execute("SELECT id, template_id, name FROM applied WHERE user_id=? AND day=? ORDER BY id",
                                             (uid, day))]


def unapply(uid, aid):
    """Undo a template: remove the tasks it added that haven't been ticked off."""
    with _lock, connect() as con:
        con.execute("DELETE FROM tasks WHERE user_id=? AND applied_id=? AND done=0", (uid, aid))
        con.execute("DELETE FROM applied WHERE user_id=? AND id=?", (uid, aid))


def export(uid):
    with connect() as con:
        tasks = [_task(r) for r in con.execute(f"SELECT {TASK_COLS} FROM tasks WHERE user_id=? ORDER BY day, position", (uid,))]
    return {"tasks": tasks, "templates": templates(uid)}
