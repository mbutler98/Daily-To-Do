# Daily To Do

Day plans, shopping lists, any other list, and reusable templates, with an iPhone-style design built from macOS wallpaper cards. It's a plain web page hosted on GitHub Pages: open the link on your phone or laptop, no server to run.

**Open it:** https://mbutler98.github.io/Daily-To-Do/

On iPhone, open it in Safari, tap **Share → Add to Home Screen**. It then opens full screen like an app and works offline.

## What it does

- **Lists home:** a greeting, a big **Today** card (its picture follows the time of day: Tahoe at dawn, day, dusk and night), **Starred** and **Planned** tiles, your lists as picture cards with progress bars, and your templates.
- **Today / any day:** each day has its own plan. Use ‹ › on the picture (or swipe it), or tap the day name to pick a date.
  - Unfinished tasks from earlier days show under **From earlier**, with **Move to today**.
  - List items due that day show under **Due from your lists**.
- **Any kind of list:** pick a name, emoji and picture, and choose the kind:
  - **To-dos:** stars, notes, optional due dates and times.
  - **Shopping:** type `2 milk` or `milk x2` for a quantity. Items sort themselves by aisle (Produce, Dairy & Eggs, Meat & Fish…). Ticked items go to **In the cart**, and **Put Everything Back on the List** makes the list reusable next week. Adding something already on the list brings it back instead of duplicating it.
- **Tasks and items:**
  - Tap the circle to tick it off. Tap the row to edit everything, including moving it to another list or day.
  - Swipe left to delete (with Undo). Swipe right to move a day task to the next day, or to make a list item due today.
  - **Edit** lets you drag rows into your own order.
  - **Share as Text** sends a list to Messages or WhatsApp.
- **Templates:**
  - A **day template** (*Saturday in Toronto*, *Saturday in Barrie*) is offered on the weekdays you pick. Today asks **"It's Saturday. Which plan?"** and you tap the one that fits. Nothing is added until you choose, and once one is added the other stops being offered.
  - A **list template** (*Weekly staples*) fills a list, such as Groceries, in one tap.
  - **⋯ → Save as Template** turns any day or list into a template.
- **Profile:** your name, light/dark/automatic, Today's picture, backups, and more than one profile on the same device.

## Where your lists are saved

Everything is saved in the browser on each device (localStorage); nothing is sent to a server. That means:

- Your phone and laptop each keep their own copy. To move lists across, use **Profile → Download Backup** on one device and **Restore From Backup** on the other.
- On iPhone, add the app to the Home Screen. Safari can clear storage for websites you haven't visited in a while, but not for Home Screen apps.
- Download a backup now and then.

## Files

- `index.html`, `app.css`, `app.js`: the whole app (no build step)
- `sw.js`: lets it work offline once opened
- `img/`: macOS wallpapers, resized (1600px for headers, 480px `-sm` for cards)
- `icons/`, `manifest.webmanifest`: the home-screen icon and app details
- `tools/make_icons.py`: redraws the icons

To try changes locally: `python -m http.server` in this folder, then open http://localhost:8000.
