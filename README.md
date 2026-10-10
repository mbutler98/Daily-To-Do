# Daily To Do

Day-by-day to-do lists with reusable templates, in a simple iPhone-style design. It runs on your laptop and works on your phone as a home-screen app. Built the same way as Claude Alerts: Flask + SQLite, username/password profiles, shared to your phone over Tailscale.

## What it does

- **Days:** each day has its own list. Use ‹ › (or swipe the big day name) to move between days, or tap the day name to pick a date. **Today** jumps back.
- **Tasks:** tap **Add a Task** to add several in a row (Enter adds and keeps the keyboard up), with an optional time and star. Tap a task to edit its name, notes, date, time or star.
  - Tap the circle to tick it off. Done tasks go to **Completed** (collapsible).
  - Swipe **left** to delete (with Undo). Swipe **right** to move it to the next day.
  - **Edit** lets you drag tasks into your own order or delete them.
  - Starred tasks stay at the top.
- **From earlier:** unfinished tasks from past days show on today, with **Move to today**.
- **Templates:** reusable lists, e.g. *Saturday in Toronto* and *Saturday in Barrie*. Pick the days a template is for. On those days your list asks **"It's Saturday. Which plan?"** and you tap the one that fits. Nothing is added until you choose. Once one is added, the other stops being offered (the ✕ on its chip removes it again).
  - Any template can be added to any day from the **⋯** menu, or from the template itself (**Add to Today** / **Add to Another Day**).
  - **⋯ → Save Day as Template** turns a day you've planned into a template.
- **⋯ menu on a day:** add from a template, save the day as a template, move unfinished tasks to the next day, clear completed.
- **Profile:** change your name or password, log out other devices, download all your data (JSON), log out, delete your profile.

## Quick start (Windows)

1. Double-click `start.bat`. It installs the requirements, starts the app and opens http://127.0.0.1:8060.
2. Create a profile. **Start with example templates** adds a Toronto and a Barrie Saturday you can edit or delete.

The app runs only while the window is open. Your data is in `data/todo.db` (not uploaded to GitHub).

## On your iPhone (over Tailscale, like Claude Alerts)

1. Tailscale is already set up for Claude Alerts, so nothing new to install.
2. Double-click `start-beta.bat`. It shares the app with your tailnet only, at `https://your-laptop.tailXXXX.ts.net:8443` (port 8443 so it runs next to Claude Alerts), and keeps the laptop awake.
3. On the iPhone, with Tailscale connected, open that address in Safari, then **Share → Add to Home Screen**.

- **Not on the public internet:** the app only listens on the laptop; Tailscale Serve is the only way in.
- **Stop sharing:** `tailscale serve --https=8443 off`.
- **Only you:** set `ALLOW_SIGNUPS=0` in `.env` after making your profile, so nobody else on your tailnet can make one.

## Security (same approach as Claude Alerts)

- Passwords are hashed (Werkzeug). The login cookie holds a random token; only its hash is stored, so a copied database can't log anyone in.
- Wrong passwords are rate limited (5 per username per 15 min, 20 per address), new profiles to 3 per address per hour.
- Changing your password logs out every other device. Logins last 60 days.
- Changes must come from the app's own page (custom header + same-origin check), and a strict Content Security Policy is sent.
- Every task and template query is scoped to the logged-in profile.

## Files

- `run.py`: the web server and API
- `todo/db.py`: SQLite storage; `todo/security.py`: rate limits and headers
- `static/`: the page (`index.html`, `app.css`, `app.js`), icons and web-app manifest
- `tools/tailnet_url.py`: finds your Tailscale address; `tools/make_icons.py`: redraws the icons
