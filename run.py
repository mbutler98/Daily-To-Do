"""Daily To Do - day lists and reusable templates. Runs at http://127.0.0.1:8060"""
import mimetypes
import os
import re
import secrets
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent

env = ROOT / ".env"
if env.exists():
    for line in env.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from flask import Flask, Response, g, jsonify, request, send_from_directory, session  # noqa: E402
from werkzeug.middleware.proxy_fix import ProxyFix  # noqa: E402
from werkzeug.security import check_password_hash, generate_password_hash  # noqa: E402

from todo import db, security  # noqa: E402

STATIC = ROOT / "static"
mimetypes.add_type("application/manifest+json", ".webmanifest")
HTTPS = os.environ.get("HTTPS") == "1"


def secret_key():
    """Random key kept in data/secret_key so logins survive restarts."""
    p = ROOT / "data" / "secret_key"
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        p.write_text(secrets.token_hex(32))
    return p.read_text().strip()


app = Flask(__name__, static_folder=None)
app.secret_key = secret_key()
app.config.update(SESSION_COOKIE_NAME="dailytodo_session", SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax",
                  SESSION_COOKIE_SECURE=HTTPS, PERMANENT_SESSION_LIFETIME=timedelta(days=db.SESSION_DAYS),
                  MAX_CONTENT_LENGTH=256 * 1024)
if os.environ.get("TRUST_PROXY") == "1":
    # Behind Tailscale Serve: take the visitor's address and https scheme from X-Forwarded-*. Only safe because
    # the app itself listens on 127.0.0.1, so nothing but the local proxy can reach it.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
db.init()


def allow_signups():
    return os.environ.get("ALLOW_SIGNUPS", "1") == "1" or db.user_count() == 0


# ---- auth (same approach as Claude Alerts) ------------------------------------------

PUBLIC = {"/api/auth/login", "/api/auth/signup", "/api/auth/username", "/api/auth/me", "/api/auth/logout"}
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def same_origin(url):
    return urlsplit(url).netloc.lower() == request.host.lower()


@app.before_request
def guard():
    # The cookie only carries a random login token; the server decides whether that login still exists.
    g.user = db.session_user(session.get("sid"))
    if g.user is None and session:
        session.clear()
    if request.path.startswith("/api/") and request.method not in SAFE_METHODS:
        # CSRF: changes must come from this app's own page (custom header + same-origin Origin/Referer).
        src = request.headers.get("Origin") or request.headers.get("Referer")
        if request.headers.get("X-Requested-With") != "daily-todo" or (src and not same_origin(src)):
            return jsonify(error="Request blocked: it didn't come from the Daily To Do page."), 403
    if request.path in PUBLIC or not request.path.startswith("/api/"):
        return None
    if g.user is None:
        return jsonify(error="Please log in.", login=True), 401
    return None


@app.after_request
def headers(resp):
    for k, v in security.HEADERS.items():
        resp.headers.setdefault(k, v)
    if HTTPS:
        resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(500)
def api_error(e):
    code = getattr(e, "code", 500) or 500
    if request.path.startswith("/api/"):
        msg = {404: "Not found. If you just updated the app, restart it.", 405: "That action isn't available."}.get(
            code, "Something went wrong on the server. Try again.")
        return jsonify(error=msg), code
    return e.get_response() if hasattr(e, "get_response") else ("Something went wrong.", 500)


def start_session(u):
    old = session.get("sid")
    if old:
        db.end_session(old)
    session.clear()  # a brand-new login token every time (no session fixation)
    session.permanent = True
    session["sid"] = db.create_session(u["id"])


def me():
    return g.user["id"]


def user_view(u):
    return {"id": u["id"], "username": u["username"], "display_name": u["display_name"] or u["username"],
            "created_at": u["created_at"], "prefs": u["prefs"]}


USERNAME = re.compile(r"^[A-Za-z0-9_.-]{3,30}$")
DUMMY_HASH = generate_password_hash(secrets.token_hex(16))
COMMON = {"password", "password1", "12345678", "123456789", "1234567890", "qwerty123", "iloveyou", "11111111",
          "abc12345", "letmein1", "welcome1", "football", "baseball", "sunshine", "trustno1", "passw0rd"}


def password_problem(password, username=""):
    if len(password) < 8:
        return "Use a password of at least 8 characters."
    if len(password) > 200:
        return "That password is too long (200 characters at most)."
    if password.lower() in COMMON or password.lower() == username.lower():
        return "That password is too easy to guess. Try a short phrase instead."
    return None


