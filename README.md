# Joshua Lovett's personal site

Static site, no build step. Deployed by Cloudflare Pages from the repository root.

- `/` public pages: About and Projects, content in `data/public.json`
- `/private/` owner-only pages, protected by Cloudflare Access (must be set up before use)
- `private/data/*.json` the private lists: `todos`, `goals`, `dreamboard`, `done`, `connections`. Each file is `{ "items": [...] }`.

Item shapes:

- todo: `{ id, title, date: "YYYY-MM-DD", start: "HH:MM", end: "HH:MM", tag, done, doneAt }`
- goal: `{ id, title, why, area, target, progress: 0-100, steps: [{ t, done }] }`
- dreamboard: `{ id, title, note, area, img: "/private/img/file.jpg" }`
- done: `{ id, title, date, note, area }`
- connection: `{ id, name, url, note }`

Do not put private information anywhere outside `private/`.
