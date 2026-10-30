# Joshua Lovett's personal site

Two static sites in one repository, no build step. Each folder is its own Cloudflare Worker.

- `public/` is the open site (About, Projects). Content lives in `data/public.json`.
- `private/` is the owner-only site, protected by Cloudflare Access on its own workers.dev address. Lists live in `private/data/*.json`, each as `{ "items": [...] }`.

Item shapes:

- todo: `{ id, title, date: "YYYY-MM-DD", start: "HH:MM", end: "HH:MM", tag, done, doneAt }`
- goal: `{ id, title, why, area, target, progress: 0-100, steps: [{ t, done }] }`
- dreamboard: `{ id, title, note, area, img: "/img/file.jpg" }`
- done: `{ id, title, date, note, area }`
- connection: `{ id, name, url, note }`

Never put private information inside `public/`.