@app.get("/api/auth/me")
def auth_me():
    if g.user is None:
        return jsonify(user=None, allow_signups=allow_signups(), first=db.user_count() == 0)
    return jsonify(user=user_view(g.user))


@app.post("/api/auth/signup")
def signup():
    body = request.get_json(silent=True) or {}
    username = str(body.get("username", "")).strip()
    password = str(body.get("password", ""))
    name = str(body.get("display_name", "")).strip()[:60]
    if not allow_signups():
        return jsonify(error="New profiles are turned off."), 403
    wait = security.signup_ip.blocked(request.remote_addr)
    if wait:
        return jsonify(error=f"Too many new profiles from here. Try again in {security.wait_text(wait)}."), 429
    if not USERNAME.match(username):
        return jsonify(error="Usernames are 3–30 letters, numbers, dots, dashes or underscores."), 400
    problem = password_problem(password, username)
    if problem:
        return jsonify(error=problem), 400
    if db.find_user(username):
        return jsonify(error="That username is taken. Try another, or log in."), 409
    uid = db.create_user(username, name or username, generate_password_hash(password))
    security.signup_ip.hit(request.remote_addr)
    if body.get("starter"):
        add_starter_templates(uid)
    start_session(db.get_user(uid))
    return jsonify(user=user_view(db.get_user(uid)))


@app.get("/api/auth/username")
def username_available():
    if not allow_signups():
        return jsonify(error="New profiles are turned off."), 403
    if not security.username_ip.allow(request.remote_addr):
        return jsonify(error="Too many checks. Try again in a minute."), 429
    name = str(request.args.get("u", "")).strip()[:60]
    if not USERNAME.match(name):
        return jsonify(available=False, reason="format")
    return jsonify(available=not db.find_user(name), reason="taken" if db.find_user(name) else "")


