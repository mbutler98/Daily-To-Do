# Daily To Do

My Day, habits you keep, lists for anything, templates for your routines, and rules that reset lists for you. iPhone-style design with macOS wallpaper themes. It's a plain web page hosted on GitHub Pages: no server to run.

**Open it:** https://mbutler98.github.io/Daily-To-Do/

On iPhone, open it in Safari, tap **Share → Add to Home Screen**. It opens full screen like an app and works offline.

## Connected to your vault (optional)

Daily To Do can sync with Michael's Obsidian vault through a small private API on the Mac mini (`~/Code/butler-tasks/server.py`), reachable only over Tailscale. The vault is the same list Ceres, Hermes, Paperclip and Claude write to, so it all stays in step.

- **Connect once per device:** run `~/Code/butler-tasks/setup.sh` on the Mac; it copies a connect link. Open it on the phone (or paste it in **Profile → Your Mac → Connect**). The link's key stays in the address fragment, so it never reaches GitHub.
- **What syncs:** dated to-dos on **My Day**, undated ones in **Inbox**, things you're waiting on in **Waiting On**, every habit and ring tap, and vault calendar events (shown on My Day, read-only here). Anything you add to My Day, Inbox or Waiting On goes to the vault.
- **Offline:** changes wait in an outbox (kept across restarts) and go when the Mac is reachable. A small pill on My Day shows how many are waiting.
- **Deleting** a synced to-do cancels it in the vault (the note is kept, never deleted).
- **Disconnect** from Profile; your lists stay on the device.
- Code: `butler.js` (loaded after `app.js`; it wraps `save` and `render` and doesn't change the app's own logic).

## Tabs

- **My Day:** today's plan, under a picture that follows the time of day.
  - ‹ › (or swipe the picture) moves between days. Tap the day name to pick a date.
  - **Earlier** shows unfinished tasks from past days, with **Move to Today**.
  - **Due from your lists** shows list items due that day.
  - On days with templates, it asks “It's Saturday. Which plan?”
  - The 🔥 pill is your streak: the number of days in a row you finished something.
  - **⋯** opens **Suggestions** (overdue, due-soon and starred items from your lists, added with one tap), **Pick One for Me**, templates, Move Unfinished to Tomorrow, Change Theme and Print.
- **Habits:** gym, reading, coding, meals, chores, anything you repeat (see below).
- **Lists:**
  - Smart lists: **My Day**, **Starred**, **Planned** and **All**.
  - Your lists show as picture cards or compact rows (the button at the top right switches).
- **Templates:** reusable lists.
  - A My Day template is offered on the weekdays you pick, like a Toronto Saturday and a Barrie Saturday.
  - A list template fills a list in one tap, or starts a new list from it.
- **Search:** every task, note, list and template.

Tap your name on the Lists tab for **Profile**: a weekly chart of what you finished, your streaks, light/dark mode, the My Day theme, backups and more than one profile on the same device.

## Habits

Each habit is a ring. Tap it when you've done it; your habits for the day also sit under the picture on **My Day**.

- **Three kinds of goal:** done or not (Gym, Chores), a count (Eat 3 meals, 8 glasses of water: each tap adds one) or an amount with a unit (Read 20 pages, Code 30 min: tap for +5, +10 or the full goal).
- **How often:** every day, on chosen days (Code on weekdays), or a number of times a week on any days (Gym 4× a week).
- **Time of day:** Morning, Afternoon, Evening or Any Time groups the Habits tab.
- **This week:** tap a day under a habit to fill it in later.
- **Press and hold a ring** for details: current and best streak, a strength score, a 20-week grid, editing any past day, skipping a day, archiving.
- **Skips** are rest days: they don't break a streak. **Strength** rises with each check-in and eases down after a miss, so one off day doesn't erase your progress.
- Finishing every habit for the day sets off confetti.

## Lists for anything

Every list is the same kind of list. You choose the extras in **Edit List** or the **⋯** menu:

- **Look:** a colour, an icon (36 glyphs) and a theme picture.
- **Quantities:** type `2 eggs` or `eggs x2`. Adding something already on the list brings it back instead of duplicating it.
- **Group by:** none, sections (aisles, rooms, people, anything) or due date.
- **Sort:** manual (drag in **Edit**), importance, due date, alphabetically or creation date.
- **Show or hide completed items.**
- **Other actions:** Duplicate, Uncheck All, Save as Template, Send a Copy (share sheet), Print and Delete.

## Rules

**⋯ → Rules** on any list. Pick **when** (daily; weekly on chosen days; or monthly on a date) and **what happens**:

- **Start fresh:** uncheck everything, e.g. “every Saturday, reset Groceries”.
- **Remove completed:** delete ticked-off items.
- **Add from a template:** e.g. “every Friday, add Weekly staples”.
- **Send to My Day:** add the list's unfinished items to My Day.

Rules run the first time you open the app on that day. **Run Now** tries one straight away. A list with a rule shows it on its picture.

## Adding tasks

Type naturally:

| Type | What happens |
| --- | --- |
| `Gym tomorrow 7am` | due tomorrow at 7:00 AM |
| `Call mom friday 5pm !` | Friday at 5:00 PM, starred |
| `Water plants every day` | repeats daily |
| `Bins every monday` | repeats weekly, starting Monday |
| `Read tonight` | today at 7:00 PM |

What it understood shows as chips under the text box. Tap a chip to keep that part as plain text. The buttons under the text box set My Day, the due date, the time, the repeat and the star by hand.

**Repeating tasks:** ticking one off creates the next one.

**Gestures:**

- Swipe left on a task to delete it, with Undo.
- Swipe right to move a My Day task to tomorrow, or to add a list item to My Day.
- Tap a task for its details: My Day, due date, time, repeat, quantity, section, list, note, duplicate and delete.
- Finishing the last task in a list sets off confetti.

## Where your lists are saved

Everything is saved in the browser on each device; nothing is sent to a server.

- Your phone and laptop each keep their own copy. To move lists across, use **Profile → Download Backup** on one and **Restore From Backup** on the other.
- On iPhone, use the Home Screen app: Safari can clear storage for websites you haven't visited in a while, but not for Home Screen apps.
- Data from the earlier version is upgraded automatically.

## Files

- `index.html`, `app.css`, `app.js`: the whole app (no build step)
- `sw.js`: offline support
- `img/`: macOS wallpapers, resized (1600px for headers, 480px `-sm` for cards)
- `icons/`, `manifest.webmanifest`: Home Screen icon and app details
- `tools/make_icons.py`: redraws the icons

To try changes locally, run `python -m http.server` in this folder, then open http://localhost:8000.
