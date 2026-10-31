/* Shared helpers for the public and private pages. */
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, v);
  }
  const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else e.append(c.nodeType ? c : document.createTextNode(String(c))); };
  kids.forEach(add);
  return e;
}
const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtDay = (s) => parseDay(s).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (t) => { if (!t) return ""; const [hh, mm] = t.split(":").map(Number); return ((hh % 12) || 12) + ":" + pad(mm) + (hh < 12 ? " am" : " pm"); };
const pageHead = (eyebrow, title, lede) => h("div", { class: "head" }, h("div", {}, h("p", { class: "eyebrow" }, eyebrow), h("h1", { class: "page" }, title), lede ? h("p", { class: "lede" }, lede) : null));
const empty = (title, text) => h("div", { class: "empty" }, h("h3", {}, title), h("p", {}, text));
async function load(path) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
function shell(brandHref) {
  document.body.append(
    h("div", { class: "shell" },
      h("aside", { class: "rail" },
        h("a", { class: "brand", href: brandHref, "aria-label": "Home" }, h("i"), "J. Lovett"),
        h("nav", { class: "nav", id: "nav", "aria-label": "Sections" })),
      h("main", { id: "main", tabindex: "-1" })));
}
function renderNav(groups, cur) {
  document.getElementById("nav").replaceChildren(...groups.map((g) =>
    h("div", { class: "nav-group" }, h("div", { class: "nav-label" }, g.label),
      g.links.map((l) => h("a", { href: l.href, class: l.out ? "out" : "", "aria-current": l.id === cur ? "page" : null }, l.label)))));
}