@app.post("/api/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    name = str(body.get("username", "")).strip()[:60]
    ip = request.remote_addr
    key = f"{name.lower()}|{ip}"
    wait = max(security.login_user.blocked(key), security.login_ip.blocked(ip))
    if wait:
        return jsonify(error=f"Too many wrong attempts. Try again in {security.wait_text(wait)}."), 429
    u = db.find_user(name)
    ok = check_password_hash(u["password_hash"] if u else DUMMY_HASH, str(body.get("password", ""))[:200])
    if not u or not ok:
        security.login_user.hit(key)
        security.login_ip.hit(ip)
        return jsonify(error="That username and password don't match."), 401
    security.login_user.reset(key)
    start_session(u)
    return jsonify(user=user_view(u))


@app.post("/api/auth/logout")
def logout():
    db.end_session(session.get("sid"))
    session.clear()
    return jsonify(ok=True)


# ---- profile -------------------------------------------------------------------------

@app.patch("/api/me")
def update_me():
    body = request.get_json(silent=True) or {}
    name = str(body.get("display_name", "")).strip()[:60]
    if not name:
        return jsonify(error="Add a name."), 400
    db.update_user(me(), display_name=name)
    return jsonify(user=user_view(db.get_user(me())))


@app.post("/api/me/password")
def change_password():
    body = request.get_json(silent=True) or {}
    key = f"{g.user['username'].lower()}|{request.remote_addr}"
    wait = security.login_user.blocked(key)
    if wait:
        return jsonify(error=f"Too many wrong attempts. Try again in {security.wait_text(wait)}."), 429
    if not check_password_hash(g.user["password_hash"], str(body.get("current", ""))[:200]):
        security.login_user.hit(key)
        return jsonify(error="Your current password isn't right."), 400
    new = str(body.get("new", ""))
    problem = password_problem(new, g.user["username"])
    if problem:
        return jsonify(error=problem), 400
    db.set_password(me(), generate_password_hash(new))  # ends every login...
    start_session(db.get_user(me()))                    # ...then signs this device back in
    return jsonify(ok=True)


@app.post("/api/me/logout-everywhere")
def logout_everywhere():
    db.end_sessions(me(), keep=session.get("sid"))
    return jsonify(ok=True)


@app.post("/api/me/delete")
def delete_me():
    body = request.get_json(silent=True) or {}
    if not check_password_hash(g.user["password_hash"], str(body.get("password", ""))[:200]):
        return jsonify(error="That password isn't right."), 400
    db.delete_user(me())
    session.clear()
    return jsonify(ok=True)


@app.get("/api/me/export")
def export_me():
    import json
    data = {"profile": user_view(g.user), **db.export(me())}
    return Response(json.dumps(data, indent=2), mimetype="application/json",
                    headers={"Content-Disposition": "attachment; filename=daily-to-do-export.json"})


# ---- days & tasks --------------------------------------------------------------------

def valid_day(s):
    try:
        return date.fromisoformat(str(s)).isoformat() == str(s)
    except ValueError:
        return False


TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def clean_task(body, partial=False):
    """Validate task fields from the page. Returns (fields, error)."""
    f = {}
    if "title" in body or not partial:
        title = str(body.get("title", "")).strip()[:200]
        if not title:
            return None, "Give the task a name."
        f["title"] = title
    if "notes" in body:
        f["notes"] = str(body.get("notes") or "")[:2000]
    if "time" in body:
        t = str(body.get("time") or "")
        if t and not TIME.match(t):
            return None, "That time doesn't look right."
        f["time"] = t
    for k in ("starred", "done"):
        if k in body:
            f[k] = bool(body[k])
    if "day" in body:
        if not valid_day(body["day"]):
            return None, "That date doesn't look right."
        f["day"] = body["day"]
    if "position" in body:
        try:
            f["position"] = float(body["position"])
        except (TypeError, ValueError):
            pass
    return f, None


@app.get("/api/day/<day>")
def get_day(day):
    if not valid_day(day):
        return jsonify(error="That date doesn't look right."), 400
    wd = date.fromisoformat(day).weekday()  # Monday = 0
    applied = db.applied_for_day(me(), day)
    used = {a["template_id"] for a in applied}
    todays = [t for t in db.templates(me()) if wd in t["days"]]
    # Templates for the same day are alternatives (a Toronto or a Barrie Saturday): once one is added, stop offering
    # the rest. Any template can still be added from the day's menu.
    suggest = [] if any(t["id"] in used for t in todays) else [
        {"id": t["id"], "name": t["name"], "emoji": t["emoji"], "color": t["color"], "count": len(t["items"])} for t in todays]
    today = request.args.get("today")
    late = db.overdue(me(), day) if today == day else []
    return jsonify(day=day, tasks=db.tasks_for_day(me(), day), applied=applied, suggest=suggest, overdue=late)


@app.post("/api/tasks")
def create_task():
    body = request.get_json(silent=True) or {}
    f, err = clean_task(body)
    if err or "day" not in f:
        return jsonify(error=err or "Pick a day."), 400
    tid = db.add_task(me(), f["day"], f["title"], f.get("notes", ""), f.get("time", ""), f.get("starred", False),
                      f.get("done", False), position=f.get("position"))
    return jsonify(task=db.get_task(me(), tid))


@app.patch("/api/tasks/<int:tid>")
def edit_task(tid):
    if not db.get_task(me(), tid):
        return jsonify(error="That task is gone."), 404
    f, err = clean_task(request.get_json(silent=True) or {}, partial=True)
    if err:
        return jsonify(error=err), 400
    db.update_task(me(), tid, f)
    return jsonify(task=db.get_task(me(), tid))


@app.delete("/api/tasks/<int:tid>")
def remove_task(tid):
    t = db.get_task(me(), tid)
    if not t:
        return jsonify(error="That task is gone."), 404
    db.delete_task(me(), tid)
    return jsonify(ok=True, task=t)  # the page keeps it for Undo


def id_list(v):
    return [int(x) for x in (v or []) if isinstance(x, int) or (isinstance(x, str) and x.isdigit())][:500]


@app.post("/api/tasks/reorder")
def reorder_tasks():
    db.reorder(me(), id_list((request.get_json(silent=True) or {}).get("ids")))
    return jsonify(ok=True)


@app.post("/api/tasks/move")
def move_tasks():
    body = request.get_json(silent=True) or {}
    if not valid_day(body.get("day")):
        return jsonify(error="That date doesn't look right."), 400
    db.move_tasks(me(), id_list(body.get("ids")), body["day"])
    return jsonify(ok=True)


@app.post("/api/day/<day>/clear-done")
def clear_done(day):
    if not valid_day(day):
        return jsonify(error="That date doesn't look right."), 400
    db.clear_done(me(), day)
    return jsonify(ok=True)


# ---- templates -----------------------------------------------------------------------

COLORS = {"blue", "green", "orange", "red", "purple", "pink", "teal", "indigo", "yellow", "gray"}


def clean_template(body):
    name = str(body.get("name", "")).strip()[:60]
    if not name:
        return None, "Give the template a name."
    emoji = str(body.get("emoji") or "")[:8]
    color = body.get("color") if body.get("color") in COLORS else "blue"
    days = [int(d) for d in (body.get("days") or []) if isinstance(d, int) and 0 <= d <= 6]
    items = []
    for it in (body.get("items") or [])[:200]:
        if not isinstance(it, dict):
            continue
        f, err = clean_task({k: it.get(k) for k in ("title", "time", "notes") if k in it})
        if err:
            if not str(it.get("title", "")).strip():
                continue  # blank rows are just dropped
            return None, err
        items.append(f)
    return {"name": name, "emoji": emoji, "color": color, "days": days, "items": items}, None


@app.get("/api/templates")
def list_templates():
    return jsonify(templates=db.templates(me()))


@app.post("/api/templates")
def create_template():
    t, err = clean_template(request.get_json(silent=True) or {})
    if err:
        return jsonify(error=err), 400
    tid = db.save_template(me(), None, **t)
    return jsonify(template=db.get_template(me(), tid))


@app.put("/api/templates/<int:tid>")
def save_template(tid):
    t, err = clean_template(request.get_json(silent=True) or {})
    if err:
        return jsonify(error=err), 400
    if db.save_template(me(), tid, **t) is None:
        return jsonify(error="That template is gone."), 404
    return jsonify(template=db.get_template(me(), tid))


@app.delete("/api/templates/<int:tid>")
def remove_template(tid):
    db.delete_template(me(), tid)
    return jsonify(ok=True)


@app.post("/api/templates/<int:tid>/apply")
def apply_template(tid):
    day = (request.get_json(silent=True) or {}).get("day")
    if not valid_day(day):
        return jsonify(error="That date doesn't look right."), 400
    aid, added = db.apply_template(me(), tid, day)
    if aid is None:
        return jsonify(error="That template is gone."), 404
    return jsonify(applied_id=aid, added=added)


@app.delete("/api/applied/<int:aid>")
def unapply(aid):
    db.unapply(me(), aid)
    return jsonify(ok=True)


@app.post("/api/day/<day>/save-template")
def day_to_template(day):
    """Turn a day's list into a new template."""
    if not valid_day(day):
        return jsonify(error="That date doesn't look right."), 400
    body = request.get_json(silent=True) or {}
    items = [{"title": t["title"], "time": t["time"], "notes": t["notes"]} for t in db.tasks_for_day(me(), day)]
    t, err = clean_template({"name": body.get("name"), "emoji": body.get("emoji"), "color": body.get("color"),
                             "days": body.get("days") or [date.fromisoformat(day).weekday()], "items": items})
    if err:
        return jsonify(error=err), 400
    tid = db.save_template(me(), None, **t)
    return jsonify(template=db.get_template(me(), tid))


def add_starter_templates(uid):
    """Two example Saturday templates so the idea is clear on first open. Edit or delete freely."""
    db.save_template(uid, None, "Saturday in Toronto", "🏙️", "blue", [5], [
        {"title": "Squash", "time": "10:00"}, {"title": "Groceries"}, {"title": "Laundry"}, {"title": "Clean room"}])
    db.save_template(uid, None, "Saturday in Barrie", "🌲", "green", [5], [
        {"title": "Raking garden"}, {"title": "Drying"}, {"title": "Lunch"}, {"title": "Dinner"}])


# ---- the page --------------------------------------------------------------------------

@app.get("/")
def index():
    resp = send_from_directory(STATIC, "index.html")
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.get("/<path:name>")
def static_file(name):
    resp = send_from_directory(STATIC, name)
    resp.headers["Cache-Control"] = "no-cache"  # always check for a newer version (cheap: 304 when unchanged)
    return resp


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8060))
    host = os.environ.get("HOST", "127.0.0.1")
    print(f"Daily To Do running at http://127.0.0.1:{port}  (Ctrl+C to stop)")
    if os.environ.get("PUBLIC_URL"):
        print(f"  Phone address: {os.environ['PUBLIC_URL']}")
    if os.environ.get("KEEP_AWAKE") == "1" and os.name == "nt":
        import ctypes
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001)  # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
        print("  Keeping this computer awake while the app runs (close this window to allow sleep).")
    try:
        from waitress import serve
        serve(app, host=host, port=port, threads=8, ident=None)
    except ImportError:
        app.run(host=host, port=port, debug=False, use_reloader=False)
